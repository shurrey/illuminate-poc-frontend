"use client";

import { useState } from "react";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import type { SavedQuery } from "@/types/queryBuilder";
import { Search, Play, Trash2, Copy, Clock, FileCode } from "lucide-react";

interface MyQueriesProps {
  onLoadQuery: (query: SavedQuery) => void;
}

export function MyQueries({ onLoadQuery }: MyQueriesProps) {
  const { queries, deleteQuery } = useQueryBuilder();
  const [search, setSearch] = useState("");

  const filtered = queries.filter(
    (q) =>
      !search ||
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase()) ||
      q.sql.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileCode size={40} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved queries yet</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Create a new query from a natural language prompt or import an existing SQL query to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved queries..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        />
      </div>

      {/* Query list */}
      <div className="space-y-2">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0066FF]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{q.name}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{q.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={11} />{formatDate(q.lastUsedAt || q.createdAt)}</span>
                  {q.prompt && <span className="truncate max-w-[200px]">Prompt: {q.prompt}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onLoadQuery(q)}
                  className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                  title="Open in workbench"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => handleCopy(q.sql)}
                  className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-gray-50 rounded transition-colors"
                  title="Copy SQL"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => deleteQuery(q.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
