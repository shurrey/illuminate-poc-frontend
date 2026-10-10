/** Mirrors semantic_layer/reports.py and the /api/v1/reports endpoints. */
import type { FilterValue, Provenance, QueryContract } from "./semantic";

export type ReportArea = "learning" | "teaching" | "leading";

export interface ReportSummary { id: string; title: string; area: ReportArea; description: string }

export interface ReportFilterDef {
  id: string;
  label: string;
  control: "multi_select" | "select" | "date_range";
  dimension?: string | null;
  /** Ordered alternatives to `dimension`; a query applies the first it can reach. */
  dimensions?: { ref: string; op?: "in" | "contains" }[];
  /** Filters whose values narrow this filter's options. */
  depends_on?: string[];
  /** Option values the filter does not offer. */
  exclude_values?: string[];
  time_dimension?: string | null;
  default?: "current_term" | "last_30_days" | "previous_30_days" | FilterValue[] | null;
}

export type VisualType = "kpi" | "bar" | "line" | "combo" | "pie" | "table" | "pivot" | "heatmap" | "histogram" | "scatter" | "treemap" | "text";

export interface VisualDef {
  id: string;
  type: VisualType;
  title: string;
  text: string;
  queries: Record<string, QueryContract & { time_dimension?: string; date_filter?: string }>;
  transform?: { kind: string; [key: string]: unknown } | null;
  encode: Record<string, unknown>;
  filters_ignored: string[];
}

export interface ReportDef extends ReportSummary {
  filters: ReportFilterDef[];
  pages: { title: string; visuals: VisualDef[] }[];
}

export type DateRangeValue = { start?: string; end?: string };
/** Filter id -> selected values, or a date range. */
export type FilterValues = Record<string, FilterValue[] | DateRangeValue>;

export interface RunResult {
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
  sql: string;
  provenance: Provenance;
  contract: QueryContract;
  ignored_filters: string[];
}

export type RunResponse = RunResult | { unavailable: string };
