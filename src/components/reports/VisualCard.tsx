"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Code2, Info, LayoutDashboard, Loader2 } from "lucide-react";
import { InfoModal, SqlViewModal } from "@/components/CardModals";
import { ContractCalculation } from "@/components/MetricInfo";
import { useReportVisual } from "@/hooks/useReportVisual";
import type { FilterValues, ReportDef, RunResult, VisualDef } from "@/types/reports";
import { BarVisual, KpiVisual, LineVisual, PieVisual, TableVisual } from "./visuals";

const isRun = (r: unknown): r is RunResult => !!r && typeof r === "object" && "rows" in r;

function Body({ visual, result }: { visual: VisualDef; result: RunResult }) {
  switch (visual.type) {
    case "kpi": return <KpiVisual result={result} encode={visual.encode} unit={visual.encode.unit as string | undefined} />;
    case "bar": return <BarVisual result={result} encode={visual.encode} />;
    case "line": return <LineVisual result={result} encode={visual.encode} />;
    case "pie": return <PieVisual result={result} encode={visual.encode} />;
    case "table": return <TableVisual result={result} encode={visual.encode} />;
    default: return <p className="text-sm text-gray-400">This visual type is not available yet.</p>;
  }
}

/** One visual with its title and its Info, View SQL and Pin as card actions. */
export function VisualCard({ report, visual, values }: { report: ReportDef; visual: VisualDef; values: FilterValues }) {
  const { results, error, loading, retry } = useReportVisual(report.id, visual, values);
  const [modal, setModal] = useState<"info" | "sql" | null>(null);
  const runs = Object.values(results ?? {}).filter(isRun);
  const unavailable = Object.values(results ?? {}).find((r) => !isRun(r)) as { unavailable: string } | undefined;
  const ignored = [...new Set(runs.flatMap((r) => r.ignored_filters))]
    .map((id) => report.filters.find((f) => f.id === id)?.label ?? id);
  const pinnable = runs.length === 1 && !visual.transform && runs[0].provenance.governed;
  const wide = visual.type === "table" || visual.type === "line";

  if (visual.type === "text") {
    return (
      <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 md:col-span-2">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{visual.title}</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">{visual.text}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-700">{visual.title}</h3>
        {runs.length > 0 && (
          <div className="flex items-center gap-0.5 text-gray-300">
            <button onClick={() => setModal("info")} title="How this is calculated" className="p-1 rounded hover:text-[#0066FF] hover:bg-gray-50"><Info size={14} /></button>
            <button onClick={() => setModal("sql")} title="View SQL" className="p-1 rounded hover:text-[#0066FF] hover:bg-gray-50"><Code2 size={14} /></button>
            {pinnable && (
              <Link href={`/cards/new?contract=${encodeURIComponent(JSON.stringify(runs[0].contract))}&name=${encodeURIComponent(visual.title)}`}
                title="Pin as card" className="p-1 rounded hover:text-[#0066FF] hover:bg-gray-50"><LayoutDashboard size={14} /></Link>
            )}
          </div>
        )}
      </div>
      <div className="flex-1">
        {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={14} /> <span className="truncate">{error}</span>
            <button onClick={retry} className="text-[#0066FF] hover:underline flex-shrink-0">Retry</button>
          </div>
        )}
        {unavailable && <p className="text-sm text-gray-400">{unavailable.unavailable}</p>}
        {!loading && !error && !unavailable && runs.length > 0 && (
          visual.transform ? <p className="text-sm text-gray-400">Coming soon.</p> : <Body visual={visual} result={runs[0]} />
        )}
      </div>
      {ignored.length > 0 && <p className="text-[11px] text-gray-400 mt-2">Not filtered by {ignored.join(", ")}</p>}
      {modal === "info" && (
        <InfoModal title={visual.title} onClose={() => setModal(null)}>
          <ContractCalculation queries={runs.map((r) => ({ contract: r.contract, provenance: r.provenance }))} />
        </InfoModal>
      )}
      {modal === "sql" && <SqlViewModal title={visual.title} sql={runs.map((r) => r.sql).join("\n\n")} onClose={() => setModal(null)} />}
    </div>
  );
}
