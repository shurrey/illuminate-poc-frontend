import type { Artifact } from "@/types/chat";
import type { QueryContract } from "@/types/semantic";
import type { GovernanceHint, SavedQuery } from "@/types/queryBuilder";
import { isSqlQuery } from "@/types/queryBuilder";

export type GovernedParts = Record<string, QueryContract>;

/** The POST/PUT /me/queries body; only the fields of the query's own kind are sent. */
export function queryRequestBody(q: SavedQuery) {
  const { name, description } = q;
  if (isSqlQuery(q)) return { name, description, query_kind: "sql" as const, sql: q.sql, governed_parts: q.governed_parts };
  return { name, description, query_kind: "governed" as const, prompt: q.prompt, contract: q.contract };
}

export interface SqlRunRequest { sql: string; governed?: GovernedParts; reason?: string }

export function sqlRunRequest(sql: string, parts: GovernedParts, reason?: string): SqlRunRequest {
  return {
    sql,
    ...(Object.keys(parts).length ? { governed: parts } : {}),
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}

const HINTS: GovernanceHint[] = ["governed", "partial", "ungoverned"];

/** An unrecognised server hint reads as ungoverned, so a label never claims more than it knows. */
export function hintOf(q: SavedQuery): GovernanceHint {
  if (q.governance_hint !== undefined) return HINTS.includes(q.governance_hint) ? q.governance_hint : "ungoverned";
  if (!isSqlQuery(q)) return "governed";
  return Object.keys(q.governed_parts ?? {}).length ? "partial" : "ungoverned";
}

const HINT_LABELS: Record<GovernanceHint, string> = {
  governed: "Governed", partial: "Partly governed", ungoverned: "Ungoverned",
};

export const hintLabel = (hint: GovernanceHint) => HINT_LABELS[hint];

/**
 * The saved query a chat table result would become, or null when nothing can be saved from it. A governed result
 * keeps its contract; an SQL result keeps the SQL it was written as, never the expanded `executed_sql`.
 */
export function savedQueryFromArtifact(a: Artifact, { id, now }: { id: string; now: string }): SavedQuery | null {
  if (a.type !== "table") return null;
  const common = { id, name: a.title?.trim() || "Query result", description: "", createdAt: now, lastUsedAt: null };
  if (a.query && a.kind !== "sql") return { ...common, query_kind: "governed", prompt: "", contract: a.query };
  if (!a.sql) return null;
  return { ...common, query_kind: "sql", sql: a.sql, governed_parts: a.governed_parts ?? {} };
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NOTHING = /^(none|nothing|n\/a)\b/i;

/** The items the import conversion listed under "Not mapped" (the mapping prompt asks for that heading). */
export function unmappedItems(answer: string): string[] {
  const lines = answer.split("\n");
  const start = lines.findIndex((l) => /not mapped/i.test(l));
  if (start < 0) return [];
  const items: string[] = [];
  const inline = lines[start].replace(/^.*not mapped/i, "").replace(/^[\s*_#:]+/, "").trim();
  if (inline) items.push(inline);
  for (const line of lines.slice(start + 1)) {
    const bullet = BULLET.exec(line);
    if (bullet) items.push(bullet[1].trim());
    else if (line.trim()) break;
  }
  return items.filter((i) => i && !NOTHING.test(i));
}

export const conversionFullyGoverned = (contract: QueryContract | null, answer: string) =>
  !!contract && unmappedItems(answer).length === 0;

/** The parts whose name the SQL reads, matched case-insensitively as a whole identifier. */
export function partsReferencedBy(sql: string, parts: GovernedParts | undefined): GovernedParts {
  const out: GovernedParts = {};
  for (const [name, part] of Object.entries(parts ?? {})) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<![\\w$])"?${escaped}"?(?![\\w$])`, "i").test(sql)) out[name] = part;
  }
  return out;
}
