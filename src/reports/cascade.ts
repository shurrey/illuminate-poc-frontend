import type { FilterValues, ReportFilterDef } from "@/types/reports";

/** The values with `id` set and every filter that depends on it (directly or not) cleared. */
export function withDependantsCleared(filters: ReportFilterDef[], values: FilterValues, id: string,
                                      value: FilterValues[string]): FilterValues {
  const cleared = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const f of filters) {
      if (f.depends_on?.includes(parent) && !cleared.has(f.id)) {
        cleared.add(f.id);
        queue.push(f.id);
      }
    }
  }
  const next: FilterValues = { ...values, [id]: value };
  cleared.forEach((c) => delete next[c]);
  return next;
}

/** The dimension a filter's options come from: its single dimension, or its first qualified alternative. */
export function optionsDimension(f: ReportFilterDef): string | undefined {
  return f.dimension ?? f.dimensions?.find((d) => d.ref.includes(":"))?.ref;
}
