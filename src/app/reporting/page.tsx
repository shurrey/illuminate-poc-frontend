"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { mockReports, Report } from "@/data/mockReports";
import { Star, Search } from "lucide-react";

const areaLabels: Record<string, string> = {
  learning: "Learning",
  teaching: "Teaching",
  leading: "Leading",
  "data-qa": "Data Q&A",
  custom: "Custom Reports",
};

function ReportingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { favorites, toggleFavorite, addRecentReport } = useUser();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>(
    searchParams.get("area") || "all"
  );

  const filtered = mockReports.filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesArea = areaFilter === "all" || r.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const areas = ["all", ...new Set(mockReports.map((r) => r.area))];

  const handleReportClick = (report: Report) => {
    addRecentReport(report.id);
    router.push(`/reporting/${report.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Explore analytics reports available for your role
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                areaFilter === area
                  ? "bg-white text-[#0066FF] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {area === "all" ? "All" : areaLabels[area] || area}
            </button>
          ))}
        </div>
      </div>

      {/* Report Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((report) => (
          <div
            key={report.id}
            onClick={() => handleReportClick(report)}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all duration-200 cursor-pointer group relative"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(report.id);
              }}
              className={`absolute top-4 right-4 transition-colors ${
                favorites.includes(report.id)
                  ? "text-amber-500"
                  : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400"
              }`}
            >
              <Star
                size={18}
                fill={
                  favorites.includes(report.id) ? "currentColor" : "none"
                }
              />
            </button>

            <div className="text-3xl mb-3">{report.icon}</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#0066FF] transition-colors pr-8">
              {report.title}
            </h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {report.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {areaLabels[report.area] || report.area}
              </span>
              {report.subArea && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {report.subArea}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Updated {report.lastUpdated}
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No reports found</p>
          <p className="text-sm mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReportingPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">Loading...</div>}>
      <ReportingContent />
    </Suspense>
  );
}
