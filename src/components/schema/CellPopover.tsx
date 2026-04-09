"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

function isJsonLike(s: string): boolean {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function syntaxHighlight(json: string): string {
  const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span style="color:#6366f1">$1</span>:')
    .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span style="color:#10b981">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#f59e0b">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#ef4444">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:#94a3b8;font-style:italic">$1</span>');
}

export function CellPopover({
  value,
  columnName,
  onClose,
  anchorRect,
}: {
  value: string;
  columnName: string;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const isJson = isJsonLike(value);
  let formatted: string;
  let typeLabel: string;

  if (isJson) {
    try {
      const parsed = JSON.parse(value);
      formatted = syntaxHighlight(JSON.stringify(parsed, null, 2));
      typeLabel = "JSON";
    } catch {
      formatted = value;
      typeLabel = "Text";
    }
  } else {
    formatted = value;
    typeLabel = "Text";
  }

  // Position: prefer below anchor, clamp to viewport
  let top = anchorRect.bottom + 4;
  let left = anchorRect.left;
  if (top + 300 > window.innerHeight) {
    top = Math.max(8, anchorRect.top - 300 - 4);
  }
  if (left + 400 > window.innerWidth) {
    left = Math.max(8, window.innerWidth - 408);
  }

  return (
    <div
      ref={popRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-md max-h-80 flex flex-col"
      style={{ top, left, animation: "popIn 0.12s ease-out" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 font-mono">{columnName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            typeLabel === "JSON" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}>
            {typeLabel}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X size={14} />
        </button>
      </div>
      <div className="overflow-auto p-3 flex-1">
        {isJson ? (
          <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />
        ) : (
          <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{formatted}</pre>
        )}
      </div>
    </div>
  );
}
