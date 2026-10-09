import type { CatalogDataset, CatalogMeasure, ContractFilter, Provenance, QueryContract, SemanticCatalog } from "@/types/semantic";

export interface CalculationLine { label: string; detail: string; code?: string }

/** How one metric or measure in a query is calculated, in the order the Info panel shows it. */
export interface QueryDescription {
  title: string;
  description: string;
  calculation: CalculationLine[];
  dataset: { name: string; grain: string; description: string };
  filters: CalculationLine[];
  transform?: string;
  overrides: string[];
}

const AGG_WORDS: Record<string, string> = {
  count: "Count of", count_distinct: "Number of distinct", sum: "Total of", avg: "Average of",
  median: "Median of", min: "Lowest", max: "Highest",
};

const OP_WORDS: Record<string, string> = {
  eq: "is", neq: "is not", in: "is one of", not_in: "is not one of", gt: "is more than", gte: "is at least",
  lt: "is less than", lte: "is at most", contains: "contains",
};

function filterWords(f: ContractFilter): string {
  const values = (f.values ?? []).map(String);
  if (f.op === "between") return `is between ${values[0]} and ${values[1]}`;
  if (f.op === "is_null") return "is empty";
  if (f.op === "not_null") return "is not empty";
  return `${OP_WORDS[f.op] ?? f.op} ${values.join(", ")}`;
}

function measureLine(m: CatalogMeasure | undefined, label: string): CalculationLine {
  return { label, detail: AGG_WORDS[m?.agg ?? ""] ?? m?.agg ?? "", ...(m?.expr ? { code: m.expr } : {}) };
}

/** One description per metric or measure in the contract; unknown references are skipped. */
export function describeQuery(contract: QueryContract, catalog: SemanticCatalog, provenance?: Provenance,
                              transform?: string): QueryDescription[] {
  const shared: CalculationLine[] = (contract.filters ?? []).map((f) => ({ label: f.dimension.split(":").pop() ?? f.dimension, detail: filterWords(f) }));
  const tr = contract.time_range;
  if (tr) {
    const range = tr.start && tr.end ? `from ${tr.start} to ${tr.end}` : tr.start ? `from ${tr.start}` : `until ${tr.end}`;
    shared.push({ label: "Time range", detail: `${tr.dimension.split(":").pop()} ${range}` });
  }

  const refs = [
    ...(contract.metrics ?? []).map((id) => {
      const metric = catalog.metrics.find((m) => m.id === id);
      return metric ? { ref: metric.measure, title: metric.display_name, description: metric.description, defaults: metric.default_filters } : null;
    }),
    ...(contract.measures ?? []).map((ref) => ({ ref, title: "", description: "", defaults: [] as string[] })),
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  return refs.flatMap(({ ref, title, description, defaults }) => {
    const [datasetId, name] = ref.split(":");
    const ds: CatalogDataset | undefined = catalog.datasets.find((d) => d.id === datasetId);
    const measure = ds?.measures.find((m) => m.name === name);
    if (!ds || !measure) return [];
    const calculation = measure.agg === "ratio"
      ? [measureLine(ds.measures.find((m) => m.name === measure.numerator), `Numerator: ${measure.numerator}`),
         measureLine(ds.measures.find((m) => m.name === measure.denominator), `Denominator: ${measure.denominator}`)]
      : [measureLine(measure, "Calculation")];
    const defaultFilters = defaults.map((fname) => {
      const f = ds.filters.find((x) => x.name === fname);
      return { label: f?.description || fname, detail: "Metric default filter", ...(f?.sql ? { code: f.sql } : {}) };
    });
    return [{
      title: title || name,
      description: description || measure.description,
      calculation,
      dataset: { name: ds.display_name, grain: ds.grain, description: ds.description },
      filters: [...defaultFilters, ...shared],
      ...(transform ? { transform } : {}),
      overrides: provenance?.overlays ?? [],
    }];
  });
}
