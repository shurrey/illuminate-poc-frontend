"use client";

import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = authService.getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Types ──────────────────────────────────────────────

export interface Submodel {
  id: number;
  name: string;
  displayName: string;
  schemaId: string;
}

export interface ColumnDefinition {
  id: number;
  name: string;
  displayName: string;
  text: string;
  boundSchema: string;
  boundTable: string;
  boundColumn?: string;
  objectIdentifier: string;
  columnDataType?: string;
  columnIsIdentity: string;
  columnIsNullable: string;
  sourceType: string;
  isDeleted: boolean;
  isDeprecated: boolean;
  isVisible: boolean;
}

export interface ErdRelationship {
  foreignKey: { tableSchema: string; tableName: string; columns: { name: string }[] };
  uniqueKey: { tableSchema: string; tableName: string; columns: { name: string }[] };
}

export interface PreviewResponse {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

// ── Processed types for the UI ─────────────────────────

export interface SchemaInfo {
  displayName: string;
  tables: Record<string, TableInfo>;
}

export interface TableInfo {
  description: string;
  columns: Record<string, ColumnInfo>;
}

export interface ColumnInfo {
  description: string;
  dataType: string;
  nullable: boolean;
}

export interface Relationship {
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
}

// ── API calls ──────────────────────────────────────────

export async function fetchSubmodels(): Promise<Submodel[]> {
  const resp = await fetch(`${API_URL}/api/v1/dictionary/submodels`, { headers: getHeaders() });
  if (!resp.ok) throw new Error(`submodels: ${resp.status}`);
  return resp.json();
}

export async function fetchDefinitions(): Promise<ColumnDefinition[]> {
  const resp = await fetch(`${API_URL}/api/v1/dictionary/definitions`, { headers: getHeaders() });
  if (!resp.ok) throw new Error(`definitions: ${resp.status}`);
  return resp.json();
}

export async function fetchErd(): Promise<ErdRelationship[]> {
  const resp = await fetch(`${API_URL}/api/v1/dictionary/erd`, { headers: getHeaders() });
  if (!resp.ok) throw new Error(`erd: ${resp.status}`);
  const data = await resp.json();
  // Flatten: { schemas: ErdSchema[] } → ErdRelationship[]
  const schemas = data.schemas || (Array.isArray(data) ? data : Object.values(data));
  const rels: ErdRelationship[] = [];
  const arr = Array.isArray(schemas) ? schemas : Object.values(schemas);
  for (const schema of arr) {
    const fkArr = Array.isArray(schema) ? schema : (schema as { foreignKeys?: ErdRelationship[] }).foreignKeys || [];
    for (const item of fkArr) {
      if ((item as ErdRelationship).foreignKey) {
        rels.push(item as ErdRelationship);
      }
    }
  }
  return rels;
}

export async function fetchPreview(schema: string, table: string, limit = 20): Promise<PreviewResponse> {
  const resp = await fetch(
    `${API_URL}/api/v1/dictionary/preview?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!resp.ok) throw new Error(`preview: ${resp.status}`);
  return resp.json();
}

// ── Build catalog from API responses ───────────────────

export function buildCatalog(
  submodels: Submodel[],
  definitions: ColumnDefinition[]
): Record<string, SchemaInfo> {
  const catalog: Record<string, SchemaInfo> = {};

  // Initialize schemas from submodels
  for (const s of submodels) {
    catalog[s.schemaId] = { displayName: s.displayName, tables: {} };
  }

  // Populate from definitions
  for (const d of definitions) {
    if (!d.isVisible || d.isDeleted || !d.boundSchema || !d.boundTable) continue;

    if (!catalog[d.boundSchema]) {
      catalog[d.boundSchema] = { displayName: d.boundSchema, tables: {} };
    }

    if (!catalog[d.boundSchema].tables[d.boundTable]) {
      // Find table-level entry (no boundColumn) for description
      const tableEntry = definitions.find(
        (x) => x.boundSchema === d.boundSchema && x.boundTable === d.boundTable && !x.boundColumn && x.text
      );
      catalog[d.boundSchema].tables[d.boundTable] = {
        description: tableEntry?.text || "",
        columns: {},
      };
    }

    if (d.boundColumn) {
      catalog[d.boundSchema].tables[d.boundTable].columns[d.boundColumn] = {
        description: d.text || "",
        dataType: d.columnDataType || "",
        nullable: d.columnIsNullable === "YES",
      };
    }
  }

  return catalog;
}

export function buildRelationships(erdRels: ErdRelationship[]): Relationship[] {
  return erdRels.map((r) => ({
    sourceSchema: r.foreignKey.tableSchema,
    sourceTable: r.foreignKey.tableName,
    sourceColumn: r.foreignKey.columns?.[0]?.name || "",
    targetSchema: r.uniqueKey.tableSchema,
    targetTable: r.uniqueKey.tableName,
    targetColumn: r.uniqueKey.columns?.[0]?.name || "",
  }));
}
