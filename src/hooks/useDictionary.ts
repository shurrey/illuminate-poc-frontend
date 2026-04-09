"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSubmodels,
  fetchDefinitions,
  fetchErd,
  fetchPreview,
  buildCatalog,
  buildRelationships,
  type SchemaInfo,
  type Relationship,
  type PreviewResponse,
} from "@/services/dictionaryApi";

interface DictionaryState {
  catalog: Record<string, SchemaInfo>;
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;
}

export function useDictionary() {
  const [state, setState] = useState<DictionaryState>({
    catalog: {},
    relationships: [],
    isLoading: true,
    error: null,
  });

  const [previews, setPreviews] = useState<Record<string, PreviewResponse>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef(false);

  // Load catalog + relationships on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      try {
        const [submodels, definitions, erdRels] = await Promise.all([
          fetchSubmodels(),
          fetchDefinitions(),
          fetchErd(),
        ]);

        const catalog = buildCatalog(submodels, definitions);
        const relationships = buildRelationships(erdRels);

        setState({ catalog, relationships, isLoading: false, error: null });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load dictionary",
        }));
      }
    }

    load();
  }, []);

  // Fetch preview for a specific table
  const loadPreview = useCallback(async (schema: string, table: string) => {
    const key = `${schema}.${table}`;
    if (previews[key] || previewLoading[key]) return;

    setPreviewLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const data = await fetchPreview(schema, table, 20);
      setPreviews((prev) => ({ ...prev, [key]: data }));
    } catch (err) {
      setPreviews((prev) => ({
        ...prev,
        [key]: { columns: [], rows: [], error: err instanceof Error ? err.message : "Failed" } as PreviewResponse & { error?: string },
      }));
    } finally {
      setPreviewLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, [previews, previewLoading]);

  const getPreview = useCallback(
    (schema: string, table: string) => previews[`${schema}.${table}`] || null,
    [previews]
  );

  const isPreviewLoading = useCallback(
    (schema: string, table: string) => previewLoading[`${schema}.${table}`] || false,
    [previewLoading]
  );

  // Helper functions
  const getSchemas = useCallback(() => Object.keys(state.catalog).sort(), [state.catalog]);

  const getSchema = useCallback((id: string) => state.catalog[id], [state.catalog]);

  const getRelationships = useCallback(
    (schema: string, table: string) =>
      state.relationships.filter(
        (r) =>
          (r.sourceSchema === schema && r.sourceTable === table) ||
          (r.targetSchema === schema && r.targetTable === table)
      ),
    [state.relationships]
  );

  const searchCatalog = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      if (q.length < 2) return [];
      const results: Array<{ type: "schema" | "table" | "column"; schema: string; table?: string; column?: string; match: string }> = [];

      for (const [schemaId, schema] of Object.entries(state.catalog)) {
        if (schemaId.toLowerCase().includes(q) || schema.displayName.toLowerCase().includes(q)) {
          results.push({ type: "schema", schema: schemaId, match: schema.displayName });
        }
        for (const [tableName, table] of Object.entries(schema.tables)) {
          if (tableName.toLowerCase().includes(q) || table.description.toLowerCase().includes(q)) {
            results.push({ type: "table", schema: schemaId, table: tableName, match: tableName });
          }
          for (const colName of Object.keys(table.columns)) {
            if (colName.toLowerCase().includes(q)) {
              results.push({ type: "column", schema: schemaId, table: tableName, column: colName, match: colName });
            }
          }
        }
      }
      return results.slice(0, 30);
    },
    [state.catalog]
  );

  return {
    ...state,
    getSchemas,
    getSchema,
    getRelationships,
    searchCatalog,
    loadPreview,
    getPreview,
    isPreviewLoading,
  };
}
