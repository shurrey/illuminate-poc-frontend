"use client";

import { useEffect, useState } from "react";
import {
  listMetrics, putOverlay, deleteOverlay,
  type MetricSummary, type OverlayPayload,
} from "@/services/adminApi";
import {
  Layers, Loader2, Pencil, Save, RotateCcw, Trash2, AlertTriangle, CheckCircle2, X,
} from "lucide-react";

export default function MetricDefinitionsPage() {
  const [tenantId, setTenantId] = useState<string>("");
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MetricSummary | null>(null);

  // Edit panel state
  const [editing, setEditing] = useState(false);
  const [editSql, setEditSql] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDiff, setEditDiff] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listMetrics();
      setTenantId(data.tenant_id);
      setMetrics(data.metrics);
      // Re-select the same metric if we had one open
      if (selected) {
        const updated = data.metrics.find((m) => m.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (m: MetricSummary) => {
    setSelected(m);
    setEditing(true);
    setEditSql(m.overlay?.measure_sql ?? m.canonical_sql);
    setEditOwner(m.overlay?.owner ?? "");
    setEditDiff(m.overlay?.diff_description ?? "");
    setSaveError(null);
    setSaveSuccess(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await putOverlay(selected.id, {
        measure_sql: editSql,
        owner: editOwner,
        diff_description: editDiff,
      });
      setSaveSuccess(true);
      setEditing(false);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Remove this institution's overlay for "${selected.display_name}"? The canonical definition will apply going forward.`)) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await deleteOverlay(selected.id);
      setEditing(false);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-6 flex items-center gap-3">
          <Layers size={28} className="text-[#0066FF]" />
          <div>
            <h1 className="text-2xl font-semibold">Metric Definitions</h1>
            <p className="text-gray-600 text-sm">
              Override the canonical Blackboard metrics for {tenantId ? <code className="bg-gray-200 px-1.5 rounded">{tenantId}</code> : "your institution"}.{" "}
              Edits go live immediately. The canonical SELECT-only safety guard runs on save — bad SQL is rejected before anything is persisted.
            </p>
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="animate-spin" size={18} /> Loading metric catalog...
          </div>
        )}
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
            <strong>Couldn&apos;t load metrics.</strong> {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: metric list — scrolls with the page */}
            <div className="lg:col-span-1 space-y-2">
              {metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); cancelEdit(); }}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selected?.id === m.id
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{m.display_name}</span>
                    {m.overlay ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        custom
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        canonical
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{m.description}</div>
                  <code className="text-xs text-gray-400 mt-1 block">{m.id}</code>
                </button>
              ))}
            </div>

            {/* Right: detail / edit panel — sticky so you can read it while
                browsing the list. Internal scroll for long SQL bodies. */}
            <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
              {!selected && (
                <div className="bg-white border border-gray-200 rounded p-12 text-center text-gray-500">
                  Pick a metric from the left to see its definition or edit your overlay.
                </div>
              )}
              {selected && (
                <div className="bg-white border border-gray-200 rounded p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selected.display_name}</h2>
                      <code className="text-xs text-gray-500">{selected.id}</code>
                      <p className="text-sm text-gray-700 mt-2">{selected.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Canonical owner: <strong>{selected.owner}</strong>
                      </p>
                    </div>
                    {!editing && (
                      <button
                        onClick={() => startEdit(selected)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded text-sm hover:bg-blue-700"
                      >
                        <Pencil size={14} />
                        {selected.overlay ? "Edit override" : "Create override"}
                      </button>
                    )}
                  </div>

                  {/* Provenance summary */}
                  <div className={`mb-4 p-3 rounded border ${
                    selected.overlay
                      ? "bg-purple-50 border-purple-200"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <div className="text-sm">
                      <strong>Applied definition:</strong>{" "}
                      {selected.overlay ? "Tenant override" : "Blackboard canonical"}
                    </div>
                    {selected.overlay && (
                      <>
                        <div className="text-xs mt-1">
                          <strong>Override owner:</strong> {selected.overlay.owner}
                        </div>
                        <div className="text-xs">
                          <strong>Last reviewed:</strong> {selected.overlay.last_reviewed}
                        </div>
                        {selected.overlay.diff_description && (
                          <div className="text-xs mt-1 italic">&ldquo;{selected.overlay.diff_description}&rdquo;</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Read-only view of canonical SQL when not editing and no overlay */}
                  {!editing && (
                    <>
                      <h3 className="font-medium text-sm mb-1">
                        {selected.overlay ? "Override SQL (active)" : "Canonical SQL"}
                      </h3>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto max-h-96">
{selected.overlay?.measure_sql ?? selected.canonical_sql}
                      </pre>
                      {selected.overlay && (
                        <details className="mt-3">
                          <summary className="text-sm text-gray-600 cursor-pointer">View canonical (read-only)</summary>
                          <pre className="bg-gray-100 text-gray-700 p-3 rounded text-xs overflow-x-auto max-h-96 mt-2">
{selected.canonical_sql}
                          </pre>
                        </details>
                      )}
                    </>
                  )}

                  {/* Editor */}
                  {editing && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium block mb-1">Override owner</label>
                        <input
                          type="text"
                          value={editOwner}
                          onChange={(e) => setEditOwner(e.target.value)}
                          placeholder="e.g., Office of Institutional Research"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          What changed vs canonical?
                        </label>
                        <input
                          type="text"
                          value={editDiff}
                          onChange={(e) => setEditDiff(e.target.value)}
                          placeholder="e.g., Restricted to degree-seeking students; 60-day windows instead of 90."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">
                          Override SQL
                        </label>
                        <textarea
                          value={editSql}
                          onChange={(e) => setEditSql(e.target.value)}
                          spellCheck={false}
                          className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-xs"
                          rows={20}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Must be a SELECT/CTE referencing only CDM_LMS tables. Saved SQL runs through the same safety validator as canonical metrics.
                        </p>
                      </div>
                      {saveError && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-sm flex items-start gap-2">
                          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>Save failed.</strong> {saveError}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          Save override
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                          <X size={14} /> Cancel
                        </button>
                        {selected.overlay && (
                          <button
                            onClick={handleDelete}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded text-sm hover:bg-red-100 ml-auto"
                          >
                            <Trash2 size={14} /> Remove override
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Success banner */}
                  {saveSuccess && !editing && (
                    <div className="mt-4 bg-green-50 border border-green-200 text-green-800 p-3 rounded text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Saved. Reload the dashboard to see the change.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
