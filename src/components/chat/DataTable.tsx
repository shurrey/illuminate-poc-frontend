"use client";

import { useState, useMemo } from "react";

interface TableData {
  rows: Record<string, unknown>[];
  columns: string[];
}

type SortDirection = "asc" | "desc" | null;

export function DataTable({ data, maxRows = 10 }: { data: TableData; maxRows?: number }) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showAll, setShowAll] = useState(false);

  const columns = data.columns || (data.rows.length > 0 ? Object.keys(data.rows[0]) : []);

  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return data.rows;
    return [...data.rows].sort((a, b) => {
      const aVal = a[sortColumn], bVal = b[sortColumn];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [data.rows, sortColumn, sortDirection]);

  const displayed = showAll ? sortedRows : sortedRows.slice(0, maxRows);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === "desc") { setSortColumn(null); setSortDirection(null); }
      else setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const fmt = (v: unknown) => {
    if (v == null) return "-";
    if (typeof v === "number") return Number.isInteger(v) ? v.toString() : v.toFixed(2);
    return String(v);
  };

  if (data.rows.length === 0) return <div className="text-center py-8 text-gray-500 text-sm">No data available</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col} onClick={() => handleSort(col)} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                <div className="flex items-center gap-1">
                  {col}
                  <span className={`text-xs ${sortColumn === col ? "text-[#0066FF]" : "text-gray-400"}`}>
                    {sortColumn === col ? (sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : "⇅") : "⇅"}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayed.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{fmt(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedRows.length > maxRows && (
        <div className="py-2 px-4 bg-gray-50 border-t border-gray-200">
          <button onClick={() => setShowAll(!showAll)} className="text-sm text-[#0066FF] hover:text-[#0052cc]">
            {showAll ? "Show less" : `Show all ${sortedRows.length} rows`}
          </button>
        </div>
      )}
    </div>
  );
}
