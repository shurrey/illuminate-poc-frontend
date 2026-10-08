"use client";

import { useCallback, useRef, useState } from "react";
import { agentClient } from "@/services/agentClient";
import type { AgentResponse, Artifact, TableData } from "@/types/chat";
import type { Provenance, QueryContract } from "@/types/semantic";

export interface GeneratedQuery {
  /** The governed contract; null when the agent fell back to freehand SQL or ran nothing. */
  contract: QueryContract | null;
  sql: string | null;
  provenance: Provenance | null;
  title: string | null;
  table: TableData | null;
}

const EMPTY: GeneratedQuery = { contract: null, sql: null, provenance: null, title: null, table: null };

/** The last query the agent ran, taken from its table artifact. */
export function queryFromArtifacts(artifacts: Artifact[] = []): GeneratedQuery {
  const table = [...artifacts].reverse().find((a) => a.type === "table");
  if (!table) return EMPTY;
  const governed = table.provenance?.governed === true;
  return {
    contract: governed ? table.query ?? null : null,
    sql: table.sql ?? null,
    provenance: table.provenance ?? null,
    title: table.title ?? null,
    table: table.data as TableData,
  };
}

/** Ask the chat agent for a query; follow-ups in the same conversation refine it. */
export function useSemanticGeneration() {
  const [result, setResult] = useState<GeneratedQuery>(EMPTY);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const contextRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    abortRef.current = new AbortController();
    setIsGenerating(true);
    setError(null);
    setStatus("Sending...");
    try {
      for await (const event of agentClient.sendMessageStreaming(text, contextRef.current ?? undefined, abortRef.current.signal)) {
        if (event.type === "status") setStatus(event.message || "Working...");
        else if (event.type === "error") setError(event.message || "The agent could not answer");
        else if (event.type === "complete") {
          const data = (event.data || {}) as AgentResponse;
          contextRef.current = data.contextId || data.context_id || contextRef.current;
          setResult(queryFromArtifacts(data.artifacts));
          setAnswer(data.text || null);
        }
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "The agent could not answer");
      }
    } finally {
      setIsGenerating(false);
      setStatus(null);
      abortRef.current = null;
    }
  }, []);

  const ask = useCallback((question: string) => {
    contextRef.current = null;
    return send(question);
  }, [send]);

  const refine = useCallback((instruction: string) => send(`Modify the previous query: ${instruction}`), [send]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    contextRef.current = null;
    setResult(EMPTY);
    setAnswer(null);
    setError(null);
  }, []);

  return { result, answer, isGenerating, error, status, ask, refine, cancel, reset };
}
