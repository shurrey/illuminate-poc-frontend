import type { FilterValues, ReportFilterDef } from "@/types/reports";

// Filter values live in the URL (f.<id>=a&f.<id>=b, or f.<id>=start..end) so a filtered view can be shared.
// `f=1` marks the URL as authoritative: a filter absent from it was cleared, not left at its default.

/** The URL's filter values, or null when the user hasn't changed any (use the report's defaults). */
export function valuesFromUrl(filters: ReportFilterDef[], params: URLSearchParams): FilterValues | null {
  if (!params.has("f")) return null;
  const found: FilterValues = {};
  for (const f of filters) {
    const raw = params.getAll(`f.${f.id}`);
    if (raw.length === 0) continue;
    if (f.control === "date_range") {
      const [start, end] = raw[0].split("..");
      found[f.id] = { ...(start ? { start } : {}), ...(end ? { end } : {}) };
    } else {
      found[f.id] = raw;
    }
  }
  return found;
}

export function urlFor(id: string, filters: ReportFilterDef[], values: FilterValues): string {
  const params = new URLSearchParams({ id, f: "1" });
  for (const f of filters) {
    const v = values[f.id];
    if (!v) continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(`f.${f.id}`, String(x)));
    else if (v.start || v.end) params.set(`f.${f.id}`, `${v.start ?? ""}..${v.end ?? ""}`);
  }
  return `/reporting/report?${params.toString()}`;
}
