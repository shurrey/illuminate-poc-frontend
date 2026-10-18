import type { QueryContract } from "./semantic";

/** The server's list-time guess at a saved query's label; a run's provenance is the real one. */
export type GovernanceHint = "governed" | "partial" | "ungoverned";

interface SavedQueryBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastUsedAt: string | null;
  governance_hint?: GovernanceHint;
}

export interface GovernedSavedQuery extends SavedQueryBase {
  /** Absent on queries created before SQL queries existed. */
  query_kind?: "governed";
  prompt: string;
  contract: QueryContract;
}

export interface SqlSavedQuery extends SavedQueryBase {
  query_kind: "sql";
  sql: string;
  /** Contracts keyed by the name the SQL reads them from; recompiled for whoever runs the query. */
  governed_parts: Record<string, QueryContract>;
  owner_name?: string;
}

export type SavedQuery = GovernedSavedQuery | SqlSavedQuery;

export const isSqlQuery = (q: SavedQuery): q is SqlSavedQuery => q.query_kind === "sql";
