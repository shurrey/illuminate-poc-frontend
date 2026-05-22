"use client";

import { useState, useCallback, useRef } from "react";
import { agentClient } from "@/services/agentClient";
import type { ThinkingStep, AgentResponse, QueryParameter } from "@/types/chat";

interface UseQueryGenerationReturn {
  generatedSql: string | null;
  generatedParameters: QueryParameter[];
  description: string | null;
  isGenerating: boolean;
  error: string | null;
  statusMessage: string | null;
  thinkingSteps: ThinkingStep[];
  contextId: string | null;
  generateSql: (prompt: string) => Promise<void>;
  refineSql: (instruction: string) => Promise<void>;
  cancelGeneration: () => void;
  reset: () => void;
}

export function useQueryGeneration(): UseQueryGenerationReturn {
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [generatedParameters, setGeneratedParameters] = useState<QueryParameter[]>([]);
  const [description, setDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [contextId, setContextId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const thinkingRef = useRef<ThinkingStep[]>([]);

  const cancelGeneration = useCallback(() => {
    if (requestIdRef.current) agentClient.cancelRequest(requestIdRef.current);
    if (abortRef.current) abortRef.current.abort();
    setIsGenerating(false);
    setStatusMessage(null);
  }, []);

  const reset = useCallback(() => {
    setGeneratedSql(null);
    setGeneratedParameters([]);
    setDescription(null);
    setError(null);
    setStatusMessage(null);
    setThinkingSteps([]);
    setContextId(null);
    thinkingRef.current = [];
  }, []);

  const run = useCallback(async (prompt: string, existingContextId?: string) => {
    if (isGenerating) return;

    abortRef.current = new AbortController();
    const reqId = crypto.randomUUID();
    requestIdRef.current = reqId;

    setIsGenerating(true);
    setError(null);
    setStatusMessage("Sending...");
    setThinkingSteps([]);
    thinkingRef.current = [];

    const currentThinkingIndex: Record<string, number> = {};
    const accumulatedThinking: Record<string, string> = {};

    try {
      for await (const event of agentClient.sendMessageStreaming(
        prompt,
        existingContextId || contextId || undefined,
        abortRef.current.signal,
        reqId
      )) {
        switch (event.type) {
          case "status":
            setStatusMessage(event.message || "Processing...");
            break;

          case "thinking": {
            const agent = event.agent || "unknown";
            accumulatedThinking[agent] = event.accumulated || (accumulatedThinking[agent] || "") + (event.content || "");
            setStatusMessage(`${agent.replace("_", " ")} is thinking...`);
            setThinkingSteps((prev) => {
              const step: ThinkingStep = { type: "thinking", agent, content: accumulatedThinking[agent], timestamp: new Date().toISOString() };
              if (currentThinkingIndex[agent] !== undefined) {
                const updated = [...prev]; updated[currentThinkingIndex[agent]] = step;
                thinkingRef.current = updated; return updated;
              }
              currentThinkingIndex[agent] = prev.length;
              const updated = [...prev, step];
              thinkingRef.current = updated; return updated;
            });
            break;
          }

          case "tool_call": {
            const agent = event.agent || "unknown";
            delete currentThinkingIndex[agent];
            accumulatedThinking[agent] = "";
            setStatusMessage(`Using tool: ${event.tool || "unknown"}`);
            setThinkingSteps((prev) => {
              const updated = [...prev, { type: "tool_call" as const, agent, tool: event.tool || "unknown", tool_id: event.tool_id || 0, timestamp: new Date().toISOString() }];
              thinkingRef.current = updated; return updated;
            });
            break;
          }

          case "routing":
            setStatusMessage(`Routing to ${(event.agent || "").replace("_", " ")} agent...`);
            break;

          case "error":
            setError(event.message || "An error occurred");
            break;

          case "complete": {
            const data = (event.data || {}) as AgentResponse;
            const newCtx = data.context_id || data.contextId;
            if (newCtx) setContextId(newCtx);

            // Extract SQL and parameters from artifacts
            const sqlArtifact = data.artifacts?.find((a) => a.type === "sql");
            if (sqlArtifact) {
              setGeneratedSql(sqlArtifact.data as string);
              setGeneratedParameters(sqlArtifact.parameters || []);
            }

            // Also try to find SQL in the text response (agent often includes it in markdown code blocks)
            if (!sqlArtifact && data.text) {
              const sqlMatch = data.text.match(/```sql\n([\s\S]*?)```/);
              if (sqlMatch) setGeneratedSql(sqlMatch[1].trim());
            }

            setDescription(data.text || null);
            break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
      abortRef.current = null;
      requestIdRef.current = null;
    }
  }, [isGenerating, contextId]);

  const generateSql = useCallback(async (prompt: string) => {
    setContextId(null);
    await run(`Generate a Snowflake SQL query for this question. Return the SQL as a sql artifact. Question: ${prompt}`);
  }, [run]);

  const refineSql = useCallback(async (instruction: string) => {
    await run(`The user wants to modify the previous query. Current SQL:\n\`\`\`sql\n${generatedSql}\n\`\`\`\n\nModification requested: ${instruction}\n\nReturn the updated SQL as a sql artifact.`);
  }, [run, generatedSql]);

  return {
    generatedSql, generatedParameters, description, isGenerating, error, statusMessage, thinkingSteps,
    contextId, generateSql, refineSql, cancelGeneration, reset,
  };
}
