"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, ShieldCheck, ShieldHalf } from "lucide-react";
import { DataTable } from "./DataTable";
import { governanceOf } from "@/lib/provenance";
import type { TableData } from "@/types/chat";
import type { Provenance, QueryContract } from "@/types/semantic";

/** Where a result came from: the governed definitions behind it, or why it is ungoverned. */
export function ProvenanceBar({ provenance: p, query, title }: {
  provenance?: Provenance;
  /** Only a governed contract can be pinned as a card. */
  query?: QueryContract;
  title?: string;
}) {
  if (!p) return null;
  const level = governanceOf(p);
  if (level === "none") {
    return (
      <div className="flex items-start gap-1.5 px-3 py-1.5 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-800">
        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>Ungoverned</strong>{p.reason ? `: ${p.reason}` : ""}
          {p.rows === "modified" && ((p.metrics?.length ?? 0) + (p.measures?.length ?? 0)) > 0 && ". Rows come from outside the governed definitions"}
        </span>
      </div>
    );
  }
  const refs = [...(p.metrics ?? []), ...(p.measures ?? [])];
  const partial = level === "partial";
  const fromSql = p.governance !== undefined;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[11px]">
      {partial ? <ShieldHalf size={12} className="text-amber-600" /> : <ShieldCheck size={12} className="text-emerald-600" />}
      {fromSql && <strong className={partial ? "text-amber-800" : "text-emerald-700"}>{partial ? "Partly governed" : "Governed"}</strong>}
      {refs.map((r) => <span key={r} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono">{r}</span>)}
      {(p.overlays ?? []).map((o) => (
        <span key={o} title="Your institution's override of the canonical definition"
          className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-mono">your override {o}</span>
      ))}
      {fromSql && p.rows === "modified" && <span className="text-gray-500">Rows come from outside the governed definitions</span>}
      {partial && p.reason && <span className="text-gray-500">{p.reason}</span>}
      {query && (
        <Link href={`/cards/new?contract=${encodeURIComponent(JSON.stringify(query))}&name=${encodeURIComponent(title ?? "")}`}
          className="ml-auto flex items-center gap-1 text-[#0066FF] hover:underline">
          <LayoutDashboard size={12} /> Pin as card
        </Link>
      )}
    </div>
  );
}

/** A result table with its column markers and provenance bar, as chat shows it. */
export function ResultView({ title, data, provenance, query, truncated, toolbar }: {
  title?: string;
  data: TableData;
  provenance?: Provenance;
  query?: QueryContract;
  truncated?: boolean;
  /** A row of controls between the title and the table. */
  toolbar?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      {title && <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">{title}</div>}
      {toolbar}
      <DataTable data={data} provenance={provenance} />
      {truncated && (
        <div className="px-3 py-1.5 border-t border-gray-100 text-[11px] text-amber-800">
          The warehouse returned only the first rows, so this result is cut short.
        </div>
      )}
      <ProvenanceBar provenance={provenance} query={query} title={title} />
    </div>
  );
}
