"use client";

import { useState } from "react";
import { MyQueries } from "@/components/queries/MyQueries";
import { NewQuery } from "@/components/queries/NewQuery";
import { ImportQuery } from "@/components/queries/ImportQuery";
import type { SavedQuery } from "@/types/queryBuilder";
import { Database, Plus, Upload, FolderOpen } from "lucide-react";

type Tab = "my-queries" | "new-query" | "import";

export default function QueriesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("new-query");
  const [loadedQuery, setLoadedQuery] = useState<SavedQuery | null>(null);

  const handleLoadQuery = (query: SavedQuery) => {
    setLoadedQuery(query);
    setActiveTab("new-query");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "new-query", label: "New Query", icon: Plus },
    { id: "my-queries", label: "My Queries", icon: FolderOpen },
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
          <p className="text-gray-500">Build, run, and save SQL queries with AI assistance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id !== "new-query") setLoadedQuery(null); }}
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
          key={loadedQuery?.id || "new"}
          initialSql={loadedQuery?.sql}
          initialPrompt={loadedQuery?.prompt}
          initialName={loadedQuery?.name}
          initialDescription={loadedQuery?.description}
        />
      )}
      {activeTab === "my-queries" && <MyQueries onLoadQuery={handleLoadQuery} />}
      {activeTab === "import" && <ImportQuery />}
    </div>
  );
}
