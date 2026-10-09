"use client";

import { useState } from "react";
import type { FilterValues, ReportDef } from "@/types/reports";
import { VisualCard } from "./VisualCard";

/** A report's pages as tabs, each a grid of visuals. */
export function ReportView({ report, values }: { report: ReportDef; values: FilterValues }) {
  const [page, setPage] = useState(0);
  const current = report.pages[page] ?? report.pages[0];
  return (
    <div className="space-y-4">
      {report.pages.length > 1 && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
          {report.pages.map((p, i) => (
            <button key={p.title} onClick={() => setPage(i)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${i === page ? "bg-white text-[#0066FF] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {p.title}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {current.visuals.map((v) => <VisualCard key={v.id} report={report} visual={v} values={values} />)}
      </div>
    </div>
  );
}
