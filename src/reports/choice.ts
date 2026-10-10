import type { FilterValues, ReportFilterDef } from "@/types/reports";

/** A choice filter's current option: the chosen one when it is an option, else the default. */
export function choiceValue(filter: ReportFilterDef, values: FilterValues): string {
  const options = filter.options ?? [];
  const chosen = values[filter.id];
  const picked = Array.isArray(chosen) ? String(chosen[0] ?? "") : "";
  if (options.includes(picked)) return picked;
  return Array.isArray(filter.default) ? String(filter.default[0] ?? options[0] ?? "") : options[0] ?? "";
}
