"use client";

import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { describeQuery, type CalculationLine, type QueryDescription } from "@/lib/describeQuery";
import type { Provenance, QueryContract } from "@/types/semantic";

function Line({ line }: { line: CalculationLine }) {
  return (
    <li className="text-sm text-gray-700">
      <span className="font-medium">{line.label}</span>{line.detail && <span className="text-gray-500"> — {line.detail}</span>}
      {line.code && <code className="block mt-0.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-800 whitespace-pre-wrap">{line.code}</code>}
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</h4>
      {children}
    </div>
  );
}

/** How each number was calculated: definition, calculation, dataset, filters, transform and overrides. */
export function MetricInfo({ descriptions }: { descriptions: QueryDescription[] }) {
  if (descriptions.length === 0) return <p className="text-sm text-gray-500">No definition is available for this number.</p>;
  return (
    <div className="space-y-6">
      {descriptions.map((d, i) => (
        <div key={i} className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{d.title}</h3>
            {d.description && <p className="text-sm text-gray-600 mt-0.5">{d.description}</p>}
          </div>
          <Section title="Calculation"><ul className="space-y-1.5">{d.calculation.map((l, j) => <Line key={j} line={l} />)}</ul></Section>
          <Section title="Data">
            <p className="text-sm text-gray-700"><span className="font-medium">{d.dataset.name}</span> <span className="text-gray-500">({d.dataset.grain})</span></p>
            {d.dataset.description && <p className="text-xs text-gray-500 mt-0.5">{d.dataset.description}</p>}
          </Section>
          {d.filters.length > 0 && (
            <Section title="Filters"><ul className="space-y-1.5">{d.filters.map((l, j) => <Line key={j} line={l} />)}</ul></Section>
          )}
          {d.transform && <Section title="Then"><p className="text-sm text-gray-700">{d.transform}</p></Section>}
          {d.overrides.length > 0 && (
            <Section title="Your institution's overrides">
              <ul className="space-y-1">{d.overrides.map((o) => <li key={o} className="text-xs font-mono text-amber-800">{o}</li>)}</ul>
            </Section>
          )}
        </div>
      ))}
    </div>
  );
}

/** Info for the queries that produced a number; loads the catalog only when rendered (Info open). */
export function ContractCalculation({ queries, transform }: {
  queries: { contract: QueryContract; provenance?: Provenance | null }[];
  transform?: string;
}) {
  const { catalog } = useSemanticCatalog();
  if (!catalog) return <p className="text-sm text-gray-400">Loading…</p>;
  return <MetricInfo descriptions={queries.flatMap((q) => describeQuery(q.contract, catalog, q.provenance ?? undefined, transform))} />;
}
