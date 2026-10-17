import type { ContractFilter, Governance, Provenance, QueryContract } from "@/types/semantic";

/** Anything unrecognised or contradictory counts as ungoverned; old artifacts without `governance` use the boolean. */
export function governanceOf(p: Provenance): Governance {
  if (p.governance === undefined) return p.governed === true ? "full" : "none";
  if (p.governance === "full") return p.governed !== false ? "full" : "none";
  return p.governance === "partial" ? "partial" : "none";
}

export interface ColumnMark {
  kind: "governed" | "ungoverned";
  tooltip: string;
}

/** The header marker for one result column, or null when the result carries no per-column provenance. */
export function columnMark(p: Provenance | undefined, column: string): ColumnMark | null {
  if (!p?.columns) return null;
  const wanted = column.toLowerCase();
  const key = column in p.columns ? column : Object.keys(p.columns).find((k) => k.toLowerCase() === wanted);
  if (key === undefined) return null;
  const c = p.columns[key];
  if (c.governed) return { kind: "governed", tooltip: c.definition ? `Governed: ${c.definition}` : "Governed" };
  return { kind: "ungoverned", tooltip: c.reason ? `Ungoverned: ${c.reason}` : "Ungoverned" };
}

export interface CardBlock {
  kind: "ungoverned" | "partial" | "no_contract";
  message: string;
}

/** Why a result cannot be saved, or null when it can. Only a query contract can be saved. */
export function cardBlockedReason(p: Provenance | undefined, query: QueryContract | undefined,
                                  noun: "card" | "query" = "card"): CardBlock | null {
  if (query || !p) return null;
  const what = noun === "card" ? "become a card" : "be saved as a query";
  const level = governanceOf(p);
  if (level === "partial") return { kind: "partial", message: `This result is only partly governed, so it can't ${what}.` };
  if (level === "full") {
    return { kind: "no_contract", message: `This result was written as SQL rather than a governed query, so it can't ${what}.` };
  }
  return { kind: "ungoverned", message: `No governed metric answers this, so it can't ${what}.` };
}

const OP_WORDS: Record<string, string> = {
  eq: "is", neq: "is not", in: "is one of", not_in: "is not one of", gt: "is more than", gte: "is at least",
  lt: "is less than", lte: "is at most", contains: "contains",
};

function filterText(f: ContractFilter): string {
  const v = (f.values ?? []).map(String);
  if (f.op === "between") return `${f.dimension} is between ${v[0]} and ${v[1]}`;
  if (f.op === "is_null") return `${f.dimension} is empty`;
  if (f.op === "not_null") return `${f.dimension} is not empty`;
  return `${f.dimension} ${OP_WORDS[f.op] ?? f.op} ${v.join(", ")}`;
}

/** One short line per populated part of a contract; needs no catalog. */
export function summarizeContract(c: QueryContract): string[] {
  const lines: string[] = [];
  if (c.metrics?.length) lines.push(`Metrics: ${c.metrics.join(", ")}`);
  if (c.measures?.length) lines.push(`Measures: ${c.measures.join(", ")}`);
  if (c.dimensions?.length) lines.push(`By: ${c.dimensions.join(", ")}`);
  if (c.filters?.length) lines.push(`Where: ${c.filters.map(filterText).join("; ")}`);
  if (c.time_range) {
    const { dimension, start, end } = c.time_range;
    lines.push(`Dates: ${[dimension, start && `from ${start}`, end && `to ${end}`].filter(Boolean).join(" ")}`);
  }
  if (c.order_by?.length) {
    lines.push(`Sorted by: ${c.order_by.map((o) => `${o.field}${o.direction ? ` ${o.direction}` : ""}`).join(", ")}`);
  }
  if (c.limit != null) lines.push(`Limit: ${c.limit}`);
  return lines;
}
