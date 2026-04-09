"use client";

import { useState, useCallback } from "react";
import { useDictionary } from "@/hooks/useDictionary";
import { DomainSidebar } from "@/components/schema/DomainSidebar";
import { EntityGrid } from "@/components/schema/EntityGrid";
import { EntityDetail } from "@/components/schema/EntityDetail";
import { SchemaSearch } from "@/components/schema/SchemaSearch";
import { BookOpen, Loader2 } from "lucide-react";

export default function DeveloperPage() {
  const {
    catalog, relationships, isLoading, error,
    getSchemas, getSchema, getRelationships, searchCatalog,
    loadPreview, getPreview, isPreviewLoading,
  } = useDictionary();

  const [activeSchema, setActiveSchema] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  // Auto-select first schema once loaded
  const schemas = getSchemas();
  const effectiveSchema = activeSchema || schemas[0] || null;

  const handleSelectSchema = useCallback((schema: string) => {
    setActiveSchema(schema);
    setActiveTable(null);
  }, []);

  const handleSelectTable = useCallback((table: string) => {
    setActiveTable(table);
  }, []);

  const handleNavigateFromSearch = useCallback((schema: string, table: string) => {
    setActiveSchema(schema);
    setActiveTable(table);
  }, []);

  const handleNavigateRelationship = useCallback((schema: string, table: string) => {
    setActiveSchema(schema);
    setActiveTable(table);
  }, []);

  const handleLoadPreview = useCallback(() => {
    if (effectiveSchema && activeTable) {
      loadPreview(effectiveSchema, activeTable);
    }
  }, [effectiveSchema, activeTable, loadPreview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-gray-400">
        <Loader2 size={28} className="animate-spin mr-3" />
        <span>Loading data dictionary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700 font-medium mb-2">Failed to load data dictionary</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const currentSchema = effectiveSchema ? getSchema(effectiveSchema) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[#0066FF]" />
          <h1 className="text-lg font-semibold text-gray-900">Data Dictionary</h1>
        </div>
        <div className="flex-1 max-w-md">
          <SchemaSearch
            searchFn={searchCatalog}
            onSelectSchema={handleSelectSchema}
            onSelectTable={handleNavigateFromSearch}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <DomainSidebar
          schemas={schemas}
          catalog={catalog}
          activeSchema={effectiveSchema}
          onSelect={handleSelectSchema}
        />
        {effectiveSchema && currentSchema && (
          <EntityGrid
            schemaId={effectiveSchema}
            schema={currentSchema}
            relationships={relationships}
            activeTable={activeTable}
            onSelect={handleSelectTable}
          />
        )}
      </div>

      {/* Detail panel */}
      {activeTable && effectiveSchema && currentSchema && (
        <EntityDetail
          schemaId={effectiveSchema}
          tableName={activeTable}
          schema={currentSchema}
          relationships={getRelationships(effectiveSchema, activeTable)}
          preview={getPreview(effectiveSchema, activeTable)}
          previewLoading={isPreviewLoading(effectiveSchema, activeTable)}
          onLoadPreview={handleLoadPreview}
          onClose={() => setActiveTable(null)}
          onNavigate={handleNavigateRelationship}
        />
      )}
    </div>
  );
}
