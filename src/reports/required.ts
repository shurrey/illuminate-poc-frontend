import type { FilterValues, ReportDef, ReportFilterDef } from "@/types/reports";

/** The report's required filters that have no value yet. */
export function missingRequired(report: ReportDef, values: FilterValues): ReportFilterDef[] {
  const required = new Set(report.required_filters ?? []);
  return report.filters.filter((f) => {
    if (!required.has(f.id)) return false;
    const v = values[f.id];
    return Array.isArray(v) ? v.length === 0 : !v || (!v.start && !v.end);
  });
}
