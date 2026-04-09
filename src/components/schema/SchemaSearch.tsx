"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Database, Table2, Columns } from "lucide-react";

type SearchResult = { type: "schema" | "table" | "column"; schema: string; table?: string; column?: string; match: string };

const TYPE_CONFIG = {
  schema: { icon: Database, bg: "bg-[#0066FF]", label: "Domain" },
  table: { icon: Table2, bg: "bg-emerald-500", label: "Table" },
  column: { icon: Columns, bg: "bg-amber-500", label: "Column" },
} as const;

export function SchemaSearch({
  searchFn,
  onSelectSchema,
  onSelectTable,
}: {
  searchFn: (query: string) => SearchResult[];
  onSelectSchema: (schema: string) => void;
  onSelectTable: (schema: string, table: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length >= 2 ? searchFn(query) : [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setShowResults(false);
    setQuery("");
    if (r.type === "schema") onSelectSchema(r.schema);
    else onSelectTable(r.schema, r.table!);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="Search domains, tables, columns..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-72 overflow-y-auto z-30">
          {results.map((r, i) => {
            const cfg = TYPE_CONFIG[r.type];
            return (
              <button key={i} onClick={() => handleSelect(r)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold text-white ${cfg.bg}`}>{cfg.label}</span>
                <span className="font-medium text-gray-900 font-mono text-xs">{r.match}</span>
                <span className="text-xs text-gray-400 truncate">
                  {r.type === "column" ? `${r.schema}.${r.table}` : r.type === "table" ? r.schema : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {showResults && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg px-3 py-4 text-center text-sm text-gray-400 z-30">No matches</div>
      )}
    </div>
  );
}
