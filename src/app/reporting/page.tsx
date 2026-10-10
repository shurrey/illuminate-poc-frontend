"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Star } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { reportHref, useReportList } from "@/hooks/useReportList";
import type { ReportArea } from "@/types/reports";

const AREAS: { id: ReportArea | "all"; label: string }[] = [
  { id: "all", label: "All" }, { id: "learning", label: "Learning" }, { id: "teaching", label: "Teaching" }, { id: "leading", label: "Leading" },
];

function ReportingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { favorites, toggleFavorite, addRecentReport } = useUser();
  const { reports, error } = useReportList();
  const [search, setSearch] = useState("");
  const requested = searchParams.get("area");
  const [area, setArea] = useState<string>(AREAS.some((a) => a.id === requested) ? requested! : "all");

  const shown = (reports ?? []).filter((r) => (area === "all" || r.area === area)
    && (!search || `${r.title} ${r.description}`.toLowerCase().includes(search.toLowerCase())));

  const open = (id: string) => {
    addRecentReport(id);
    router.push(reportHref(id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Standard reports on learning, teaching and leading</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {AREAS.map((a) => (
            <button key={a.id} onClick={() => setArea(a.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${area === a.id ? "bg-white text-[#0066FF] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!reports && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>}
      {reports && shown.length === 0 && <p className="text-sm text-gray-400 py-12 text-center">No reports match.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((r) => (
          <div key={r.id} onClick={() => open(r.id)}
            className="relative bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all cursor-pointer group">
            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(r.id); }} aria-label="Favorite"
              className={`absolute top-4 right-4 ${favorites.includes(r.id) ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}>
              <Star size={16} fill={favorites.includes(r.id) ? "currentColor" : "none"} />
            </button>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{AREAS.find((a) => a.id === r.area)?.label}</p>
            <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#0066FF] transition-colors pr-8">{r.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportingPage() {
  return <Suspense fallback={null}><ReportingContent /></Suspense>;
}
