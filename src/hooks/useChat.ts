"use client";

import { useState, useCallback, useRef } from "react";
import { agentClient } from "@/services/agentClient";
import type { Message, ChatState, ThinkingStep, AgentResponse } from "@/types/chat";

interface UseChatReturn extends ChatState {
  sendMessage: (text: string) => Promise<void>;
  cancelQuery: () => Promise<void>;
  clearMessages: () => void;
  statusMessage: string | null;
  thinkingSteps: ThinkingStep[];
  isThinkingExpanded: boolean;
  toggleThinkingExpanded: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const thinkingStepsRef = useRef<ThinkingStep[]>([]);

  const toggleThinkingExpanded = useCallback(() => {
    setIsThinkingExpanded((prev) => !prev);
  }, []);

  const cancelQuery = useCallback(async () => {
    if (currentRequestIdRef.current) {
      await agentClient.cancelRequest(currentRequestIdRef.current);
      currentRequestIdRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStatusMessage(null);
    setThinkingSteps([]);
    thinkingStepsRef.current = [];
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === "assistant") {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          parts: [{ type: "text", content: "_Query cancelled by user._" }],
        };
        return updated;
      }
      return prev;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      abortControllerRef.current = new AbortController();
      const requestId = crypto.randomUUID();
      currentRequestIdRef.current = requestId;

      setError(null);
      setIsLoading(true);
      setStatusMessage("Sending...");
      setThinkingSteps([]);
      thinkingStepsRef.current = [];
      setIsThinkingExpanded(true);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", content: text }],
        artifacts: [],
        timestamp: new Date().toISOString(),
        contextId: contextId || undefined,
      };
      setMessages((prev) => [...prev, userMessage]);

      const placeholder: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", content: "" }],
        artifacts: [],
        timestamp: new Date().toISOString(),
        contextId: contextId || undefined,
      };
      setMessages((prev) => [...prev, placeholder]);

      const currentThinkingIndex: Record<string, number> = {};
      const accumulatedThinking: Record<string, string> = {};

      try {
        const signal = abortControllerRef.current?.signal;
        for await (const event of agentClient.sendMessageStreaming(
          text,
          contextId || undefined,
          signal,
          requestId
        )) {
          switch (event.type) {
            case "status":
              setStatusMessage(event.message || "Processing...");
              break;

            case "thinking": {
              const agent = event.agent || "unknown";
              if (event.accumulated) {
                accumulatedThinking[agent] = event.accumulated;
              } else {
                accumulatedThinking[agent] = (accumulatedThinking[agent] || "") + (event.content || event.message || "");
              }
              setStatusMessage(`${agent.replace("_", " ")} is thinking...`);
              setThinkingSteps((prev) => {
                const step: ThinkingStep = {
                  type: "thinking",
                  agent,
                  content: accumulatedThinking[agent],
                  timestamp: new Date().toISOString(),
                };
                let updated: ThinkingStep[];
                if (currentThinkingIndex[agent] !== undefined) {
                  updated = [...prev];
                  updated[currentThinkingIndex[agent]] = step;
                } else {
                  currentThinkingIndex[agent] = prev.length;
                  updated = [...prev, step];
                }
                thinkingStepsRef.current = updated;
                return updated;
              });
              break;
            }

            case "tool_call": {
              const agent = event.agent || "unknown";
              setStatusMessage(`Using tool: ${event.tool || "unknown"}`);
              delete currentThinkingIndex[agent];
              accumulatedThinking[agent] = "";
              setThinkingSteps((prev) => {
                const updated = [
                  ...prev,
                  {
                    type: "tool_call" as const,
                    agent,
                    tool: event.tool || "unknown",
                    tool_id: event.tool_id || 0,
                    timestamp: new Date().toISOString(),
                  },
                ];
                thinkingStepsRef.current = updated;
                return updated;
              });
              break;
            }

            case "routing":
              setStatusMessage(`Routing to ${(event.agent || "").replace("_", " ")} agent...`);
              break;

            case "error":
              setError(event.message || "An error occurred");
              setStatusMessage(null);
              break;

            case "cancelled":
              setStatusMessage(null);
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  parts: [{ type: "text", content: "_Query cancelled by user._" }],
                };
                return updated;
              });
              return;

            case "complete": {
              const data = (event.data || {}) as AgentResponse;
              const newCtx = data.context_id || data.contextId;
              if (newCtx && !contextId) setContextId(newCtx);
              const finalSteps = [...thinkingStepsRef.current];
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  parts: [{ type: "text", content: data.text || "" }],
                  artifacts: data.artifacts || [],
                  thinkingSteps: finalSteps.length > 0 ? finalSteps : undefined,
                };
                return updated;
              });
              setThinkingSteps([]);
              thinkingStepsRef.current = [];
              setIsThinkingExpanded(false);
              setStatusMessage(null);
              break;
            }

            default:
              if (event.message) setStatusMessage(event.message);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "An error occurred";
        setError(msg);
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            parts: [{ type: "text", content: `Sorry, I encountered an error: ${msg}` }],
            artifacts: [{ id: crypto.randomUUID(), type: "error", data: msg, title: "Error" }],
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
        abortControllerRef.current = null;
        currentRequestIdRef.current = null;
      }
    },
    [contextId, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setContextId(null);
    setThinkingSteps([]);
    thinkingStepsRef.current = [];
    setIsThinkingExpanded(true);
  }, []);

  return {
    messages,
    isLoading,
    error,
    contextId,
    sendMessage,
    cancelQuery,
    clearMessages,
    statusMessage,
    thinkingSteps,
    isThinkingExpanded,
    toggleThinkingExpanded,
  };
}
