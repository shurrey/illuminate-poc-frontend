/** Mirrors semantic_layer/contract.py and catalog_view.py in illuminate-conversational-intelligence. */

export type FilterOp =
  | "eq" | "neq" | "in" | "not_in" | "gt" | "gte" | "lt" | "lte"
  | "between" | "is_null" | "not_null" | "contains";

export type FilterValue = string | number | boolean;

export interface ContractFilter {
  dimension: string;
  op: FilterOp;
  values?: FilterValue[];
}

export interface QueryContract {
  metrics?: string[];
  measures?: string[];
  dimensions?: string[];
  filters?: ContractFilter[];
  time_range?: { dimension: string; start?: string; end?: string };
  order_by?: { field: string; direction?: "asc" | "desc" }[];
  limit?: number;
}

export interface Provenance {
  governed: boolean;
  datasets?: string[];
  metrics?: string[];
  measures?: string[];
  reason?: string;
}

export interface SemanticResult {
  columns: string[];
  rows: Record<string, unknown>[];
  sql: string;
  provenance: Provenance;
}

export interface CompiledQuery {
  sql: string;
  provenance: Provenance;
}

export interface CatalogDimension {
  name: string;
  type: "categorical" | "time" | "boolean" | "numeric";
  description: string;
  grains: string[];
  synonyms: string[];
  selectable: boolean;
}

export interface CatalogMeasure {
  name: string;
  agg: string;
  numerator?: string | null;
  denominator?: string | null;
  unit: string;
  description: string;
  synonyms: string[];
}

export interface CatalogDataset {
  id: string;
  display_name: string;
  description: string;
  grain: string;
  domain: string;
  dimensions: CatalogDimension[];
  measures: CatalogMeasure[];
  filters: { name: string; description: string }[];
}

export interface CatalogMetric {
  id: string;
  display_name: string;
  description: string;
  owner: string;
  authority: string;
  last_reviewed: string;
  measure: string;
  default_filters: string[];
  synonyms: string[];
  example_questions: string[];
}

export interface SemanticCatalog {
  datasets: CatalogDataset[];
  metrics: CatalogMetric[];
}

/** The dataset id a metric or `dataset:measure` reference belongs to. */
export function datasetOf(ref: string, catalog: SemanticCatalog): string | undefined {
  if (ref.startsWith("metric.")) return catalog.metrics.find((m) => m.id === ref)?.measure.split(":")[0];
  return ref.split(":")[0];
}
