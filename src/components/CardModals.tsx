"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { format as formatSql } from "sql-formatter";
import { X, Copy, Check } from "lucide-react";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const onKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function SqlViewModal({ sql, title, onClose }: { sql: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    try {
      return formatSql(sql, { language: "snowflake", keywordCase: "upper", indentStyle: "standard" });
    } catch { return sql; }
  }, [sql]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell title={`SQL — ${title}`} onClose={onClose}>
      <div className="relative group">
        <pre className="p-4 rounded-lg bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap">
          <code>{formatted}</code>
        </pre>
        <button onClick={handleCopy} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors">
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy SQL</>}
        </button>
      </div>
    </ModalShell>
  );
}

export function InfoModal({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  return (
    <ModalShell title={`About — ${title}`} onClose={onClose}>
      <div className="prose prose-sm max-w-none">
        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
      </div>
    </ModalShell>
  );
}
