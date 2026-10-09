"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CardResult } from "@/hooks/useDashboardCards";
import { AlertCircle, Code2, Info, MessageSquare, ShieldCheck } from "lucide-react";
import { SqlViewModal, InfoModal } from "./CardModals";
import { MetricInfo } from "./MetricInfo";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { describeQuery } from "@/lib/describeQuery";
import type { Provenance, QueryContract } from "@/types/semantic";

export function LiveKPICard({ result }: { result: CardResult }) {
  const { card, value, sql, provenance, loading, error } = result;
  const router = useRouter();
  const [showSql, setShowSql] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const definedBy = [...(provenance?.metrics ?? []), ...(provenance?.measures ?? []),
    ...(provenance?.overlays ?? []).map((o) => `your override ${o}`)].join(", ");

  return (
    <>
      <Link href={card.reportLink || "#"} className="block">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all duration-200 cursor-pointer group">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 group-hover:text-[#0066FF] transition-colors">
              {card.label}
            </p>
            {provenance?.governed && (
              <span title={`Governed definition: ${definedBy}`} className="text-emerald-600">
                <ShieldCheck size={14} />
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 mb-1">
              <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertCircle size={16} />
              <span className="text-xs truncate">{error}</span>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); result.retry(); }}
                className="text-xs text-[#0066FF] hover:underline flex-shrink-0">Retry</button>
            </div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">{card.description}</p>

          {/* Bottom action icons */}
          {!loading && !error && (
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSql(true); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="View SQL"
              >
                <Code2 size={14} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(true); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="About this metric"
              >
                <Info size={14} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/chat?prompt=${encodeURIComponent(card.prompt)}`); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="Ask about this"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {showSql && sql && <SqlViewModal sql={sql} title={card.label} onClose={() => setShowSql(false)} />}
      {showInfo && (
        <InfoModal title={card.label} intro={card.longDescription} onClose={() => setShowInfo(false)}>
          <CardCalculation contract={card.contract} provenance={provenance} />
        </InfoModal>
      )}
    </>
  );
}

/** Mounted only while Info is open, so cards don't each load the catalog. */
function CardCalculation({ contract, provenance }: { contract: QueryContract; provenance: Provenance | null }) {
  const { catalog } = useSemanticCatalog();
  if (!catalog) return <p className="text-sm text-gray-400">Loading…</p>;
  return <MetricInfo descriptions={describeQuery(contract, catalog, provenance ?? undefined)} />;
}
