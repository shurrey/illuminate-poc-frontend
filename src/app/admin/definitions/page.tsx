"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, History, Layers, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import {
  AdminApiError, deleteOverlay, getOverlay, listOverlays, overlayHistory, putOverlay, revertOverlay,
  type Overlay, type OverlayValue,
} from "@/services/adminApi";
import { datasetOf, type SemanticCatalog } from "@/types/semantic";

interface Target {
  id: string;
  kind: "measure" | "filter" | "metric";
  label: string;
  datasetId: string;
  description: string;
  /** Lowercased label, id, description and synonyms, with underscores as spaces. */
  searchText: string;
}

const searchable = (...parts: (string | undefined)[]) => parts.join(" ").toLowerCase().replace(/_/g, " ");

function targetsFrom(catalog: SemanticCatalog): Target[] {
  const metrics = catalog.metrics.map((m) => ({
    id: `metric:${m.id}`, kind: "metric" as const, label: m.display_name, datasetId: datasetOf(m.id, catalog) ?? "",
    description: m.description, searchText: searchable(m.display_name, m.id, m.measure, m.description, ...m.synonyms),
  }));
  const fields = catalog.datasets.flatMap((d) => [
    ...d.measures.filter((m) => m.agg !== "ratio").map((m) => ({
      id: `measure:${d.id}:${m.name}`, kind: "measure" as const, label: `${d.display_name}: ${m.name}`, datasetId: d.id,
      description: m.description, searchText: searchable(d.display_name, m.name, m.description, ...m.synonyms),
    })),
    ...d.filters.map((f) => ({
      id: `filter:${d.id}:${f.name}`, kind: "filter" as const, label: `${d.display_name}: ${f.name}`, datasetId: d.id,
      description: f.description, searchText: searchable(d.display_name, f.name, f.description),
    })),
  ]);
  return [...metrics, ...fields].sort((a, b) => a.label.localeCompare(b.label));
}

export default function MetricDefinitionsPage() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Layers size={28} className="mx-auto text-gray-400 mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Metric Definitions</h1>
        <p className="text-gray-500 mt-2">Editing metric definitions requires administrator access. Ask your Illuminate administrator to add you.</p>
      </div>
    );
  }
  return <OverlayEditor />;
}

