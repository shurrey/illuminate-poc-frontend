"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { datasetOf, type CatalogDataset } from "@/types/semantic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</h3>
      {children}
    </section>
  );
}

/** Read-only browser for the governed datasets, their relationships and the metrics built on them. */
export function SemanticLayerView() {
  const { catalog, error } = useSemanticCatalog();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!catalog) return <div className="flex-1 flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;

  const domains = [...new Set(catalog.datasets.map((d) => d.domain))].sort();
  const active: CatalogDataset | undefined = catalog.datasets.find((d) => d.id === activeId) ?? catalog.datasets[0];
  const nameOf = (id: string) => catalog.datasets.find((d) => d.id === id)?.display_name ?? id;
  const metrics = catalog.metrics.filter((m) => active && datasetOf(m.id, catalog) === active.id);
  const usedBy = catalog.datasets.filter((d) => active && d.joins.includes(active.id));

  return (
    <div className="flex flex-1 overflow-hidden">
      <nav className="w-72 border-r border-gray-200 overflow-y-auto bg-gray-50 py-3">
        {domains.map((domain) => (
          <div key={domain} className="mb-3">
            <div className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase">{domain}</div>
            {catalog.datasets.filter((d) => d.domain === domain).map((d) => (
              <button key={d.id} onClick={() => setActiveId(d.id)}
                className={`block w-full text-left px-4 py-1.5 text-sm ${d.id === active?.id ? "bg-white text-[#0066FF] font-medium" : "text-gray-700 hover:bg-white"}`}>
                {d.display_name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {active && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
          <h2 className="text-lg font-semibold text-gray-900">{active.display_name}</h2>
          <p className="font-mono text-xs text-gray-400 mb-2">{active.id}</p>
          <p className="text-sm text-gray-600 mb-1">{active.description}</p>
          <p className="text-xs text-gray-500 mb-6">Grain: {active.grain}</p>

          <Section title="Relationships">
            <p className="text-sm text-gray-600">
              Uses dimensions from: {active.joins.length ? active.joins.map(nameOf).join(", ") : "none"}
            </p>
            <p className="text-sm text-gray-600">
              Supplies dimensions to: {usedBy.length ? usedBy.map((d) => d.display_name).join(", ") : "none"}
            </p>
          </Section>

          <Section title={`Metrics (${metrics.length})`}>
            {metrics.length === 0 && <p className="text-sm text-gray-400">No metrics are built on this dataset.</p>}
            {metrics.map((m) => (
              <div key={m.id} className="mb-2 text-sm">
                <div className="flex items-center gap-1.5 font-medium text-gray-800"><ShieldCheck size={13} className="text-emerald-600" />{m.display_name}
                  <span className="font-mono text-xs text-gray-400">{m.id}</span></div>
                <div className="text-gray-600">{m.description}</div>
                <div className="text-xs text-gray-400">
                  {m.measure}{m.default_filters.length ? ` · filters: ${m.default_filters.join(", ")}` : ""} · {m.owner} · reviewed {m.last_reviewed}
                </div>
              </div>
            ))}
          </Section>

          <Section title="Dimensions">
            <table className="w-full text-sm">
              <tbody>
                {active.dimensions.map((d) => (
                  <tr key={d.name} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4 font-mono text-xs">{d.name}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{d.type}{d.grains.length ? ` (${d.grains.join(", ")})` : ""}</td>
                    <td className="py-1.5 text-gray-600">{d.selectable ? d.description : <span className="text-amber-700">Filter only (personally identifiable)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Measures">
            <table className="w-full text-sm">
              <tbody>
                {active.measures.map((m) => (
                  <tr key={m.name} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4 font-mono text-xs">{m.name}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{m.agg === "ratio" ? `${m.numerator} / ${m.denominator}` : m.agg} · {m.unit}</td>
                    <td className="py-1.5 text-gray-600">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {active.filters.length > 0 && (
            <Section title="Named filters">
              {active.filters.map((f) => <div key={f.name} className="text-sm"><span className="font-mono text-xs">{f.name}</span> <span className="text-gray-600">{f.description}</span></div>)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
