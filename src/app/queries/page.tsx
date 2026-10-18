"use client";

import { useState } from "react";
import { MyQueries } from "@/components/queries/MyQueries";
import { NewQuery } from "@/components/queries/NewQuery";
import { ImportQuery } from "@/components/queries/ImportQuery";
import { SqlQuery } from "@/components/queries/SqlQuery";
import { SharedWithMe } from "@/components/sharing/SharedWithMe";
import { isSqlQuery, type SavedQuery } from "@/types/queryBuilder";
import { Code2, Database, Plus, Upload, FolderOpen, Users } from "lucide-react";

type Tab = "my-queries" | "shared" | "new-query" | "sql" | "import";

export default function QueriesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("new-query");
  const [loadedQuery, setLoadedQuery] = useState<SavedQuery | null>(null);

  const handleLoadQuery = (query: SavedQuery) => {
    setLoadedQuery(query);
    setActiveTab(isSqlQuery(query) ? "sql" : "new-query");
  };
  const governed = loadedQuery && !isSqlQuery(loadedQuery) ? loadedQuery : null;
  const sql = loadedQuery && isSqlQuery(loadedQuery) ? loadedQuery : undefined;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "new-query", label: "New Query", icon: Plus },
    { id: "sql", label: "SQL", icon: Code2 },
    { id: "my-queries", label: "My Queries", icon: FolderOpen },
    { id: "shared", label: "Shared with me", icon: Users },
    { id: "import", label: "Import", icon: Upload },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={20} className="text-[#0066FF]" />
            <h1 className="text-2xl font-bold text-gray-900">Query Builder</h1>
          </div>
          <p className="text-gray-500">Build, run, and save governed queries over the semantic layer, or write your own SQL</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { if (id !== activeTab) setLoadedQuery(null); setActiveTab(id); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-[#0066FF] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "new-query" && (
        <NewQuery
          key={governed?.id || "new"}
          initialContract={governed?.contract}
          initialPrompt={governed?.prompt}
          initialName={governed?.name}
          initialDescription={governed?.description}
          onViewSaved={() => { setLoadedQuery(null); setActiveTab("my-queries"); }}
        />
      )}
      {activeTab === "sql" && (
        <SqlQuery key={sql?.id || "new"} initial={sql}
          onViewSaved={() => { setLoadedQuery(null); setActiveTab("my-queries"); }} />
      )}
      {activeTab === "my-queries" && <MyQueries onLoadQuery={handleLoadQuery} />}
      {activeTab === "shared" && <SharedWithMe kind="query" />}
      {activeTab === "import" && <ImportQuery onViewSaved={() => setActiveTab("my-queries")} />}
    </div>
  );
}