function OverlayEditor() {
  const { catalog, error: catalogError, reload: reloadCatalog } = useSemanticCatalog();
  const [listError, setListError] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Record<string, Overlay>>({});
  const [kind, setKind] = useState<Target["kind"]>("metric");
  const [selected, setSelected] = useState<Target | null>(null);
  const [newFilter, setNewFilter] = useState({ datasetId: "", name: "" });
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => {
    listOverlays()
      .then((r) => { setOverlays(Object.fromEntries(r.overlays.map((o) => [o.target, o]))); setListError(null); })
      .catch((e) => setListError(e instanceof Error ? e.message : "Could not load your overrides"));
  }, []);
  useEffect(refresh, [refresh]);

  const targets = useMemo(() => (catalog ? targetsFrom(catalog) : []), [catalog]);
  const matches = useMemo(() => {
    const words = query.toLowerCase().replace(/_/g, " ").split(/\s+/).filter(Boolean);
    return targets.filter((t) => words.every((w) => t.searchText.includes(w)));
  }, [targets, query]);
  const select = (id: string) => setSelected(targets.find((t) => t.id === id) ?? null);
  if (catalogError) return <div className="p-6 text-sm text-red-600">{catalogError}</div>;
  if (!catalog) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Metric Definitions</h1>
      {listError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mt-4">{listError}</div>}
      <p className="text-gray-500 mt-1 mb-6">Override how your institution computes a measure, a filter, or a metric&apos;s default filters. Every change is validated and versioned.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, e.g. average grade"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-3 text-xs">
            {(["metric", "measure", "filter"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`flex-1 px-2 py-1.5 rounded-md ${kind === k ? "bg-white text-[#0066FF] shadow-sm" : "text-gray-500"}`}>
                {k === "metric" ? "Metrics" : k === "measure" ? "Measures" : "Filters"} ({matches.filter((t) => t.kind === k).length})
              </button>
            ))}
          </div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {matches.filter((t) => t.kind === kind).length === 0 && <p className="text-xs text-gray-400 px-3 py-4">No {kind}s match.</p>}
            {matches.filter((t) => t.kind === kind).map((t) => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${selected?.id === t.id ? "border-[#0066FF] bg-blue-50" : "border-transparent hover:bg-gray-50"}`}>
                <div className="text-gray-800">{t.label}</div>
                {t.description && <div className="text-[11px] text-gray-400 line-clamp-1">{t.description}</div>}
                {overlays[t.id] && (
                  <div className={`text-[11px] ${overlays[t.id].status === "skipped" ? "text-red-600" : "text-amber-700"}`}
                    title={overlays[t.id].problems?.join("\n")}>
                    {overlays[t.id].status === "skipped" ? "Not applied: no longer valid" : "Overridden"} · v{overlays[t.id].version}
                  </div>
                )}
              </button>
            ))}
          </div>
          {kind === "filter" && (
            <div className="mt-4 p-3 border border-dashed border-gray-300 rounded-lg space-y-2 text-sm">
              <div className="text-xs font-semibold text-gray-500">Add a filter for your institution</div>
              <select value={newFilter.datasetId} onChange={(e) => setNewFilter({ ...newFilter, datasetId: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded">
                <option value="">Dataset...</option>
                {catalog.datasets.map((d) => <option key={d.id} value={d.id}>{d.display_name}</option>)}
              </select>
              <input value={newFilter.name} onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                placeholder="filter_name" className="w-full px-2 py-1.5 border border-gray-200 rounded font-mono" />
              <button disabled={!newFilter.datasetId || !newFilter.name}
                onClick={() => setSelected({ id: `filter:${newFilter.datasetId}:${newFilter.name}`, kind: "filter", label: newFilter.name, datasetId: newFilter.datasetId, description: "", searchText: "" })}
                className="flex items-center gap-1 text-xs text-[#0066FF] disabled:text-gray-300"><Plus size={12} /> Define it</button>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {selected ? <TargetEditor key={selected.id} target={selected} catalog={catalog} onSelect={(id) => { setKind(id.split(":")[0] as Target["kind"]); select(id); }}
            onSaved={() => { refresh(); reloadCatalog(); }} />
            : <p className="text-sm text-gray-400 py-12 text-center">Select a definition to view or override it.</p>}
        </div>
      </div>
    </div>
  );
}

function TargetEditor({ target, catalog, onSaved, onSelect }: {
  target: Target; catalog: SemanticCatalog; onSaved: () => void; onSelect: (targetId: string) => void;
}) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [canonical, setCanonical] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Overlay[]>([]);
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const field = target.kind === "measure" ? "expr" : target.kind === "filter" ? "sql" : "default_filters";
  const datasetFilters = catalog.datasets.find((d) => d.id === target.datasetId)?.filters ?? [];

  const load = useCallback(async () => {
    const [current, past] = await Promise.all([getOverlay(target.id), overlayHistory(target.id)]);
    setOverlay(current.overlay);
    setCanonical(current.canonical);
    setHistory(past.history);
    const effective = (current.overlay ?? current.canonical ?? {}) as Record<string, unknown>;
    if (field === "default_filters") setFilters((effective.default_filters as string[]) ?? []);
    else setText((effective[field] as string) ?? "");
    setDescription(current.overlay?.description ?? "");
  }, [target.id, field]);
  useEffect(() => { load().catch((e) => setErrors([e.message])); }, [load]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      await fn();
      setNotice(done);
      onSaved();
      await load();
    } catch (e) {
      setErrors(e instanceof AdminApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)]);
      // Someone else changed it: show their version so the next save is based on it.
      if (e instanceof AdminApiError && e.status === 409) await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  const value: OverlayValue = field === "default_filters" ? { default_filters: filters } : field === "expr" ? { expr: text } : { sql: text };
  const version = overlay?.version ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 text-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{target.label}</h2>
        <p className="font-mono text-xs text-gray-400">{target.id}</p>
        {target.description && <p className="text-gray-600 mt-2">{target.description}</p>}
      </div>
      {target.kind === "metric" && <MetricComputation target={target} catalog={catalog} onSelect={onSelect} />}
      <div className="text-xs text-gray-500">
        Canonical: {canonical ? <code className="bg-gray-100 rounded px-1">{JSON.stringify(Object.values(canonical)[0])}</code> : "none (institution-only filter)"}
        {overlay && <span className="ml-2 text-amber-700">Your override: v{overlay.version} by {overlay.updated_by} on {overlay.updated_at.slice(0, 10)}</span>}
      </div>

      {field === "default_filters" ? (
        <div className="space-y-1">
          {datasetFilters.map((f) => (
            <label key={f.name} className="flex items-center gap-2">
              <input type="checkbox" checked={filters.includes(f.name)}
                onChange={(e) => setFilters(e.target.checked ? [...filters, f.name] : filters.filter((x) => x !== f.name))} />
              <span className="font-mono text-xs">{f.name}</span><span className="text-gray-500">{f.description}</span>
            </label>
          ))}
        </div>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false}
          placeholder={field === "expr" ? "SQL expression over the dataset's columns, e.g. ROUND(GRADE_PERCENTAGE, 0)" : "SQL condition, e.g. GRADE_PERCENTAGE >= 90"}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
      )}
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why your institution defines it this way"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />

      {errors.length > 0 && <ul className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs list-disc pl-6">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {notice && <div className="text-xs text-emerald-600">{notice}</div>}

      <div className="flex gap-2">
        <button disabled={busy} onClick={() => act(() => putOverlay(target.id, value, description, version), "Saved and validated.")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save override
        </button>
        {overlay && (
          <button disabled={busy} onClick={() => act(() => deleteOverlay(target.id, version), "Override removed; the canonical definition applies.")}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 border border-gray-200 rounded-lg disabled:opacity-50"><Trash2 size={14} /> Remove override</button>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase mb-2"><History size={12} /> History</h3>
          {history.map((h) => (
            <div key={h.version} className="flex items-center gap-3 py-1.5 border-b border-gray-100 text-xs">
              <span className="w-8 text-gray-500">v{h.version}</span>
              <code className="flex-1 truncate">{JSON.stringify(h.expr ?? h.sql ?? h.default_filters)}</code>
              <span className="text-gray-400">{h.updated_by} · {h.updated_at.slice(0, 10)}</span>
              {h.version !== overlay?.version && (
                <button disabled={busy} onClick={() => act(() => revertOverlay(target.id, h.version, version), `Reverted to v${h.version}.`)}
                  className="flex items-center gap-1 text-[#0066FF] disabled:opacity-50"><RotateCcw size={11} /> Revert</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** How a metric is computed: its measure's aggregation and expression, with links to edit them. */
function MetricComputation({ target, catalog, onSelect }: { target: Target; catalog: SemanticCatalog; onSelect: (targetId: string) => void }) {
  const metric = catalog.metrics.find((m) => `metric:${m.id}` === target.id);
  const [datasetId, measureName] = metric?.measure.split(":") ?? ["", ""];
  const dataset = catalog.datasets.find((d) => d.id === datasetId);
  const measure = dataset?.measures.find((m) => m.name === measureName);
  const partsKey = measure?.agg === "ratio" ? [measure.numerator, measure.denominator].filter(Boolean).join(",") : measureName;
  const parts = partsKey.split(",");
  const [exprs, setExprs] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    Promise.all(partsKey.split(",").map(async (name) => {
      const r = await getOverlay(`measure:${datasetId}:${name}`);
      return [name, String((r.overlay ?? r.canonical)?.expr ?? "")] as const;
    })).then((pairs) => live && setExprs(Object.fromEntries(pairs))).catch(() => undefined);
    return () => { live = false; };
  }, [datasetId, partsKey]);
  if (!metric || !dataset || !measure) return null;
  const aggOf = (name: string) => dataset.measures.find((m) => m.name === name)?.agg.toUpperCase() ?? "";
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs">
      <div className="text-gray-500">
        Computed from <strong className="text-gray-700">{dataset.display_name}</strong>
        {measure.agg === "ratio" && <> as the ratio of <span className="font-mono">{measure.numerator}</span> to <span className="font-mono">{measure.denominator}</span></>}.
        This page changes which filters it applies by default; to change the calculation, edit its measure.
      </div>
      {parts.map((name) => (
        <div key={name} className="flex items-center gap-2">
          <code className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 overflow-x-auto">{aggOf(name)}({exprs[name] ?? "…"})</code>
          <button onClick={() => onSelect(`measure:${datasetId}:${name}`)} className="flex items-center gap-1 text-[#0066FF] whitespace-nowrap">
            Edit {name} <ArrowRight size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
