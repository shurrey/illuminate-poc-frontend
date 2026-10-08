"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, FileCode, Loader2, Save, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { useSemanticGeneration } from "@/hooks/useSemanticGeneration";

const mappingPrompt = (sql: string) =>
  "Re-express this SQL as a governed query: search the catalog, then answer it with query_semantic using the closest " +
  "metrics, dimensions and filters. Do not use execute_sql. Then list, as bullets under 'Not mapped', every part of the " +
  "SQL (columns, filters, joins, calculations) that the governed query does not reproduce, and say how its results may " +
  `differ.\n\n\`\`\`sql\n${sql}\n\`\`\``;

export function ImportQuery() {
  const [sql, setSql] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const gen = useSemanticGeneration();
  const { saveQuery } = useQueryBuilder();
  const contract = gen.result.contract;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setSql(String(ev.target?.result ?? "")); setSaved(false); };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!contract || !name.trim()) return;
    const now = new Date().toISOString();
    saveQuery({ id: crypto.randomUUID(), name: name.trim(), description: description.trim(), prompt: "", contract, createdAt: now, lastUsedAt: now });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Paste SQL or upload a file</label>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-[#0066FF] border border-gray-200 rounded-lg">
            <Upload size={13} /> Upload .sql
          </button>
          <input ref={fileRef} type="file" accept=".sql,.txt" onChange={handleFile} className="hidden" />
        </div>
        <textarea value={sql} onChange={(e) => { setSql(e.target.value); setSaved(false); }} rows={10} placeholder="Paste your SQL query here..."
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-none bg-gray-50" />
      </div>

      {sql.trim() && (
        <button onClick={() => { setSaved(false); gen.ask(mappingPrompt(sql.trim())); }} disabled={gen.isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {gen.isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {gen.isGenerating ? gen.status || "Mapping..." : "Map to the semantic layer"}
        </button>
      )}

      {gen.error && <div className="text-sm text-red-600">{gen.error}</div>}
      {gen.answer && !gen.isGenerating && (
        <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{gen.answer}</ReactMarkdown>
        </div>
      )}
      {!gen.isGenerating && gen.answer && !contract && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> Nothing in the semantic layer maps to this query, so it can&apos;t be saved.
        </div>
      )}

      {contract && !gen.isGenerating && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700"><ShieldCheck size={15} /> Governed query</div>
          <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto">{JSON.stringify(contract, null, 2)}</pre>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-none" />
          {saved ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium"><FileCode size={15} /> Saved to My Queries</div>
          ) : (
            <button onClick={handleSave} disabled={!name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg disabled:opacity-50">
              <Save size={15} /> Save to My Queries
            </button>
          )}
        </div>
      )}
    </div>
  );
}
