"use client";

import { useState, useCallback } from "react";
import { executeQuery, type QueryResult } from "@/services/dashboardApi";

export function useQueryExecution() {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (sql: string) => {
    setIsExecuting(true);
    setError(null);
    setResults(null);
    try {
      const data = await executeQuery(sql);
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query execution failed");
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, isExecuting, error, runQuery, clearResults };
}
