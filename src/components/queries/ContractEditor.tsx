"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { datasetOf, type CatalogDataset, type CatalogDimension, type ContractFilter, type FilterOp, type FilterValue,
  type QueryContract, type SemanticCatalog } from "@/types/semantic";

const select = "px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]";
const OPS: FilterOp[] = ["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "between", "contains", "is_null", "not_null"];
const LIST_OPS: FilterOp[] = ["in", "not_in", "between"];

interface DimensionOption { ref: string; label: string; dim: CatalogDimension }

function datasetsOf(contract: QueryContract, catalog: SemanticCatalog): CatalogDataset[] {
  const refs = [...(contract.metrics ?? []), ...(contract.measures ?? [])];
  const ids = [...new Set(refs.map((r) => datasetOf(r, catalog)).filter(Boolean))];
  return ids.map((id) => catalog.datasets.find((d) => d.id === id)).filter((d): d is CatalogDataset => !!d);
}

function resolvable(ref: string, base: CatalogDataset, catalog: SemanticCatalog): boolean {
  const [ds, name] = ref.includes(":") ? ref.split(":") : [null, ref];
  if (ds) return ds === base.id || base.joins.includes(ds);
  const reach = [base, ...base.joins.map((id) => catalog.datasets.find((d) => d.id === id)).filter((d): d is CatalogDataset => !!d)];
  return reach.some((d) => d.dimensions.some((dim) => dim.name === name));
}

/** Dimensions every selected metric or measure can use: the first one's own, then its joined datasets' (qualified). */
function dimensionOptions(contract: QueryContract, catalog: SemanticCatalog): DimensionOption[] {
  const [base, ...others] = datasetsOf(contract, catalog);
  if (!base) return [];
  const own = base.dimensions.map((dim) => ({ ref: dim.name, label: dim.name, dim }));
  const joined = base.joins.flatMap((id) => {
    const ds = catalog.datasets.find((d) => d.id === id);
    return (ds?.dimensions ?? []).map((dim) => ({ ref: `${id}:${dim.name}`, label: `${ds!.display_name}: ${dim.name}`, dim }));
  });
  return [...own, ...joined].filter((o) => others.every((d) => resolvable(o.ref, d, catalog)));
}

/** Output column names the contract selects, for pruning order_by. */
function outputNames(c: QueryContract): Set<string> {
  return new Set([
    ...(c.dimensions ?? []).map((d) => d.split(":").pop()!),
    ...(c.metrics ?? []).map((m) => m.split(".")[1]),
    ...(c.measures ?? []).map((m) => m.split(":")[1]),
  ]);
}

function parseValues(raw: string, op: FilterOp, dim?: CatalogDimension): FilterValue[] {
  if (op === "is_null" || op === "not_null") return [];
  const parts = LIST_OPS.includes(op) ? raw.split(",").map((p) => p.trim()).filter(Boolean) : [raw.trim()];
  return parts.map((p) => {
    if (dim?.type === "numeric" && p !== "" && !Number.isNaN(Number(p))) return Number(p);
    if (dim?.type === "boolean" && (p === "true" || p === "false")) return p === "true";
    return p;
  });
}

export function ContractEditor({ catalog, contract, onChange }: {
  catalog: SemanticCatalog; contract: QueryContract; onChange: (c: QueryContract) => void;
}) {
  const [grain, setGrain] = useState("month");
  const [rawValues, setRawValues] = useState<string[]>(() => (contract.filters ?? []).map((f) => (f.values ?? []).join(", ")));
  const options = dimensionOptions(contract, catalog);
  const optionFor = (ref: string) => options.find((o) => o.ref === ref.split("__")[0]);
  const metrics = contract.metrics ?? [];
  const dims = contract.dimensions ?? [];
  const filters = contract.filters ?? [];
  const set = (patch: Partial<QueryContract>) => {
    const next = { ...contract, ...patch };
    const names = outputNames(next);
    onChange({ ...next, order_by: (next.order_by ?? []).filter((o) => names.has(o.field.toLowerCase())) });
  };
  const measures = contract.measures ?? [];

  const setFilter = (i: number, patch: Partial<ContractFilter>, raw?: string) => {
    const nextRaw = [...rawValues];
    if (raw !== undefined) nextRaw[i] = raw;
    setRawValues(nextRaw);
    const merged = { ...filters[i], ...patch };
    merged.values = parseValues(nextRaw[i] ?? "", merged.op, optionFor(merged.dimension)?.dim);
    set({ filters: filters.map((f, j) => (j === i ? merged : f)) });
  };

  return (
    <div className="space-y-4 text-sm">
      <section>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Metrics</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {metrics.map((id) => (
            <span key={id} className="flex items-center gap-1 bg-blue-50 text-[#0066FF] rounded px-2 py-1">
              {catalog.metrics.find((m) => m.id === id)?.display_name ?? id}
              <button onClick={() => set({ metrics: metrics.filter((m) => m !== id) })}><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {measures.map((ref) => (
            <span key={ref} className="flex items-center gap-1 bg-blue-50 text-[#0066FF] rounded px-2 py-1 font-mono text-xs">
              {ref}
              <button onClick={() => set({ measures: measures.filter((m) => m !== ref) })}><X size={12} /></button>
            </span>
          ))}
        </div>
        <select value="" onChange={(e) => e.target.value && set({ metrics: [...metrics, e.target.value] })} className={select}>
          <option value="">Add a metric...</option>
          {catalog.metrics.filter((m) => !metrics.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Break down by</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {dims.map((ref) => (
            <span key={ref} className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded px-2 py-1">
              {optionFor(ref)?.label ?? ref}{ref.includes("__") && ` (${ref.split("__")[1]})`}
              <button onClick={() => set({ dimensions: dims.filter((d) => d !== ref) })}><X size={12} /></button>
            </span>
          ))}
        </div>
        <select value="" disabled={!options.length} className={select} onChange={(e) => {
          const o = options.find((x) => x.ref === e.target.value);
          if (!o) return;
          const ref = o.dim.type === "time" ? `${o.ref}__${o.dim.grains.includes(grain) ? grain : o.dim.grains[0]}` : o.ref;
          if (!dims.includes(ref)) set({ dimensions: [...dims, ref] });
        }}>
          <option value="">{options.length ? "Add a breakdown..." : "Pick a metric first"}</option>
          {options.filter((o) => o.dim.selectable).map((o) => <option key={o.ref} value={o.ref}>{o.label}{o.dim.type === "time" ? ` (by ${o.dim.grains.includes(grain) ? grain : o.dim.grains[0]})` : ""}</option>)}
        </select>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Filters</h4>
        {filters.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
            <select value={f.dimension} onChange={(e) => setFilter(i, { dimension: e.target.value })} className={select}>
              {options.map((o) => <option key={o.ref} value={o.ref}>{o.label}</option>)}
            </select>
            <select value={f.op} onChange={(e) => setFilter(i, { op: e.target.value as FilterOp })} className={select}>
              {OPS.map((op) => <option key={op} value={op}>{op.replace("_", " ")}</option>)}
            </select>
            {f.op !== "is_null" && f.op !== "not_null" && (
              <input value={rawValues[i] ?? ""} onChange={(e) => setFilter(i, {}, e.target.value)}
                placeholder={LIST_OPS.includes(f.op) ? "a, b" : "value"} className={`${select} w-48`} />
            )}
            <button onClick={() => { set({ filters: filters.filter((_, j) => j !== i) }); setRawValues(rawValues.filter((_, j) => j !== i)); }}
              className="text-gray-400 hover:text-red-500"><X size={14} /></button>
          </div>
        ))}
        <button disabled={!options.length} onClick={() => { set({ filters: [...filters, { dimension: options[0].ref, op: "eq", values: [] }] }); setRawValues([...rawValues, ""]); }}
          className="flex items-center gap-1 text-xs text-[#0066FF] disabled:text-gray-300"><Plus size={12} /> Add filter</button>
      </section>

      {(contract.order_by?.length || contract.time_range) ? (
        <section className="flex flex-wrap gap-2">
          {contract.order_by?.map((o) => (
            <span key={o.field} className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded px-2 py-1 text-xs">
              Sorted by {o.field} {o.direction ?? "asc"}
              <button onClick={() => set({ order_by: contract.order_by!.filter((x) => x.field !== o.field) })}><X size={12} /></button>
            </span>
          ))}
          {contract.time_range && (
            <span className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded px-2 py-1 text-xs">
              {contract.time_range.dimension} {contract.time_range.start ?? "…"} to {contract.time_range.end ?? "…"}
              <button onClick={() => set({ time_range: undefined })}><X size={12} /></button>
            </span>
          )}
        </section>
      ) : null}

      <section className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">Time grain for new breakdowns
          <select value={grain} onChange={(e) => setGrain(e.target.value)}
            className={`${select} block mt-1`}>
            {["day", "week", "month", "quarter", "year"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500">Row limit
          <input type="number" min={1} max={1000} value={contract.limit ?? 100}
            onChange={(e) => set({ limit: Math.max(1, Math.min(1000, Number(e.target.value) || 100)) })} className={`${select} block mt-1 w-24`} />
        </label>
      </section>
    </div>
  );
}
