"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { querySemantic } from "@/services/semanticApi";
import type { SemanticCatalog } from "@/types/semantic";
import type { DateRangeValue, FilterValues, ReportFilterDef } from "@/types/reports";

/** The distinct values of a filter's dimension, via its dataset's first measure. */
function useOptions(filter: ReportFilterDef, catalog: SemanticCatalog | null): string[] | null {
  const [options, setOptions] = useState<string[] | null>(null);
  useEffect(() => {
    if (!catalog || !filter.dimension) return;
    const [datasetId, name] = filter.dimension.split(":");
    const measure = catalog.datasets.find((d) => d.id === datasetId)?.measures[0]?.name;
    if (!measure) return;
    let live = true;
    querySemantic({ measures: [`${datasetId}:${measure}`], dimensions: [filter.dimension], order_by: [{ field: name, direction: "asc" }], limit: 1000 })
      .then((r) => live && setOptions(r.rows.map((row) => String(row[name])).filter((v) => v && v !== "null")))
      .catch(() => live && setOptions([]));
    return () => { live = false; };
  }, [filter.dimension, catalog]);
  return options;
}

function SelectControl({ filter, catalog, value, onChange }: {
  filter: ReportFilterDef; catalog: SemanticCatalog | null; value: string[]; onChange: (v: string[]) => void;
}) {
  const options = useOptions(filter, catalog);
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

export function FilterBar({ filters, catalog, values, onChange, onReset }: {
  filters: ReportFilterDef[]; catalog: SemanticCatalog | null; values: FilterValues;
  onChange: (id: string, value: FilterValues[string]) => void; onReset: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl border border-gray-200 p-4">
      {filters.map((f) => f.control === "date_range"
        ? <DateControl key={f.id} filter={f} value={(values[f.id] as DateRangeValue) ?? {}} onChange={(v) => onChange(f.id, v)} />
        : <SelectControl key={f.id} filter={f} catalog={catalog} value={((values[f.id] as string[]) ?? []).map(String)} onChange={(v) => onChange(f.id, v)} />)}
      <button onClick={onReset} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 ml-auto">
        <RotateCcw size={13} /> Reset
      </button>
    </div>
  );
}
