"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FilterBar } from "@/components/reports/FilterBar";
import { ReportView } from "@/components/reports/ReportView";
import { useSemanticCatalog } from "@/hooks/useSemanticCatalog";
import { getReport } from "@/services/reportsApi";
import type { FilterValues, ReportDef } from "@/types/reports";

// Filter values live in the URL (f.<id>=a&f.<id>=b, or f.<id>=start..end) so a filtered view can be shared.
function valuesFromUrl(report: ReportDef, params: URLSearchParams): FilterValues | null {
  const found: FilterValues = {};
  for (const f of report.filters) {
    const raw = params.getAll(`f.${f.id}`);
    if (raw.length === 0) continue;
    if (f.control === "date_range") {
      const [start, end] = raw[0].split("..");
      found[f.id] = { ...(start ? { start } : {}), ...(end ? { end } : {}) };
    } else {
      found[f.id] = raw;
    }
  }
  return Object.keys(found).length ? found : null;
}

function urlFor(id: string, report: ReportDef, values: FilterValues): string {
  const params = new URLSearchParams({ id });
  for (const f of report.filters) {
    const v = values[f.id];
    if (!v) continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(`f.${f.id}`, String(x)));
    else if (v.start || v.end) params.set(`f.${f.id}`, `${v.start ?? ""}..${v.end ?? ""}`);
  }
  return `/reporting/report?${params.toString()}`;
}

function ReportPage() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const { catalog } = useSemanticCatalog();
  const [loaded, setLoaded] = useState<{ id: string; report: ReportDef; defaults: FilterValues } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getReport(id)
      .then((r) => { if (live) { setLoaded({ id, ...r }); setError(null); } })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load the report"));
    return () => { live = false; };
  }, [id]);

  const report = loaded?.id === id ? loaded.report : null;
  const values = useMemo(() => (report ? valuesFromUrl(report, params) ?? loaded!.defaults : {}), [report, params, loaded]);
  const setValues = useCallback((next: FilterValues) => {
    if (report) router.replace(urlFor(id, report, next), { scroll: false });
  }, [report, id, router]);

  if (error) return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-sm text-red-600">{error}</div>;
  if (!report) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div>
        <Link href="/reporting" className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0066FF] mb-2"><ChevronLeft size={14} /> Reports</Link>
        <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
        <p className="text-gray-500 mt-1">{report.description}</p>
      </div>
      <FilterBar filters={report.filters} catalog={catalog} values={values}
        onChange={(fid, v) => setValues({ ...values, [fid]: v })} onReset={() => setValues(loaded!.defaults)} />
      <ReportView report={report} values={values} />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><ReportPage /></Suspense>;
}
