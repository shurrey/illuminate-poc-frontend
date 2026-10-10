"use client";

import Link from "next/link";
import { Clock, Sparkles, Star } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { reportHref, useReportList } from "@/hooks/useReportList";
import type { ReportSummary } from "@/types/reports";

function ReportLink({ report, favorite, onToggle }: { report: ReportSummary; favorite: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onToggle} aria-label="Favorite" className={`flex-shrink-0 ${favorite ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}>
        <Star size={14} fill={favorite ? "currentColor" : "none"} />
      </button>
      <Link href={reportHref(report.id)} className="text-sm text-gray-700 hover:text-blue-600 truncate">{report.title}</Link>
    </div>
  );
}

function Section({ icon, title, empty, items, favorites, toggle }: {
  icon: React.ReactNode; title: string; empty: string; items: ReportSummary[]; favorites: string[]; toggle: (id: string) => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-sm font-semibold text-gray-700">{title}</h3></div>
      {items.length === 0 ? <p className="text-sm text-gray-400 ml-5">{empty}</p>
        : <div className="space-y-1">{items.map((r) => <ReportLink key={r.id} report={r} favorite={favorites.includes(r.id)} onToggle={() => toggle(r.id)} />)}</div>}
    </div>
  );
}

export function QuickAccessBar() {
  const { favorites, toggleFavorite, recentReports } = useUser();
  const all = useReportList().reports ?? [];
  const byId = new Map(all.map((r) => [r.id, r]));
  const recent = recentReports.map((id) => byId.get(id)).filter((r): r is ReportSummary => !!r);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
      <Section icon={<Star size={14} className="text-amber-500" fill="currentColor" />} title="Favorites" empty="Star reports to add them here"
        items={all.filter((r) => favorites.includes(r.id))} favorites={favorites} toggle={toggleFavorite} />
      <Section icon={<Clock size={14} className="text-gray-400" />} title="Recent" empty="Reports you view will appear here"
        items={recent} favorites={favorites} toggle={toggleFavorite} />
      <Section icon={<Sparkles size={14} className="text-purple-500" />} title="Suggested for You" empty="No other reports yet"
        items={all.filter((r) => !favorites.includes(r.id)).slice(0, 3)} favorites={favorites} toggle={toggleFavorite} />
    </div>
  );
}
