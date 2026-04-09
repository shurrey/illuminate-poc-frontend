"use client";

import { useState } from "react";
import type { Artifact } from "@/types/chat";
import { Download } from "lucide-react";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportButton({ artifacts }: { artifacts: Artifact[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const exportable = artifacts.filter((a) => a.type === "table" || a.type === "chart");
  if (exportable.length === 0) return null;

  const exportCSV = () => {
    exportable.forEach((a) => {
      if (a.type === "table") {
        const d = a.data as { rows: Record<string, unknown>[]; columns: string[] };
        const cols = d.columns || Object.keys(d.rows[0] || {});
        const header = cols.join(",");
        const rows = d.rows.map((r) => cols.map((c) => {
          const v = r[c];
          if (typeof v === "string" && (v.includes(",") || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
          return v;
        }).join(","));
        downloadFile([header, ...rows].join("\n"), `${a.title || "data"}.csv`, "text/csv");
      }
    });
    setIsOpen(false);
  };

  const copyClipboard = async () => {
    const t = exportable.find((a) => a.type === "table");
    if (t) {
      const d = t.data as { rows: Record<string, unknown>[]; columns: string[] };
      const cols = d.columns || Object.keys(d.rows[0] || {});
      const tsv = [cols.join("\t"), ...d.rows.map((r) => cols.map((c) => r[c] ?? "").join("\t"))].join("\n");
      await navigator.clipboard.writeText(tsv);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
        <Download size={14} /> Export
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
            <button onClick={exportCSV} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">Download CSV</button>
            <button onClick={copyClipboard} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">Copy to Clipboard</button>
          </div>
        </>
      )}
    </div>
  );
}
