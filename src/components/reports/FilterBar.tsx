"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { querySemantic } from "@/services/semanticApi";
import type { SemanticCatalog } from "@/types/semantic";
import { optionsDimension } from "@/reports/cascade";
import type { DateRangeValue, FilterValues, ReportFilterDef } from "@/types/reports";

/** The distinct values of a filter's dimension (via its dataset's first measure), narrowed by its parents' values. */
function useOptions(filter: ReportFilterDef, catalog: SemanticCatalog | null, parents: { dimension: string; values: string[] }[]): string[] | null {
  const [options, setOptions] = useState<string[] | null>(null);
  const dimension = optionsDimension(filter);
  const parentKey = JSON.stringify(parents);
  useEffect(() => {
    if (!catalog || !dimension) return;
    const [datasetId, name] = dimension.split(":");
    const measure = catalog.datasets.find((d) => d.id === datasetId)?.measures[0]?.name;
    if (!measure) return;
    let live = true;
    const filters = (JSON.parse(parentKey) as { dimension: string; values: string[] }[])
      .map((p) => ({ dimension: p.dimension, op: "in" as const, values: p.values }));
    querySemantic({ measures: [`${datasetId}:${measure}`], dimensions: [dimension], filters, order_by: [{ field: name, direction: "asc" }], limit: 1000 })
      .then((r) => live && setOptions(r.rows.map((row) => String(row[name])).filter((v) => v && v !== "null")))
      .catch(() => live && setOptions([]));
    return () => { live = false; };
  }, [dimension, catalog, parentKey]);
  return options;
}

function SelectControl({ filter, catalog, value, parents, onChange }: {
  filter: ReportFilterDef; catalog: SemanticCatalog | null; value: string[];
  parents: { dimension: string; values: string[] }[]; onChange: (v: string[]) => void;
}) {
  const options = useOptions(filter, catalog, parents);
  const all = [...new Set([...value, ...(options ?? [])])];
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      {filter.label}
      <select multiple={filter.control === "multi_select"} value={filter.control === "multi_select" ? value : value[0] ?? ""}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value).filter(Boolean))}
        className={`min-w-44 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white ${filter.control === "multi_select" ? "h-20" : ""}`}>
        {filter.control === "select" && <option value="">All</option>}
        {all.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function DateControl({ filter, value, onChange }: { filter: ReportFilterDef; value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-gray-500">
      {filter.label}
      <div className="flex items-center gap-1">
        <input type="date" value={value.start ?? ""} onChange={(e) => onChange({ ...value, start: e.target.value || undefined })}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800" />
        <span>–</span>
        <input type="date" value={value.end ?? ""} onChange={(e) => onChange({ ...value, end: e.target.value || undefined })}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800" />
      </div>
    </div>
  );
}

function parentsOf(f: ReportFilterDef, filters: ReportFilterDef[], values: FilterValues) {
  return (f.depends_on ?? []).flatMap((id) => {
    const parent = filters.find((p) => p.id === id);
    const dimension = parent && optionsDimension(parent);
    const v = values[id];
    return dimension && Array.isArray(v) && v.length ? [{ dimension, values: v.map(String) }] : [];
  });
}

export function FilterBar({ filters, catalog, values, onChange, onReset }: {
  filters: ReportFilterDef[]; catalog: SemanticCatalog | null; values: FilterValues;
  onChange: (id: string, value: FilterValues[string]) => void; onReset: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl border border-gray-200 p-4">
      {filters.map((f) => f.control === "date_range"
        ? <DateControl key={f.id} filter={f} value={(values[f.id] as DateRangeValue) ?? {}} onChange={(v) => onChange(f.id, v)} />
        : <SelectControl key={f.id} filter={f} catalog={catalog} value={((values[f.id] as string[]) ?? []).map(String)}
            parents={parentsOf(f, filters, values)} onChange={(v) => onChange(f.id, v)} />)}
      <button onClick={onReset} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 ml-auto">
        <RotateCcw size={13} /> Reset
      </button>
    </div>
  );
}
