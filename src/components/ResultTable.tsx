"use client";

import { useCallback, useState } from "react";
import { CellPopover } from "@/components/schema/CellPopover";

/** Query results in the Data Dictionary's preview style; long or JSON values open in a popover. */
export function ResultTable({ columns, rows, columnTitles = {} }: {
  columns: string[];
  rows: Record<string, unknown>[];
  /** Header tooltips by column; the column name when absent. */
  columnTitles?: Record<string, string>;
}) {
  const [popover, setPopover] = useState<{ value: string; column: string; rect: DOMRect } | null>(null);
  const handleCellClick = useCallback((value: string, column: string, e: React.MouseEvent<HTMLTableCellElement>) => {
    if (isExpandable(value)) setPopover({ value, column, rect: e.currentTarget.getBoundingClientRect() });
  }, []);

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-auto max-h-[60vh]">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col} title={columnTitles[col] ?? col}
                  className="px-3 py-2 text-left font-medium text-gray-500 uppercase whitespace-nowrap cursor-help border-b-2 border-transparent hover:border-[#0066FF]/30 hover:text-[#0066FF] transition-colors">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const val = row[col];
                  if (val === null || val === undefined) return <td key={col} className="px-3 py-2 text-gray-300 italic">null</td>;
                  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
                  return (
                    <td key={col} onClick={(e) => handleCellClick(str, col, e)}
                      className={`px-3 py-2 whitespace-nowrap max-w-[200px] truncate ${
                        isExpandable(str) ? "cursor-pointer text-[#0066FF] hover:underline" : "text-gray-700"
                      }`}>
                      {str}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {popover && <CellPopover value={popover.value} columnName={popover.column} anchorRect={popover.rect} onClose={() => setPopover(null)} />}
    </>
  );
}

function isExpandable(value: string): boolean {
  return value.length > 30 || value.startsWith("{") || value.startsWith("[");
}
