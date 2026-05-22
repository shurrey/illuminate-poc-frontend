"use client";

import { useState, useRef } from "react";
import { useQueryGeneration } from "@/hooks/useQueryGeneration";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { format as formatSql } from "sql-formatter";
import { Upload, FileCode, Sparkles, Loader2, Save } from "lucide-react";

export function ImportQuery() {
  const [sql, setSql] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { generateSql, isGenerating, description: aiDescription, statusMessage, reset } = useQueryGeneration();
  const { saveQuery } = useQueryBuilder();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setSql(content);
      setAnalyzed(false);
      setSaved(false);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!sql.trim()) return;
    setAnalyzed(false);
    setSaved(false);
    reset();
    await generateSql(`Analyze this SQL query. Provide a short descriptive name and a 2-3 sentence description of what it does and what data it returns. Do NOT generate new SQL — just analyze the existing query:\n\n\`\`\`sql\n${sql}\n\`\`\``);
    setAnalyzed(true);
  };

  // Extract name from AI description (first line or sentence)
  const suggestedName = aiDescription?.split(/[.\n]/)[0]?.replace(/^["'*#]+|["'*#]+$/g, "").trim().slice(0, 60) || "Imported Query";
  const suggestedDesc = aiDescription || "";

  if (!analyzed && !name) {
    // Use suggestions when they arrive
    if (aiDescription && !name) setName(suggestedName);
    if (aiDescription && !description) setDescription(suggestedDesc);
  }

  const handleSave = () => {
    if (!sql.trim() || !name.trim()) return;
    saveQuery({
      id: crypto.randomUUID(),
      name: name || suggestedName,
      prompt: "",
      sql: sql.trim(),
      description: description || suggestedDesc,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
    setSaved(true);
  };

  const formatted = (() => {
    try { return formatSql(sql, { language: "snowflake", keywordCase: "upper" }); }
    catch { return sql; }
  })();

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Paste SQL or upload a file</label>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-[#0066FF] border border-gray-200 rounded-lg hover:border-[#0066FF]/30 transition-colors"
          >
            <Upload size={13} /> Upload .sql
          </button>
          <input ref={fileRef} type="file" accept=".sql,.txt" onChange={handleFileUpload} className="hidden" />
        </div>
        <textarea
          value={sql}
          onChange={(e) => { setSql(e.target.value); setAnalyzed(false); setSaved(false); }}
          rows={10}
          placeholder="Paste your SQL query here..."
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none bg-gray-50"
        />
      </div>

      {/* Analyze button */}
      {sql.trim() && !analyzed && (
        <button
          onClick={handleAnalyze}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {isGenerating ? (statusMessage || "Analyzing...") : "Analyze with AI"}
        </button>
      )}

      {/* Analysis results */}
      {analyzed && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">AI Analysis</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={name || suggestedName}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={description || suggestedDesc}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Formatted SQL preview */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">SQL Preview</h4>
            <pre className="p-4 rounded-lg bg-gray-800 text-gray-100 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-60">
              <code>{formatted}</code>
            </pre>
          </div>

          {/* Save */}
          {!saved ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={15} /> Save to My Queries
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <FileCode size={15} /> Saved successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
}
