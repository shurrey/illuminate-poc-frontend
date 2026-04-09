"use client";

import { useState } from "react";
import Link from "next/link";
import { mockReports } from "@/data/mockReports";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

export function ReportSidebar({
  currentReportId,
  area,
}: {
  currentReportId: string;
  area: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const siblingReports = mockReports.filter((r) => r.area === area);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center pt-4">
        <button
          onClick={() => setCollapsed(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Reports
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft size={16} />
        </button>
      </div>
      <nav className="py-2">
        {siblingReports.map((report) => (
          <Link
            key={report.id}
            href={`/reporting/${report.id}`}
            className={`block px-3 py-2 text-sm transition-colors ${
              report.id === currentReportId
                ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="mr-2">{report.icon}</span>
            {report.title}
          </Link>
        ))}
      </nav>
    </div>
  );
}
