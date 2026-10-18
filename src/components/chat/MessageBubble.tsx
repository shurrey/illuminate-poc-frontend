"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message, Artifact, ThinkingStep, ChartConfig, TableData } from "@/types/chat";
import { ChartRenderer } from "./ChartRenderer";
import { ProvenanceBar, ResultView } from "./ResultView";
import { ExportButton } from "./ExportButton";
import { SqlModal } from "./SqlModal";
import Link from "next/link";
import { Copy, Check, Brain, ChevronDown, Database, Wrench, AlertCircle, Save } from "lucide-react";
import { useQueryBuilder } from "@/context/QueryBuilderContext";
import { savedQueryFromArtifact } from "@/lib/savedQuery";
import { SaveQueryDialog } from "@/components/queries/SaveQueryDialog";

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (React.isValidElement(children) && (children.props as Record<string, unknown>)?.children) return extractText((children.props as Record<string, unknown>).children as React.ReactNode);
  return "";
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractText(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-4">
      <pre className="p-4 rounded-lg bg-gray-800 text-gray-100 overflow-x-auto text-sm">{children}</pre>
      <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}

function InlineThinking({ steps }: { steps: ThinkingStep[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!steps?.length) return null;
  const toolCount = steps.filter((s) => s.type === "tool_call").length;
  const agent = steps[steps.length - 1]?.agent || "Agent";
  const name = agent.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
        <Brain size={13} className="text-purple-500" />
        <span>{name} reasoning{toolCount > 0 && ` · ${toolCount} tool${toolCount > 1 ? "s" : ""}`}</span>
        <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-2 pl-3 border-l-2 border-purple-200 space-y-1.5 max-h-48 overflow-y-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-xs">
              {step.type === "thinking" ? (
                <div>
                  <div className="font-medium text-purple-600 text-[10px] mb-0.5">{step.agent.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</div>
                  <div className="whitespace-pre-wrap text-gray-600 bg-gray-50 p-1.5 rounded text-[11px] leading-relaxed">{step.content || "Thinking..."}</div>
                </div>
              ) : step.type === "tool_call" ? (
                <div className="flex items-center gap-1.5 text-[#0066FF] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                  <Wrench size={11} />
                  <span className="font-mono">Tool #{step.tool_id}: {step.tool}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Save query" for a table result: its contract when governed, else its SQL and governed parts. */
function SaveResult({ artifact }: { artifact: Artifact }) {
  const { trySaveQuery } = useQueryBuilder();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ saved: string } | { error: string } | null>(null);
  const draft = savedQueryFromArtifact(artifact, { id: "", now: "" });
  if (!draft) return null;

  const save = async (name: string, description: string) => {
    setOpen(false);
    setStatus(null);
    const now = new Date().toISOString();
    const error = await trySaveQuery({ ...draft, id: crypto.randomUUID(), name, description, createdAt: now });
    setStatus(error ? { error } : { saved: name });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-gray-100 text-xs">
      {status && "saved" in status && (
        <span role="status" className="text-emerald-700">Saved <strong>{status.saved}</strong> to <Link href="/queries" className="underline">My Queries</Link>.</span>
      )}
      {status && "error" in status && <span role="alert" className="text-red-700">{status.error}</span>}
      <button onClick={() => setOpen(true)} className="ml-auto flex items-center gap-1 text-[#0066FF] hover:underline">
        <Save size={12} /> Save query
      </button>
      {open && <SaveQueryDialog initialName={draft.name} initialDescription="" onSave={save} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ArtifactRenderer({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case "table":
      return (
        <ResultView title={artifact.title} data={artifact.data as TableData} provenance={artifact.provenance}
          query={artifact.query} toolbar={<SaveResult artifact={artifact} />} />
      );
    case "chart":
      return (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm">
          {artifact.title && <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">{artifact.title}</div>}
          <div className="p-3"><ChartRenderer config={artifact.data as ChartConfig} /></div>
          <ProvenanceBar provenance={artifact.provenance} query={artifact.query} title={artifact.title} />
        </div>
      );
    case "text":
      return (
        <div className="bg-white rounded-lg p-3 shadow-sm">
          {artifact.title && <div className="font-medium text-sm text-gray-700 mb-2">{artifact.title}</div>}
          <div className="text-sm text-gray-600">{artifact.data as string}</div>
        </div>
      );
    case "error":
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700"><AlertCircle size={16} /><span className="font-medium text-sm">Error</span></div>
          <p className="mt-1 text-sm text-red-600">{artifact.data as string}</p>
        </div>
      );
    default:
      return null;
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [sqlOpen, setSqlOpen] = useState(false);

  const text = message.parts.filter((p) => p.type === "text").map((p) => p.content as string).join("\n");
  const displayArtifacts = message.artifacts?.filter((a) => a.type !== "sql") || [];
  const plainSql = message.artifacts?.filter((a) => a.type === "sql") || [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "bg-[#0066FF] text-white rounded-2xl rounded-br-md" : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md"} px-4 py-3`}>
        <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children, className }) => {
                if (className?.startsWith("language-")) return <code className={`${className} text-sm font-mono`}>{children}</code>;
                return <code className={`px-1.5 py-0.5 rounded font-mono text-sm ${isUser ? "bg-blue-700" : "bg-gray-200 text-gray-800"}`}>{children}</code>;
              },
              pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
              table: ({ children }) => <div className="overflow-x-auto my-4 rounded-lg border border-gray-200"><table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table></div>,
              thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
              th: ({ children }) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{children}</th>,
              td: ({ children }) => <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{children}</td>,
              tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {displayArtifacts.length > 0 && (
          <div className="mt-3 space-y-3">
            {displayArtifacts.map((a) => <ArtifactRenderer key={a.id} artifact={a} />)}
            {displayArtifacts.some((a) => a.type === "table" || a.type === "chart") && (
              <div className="pt-2"><ExportButton artifacts={displayArtifacts} /></div>
            )}
          </div>
        )}

        {/* Plain SQL — badge to open modal */}
        {plainSql.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setSqlOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0066FF] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors">
              <Database size={13} />
              View SQL{plainSql.length > 1 ? ` (${plainSql.length} queries)` : ""}
            </button>
          </div>
        )}

        {sqlOpen && plainSql.length > 0 && <SqlModal artifacts={plainSql} onClose={() => setSqlOpen(false)} />}

        <div className={`text-xs mt-2 ${isUser ? "text-blue-200" : "text-gray-400"}`}>{formatTimestamp(message.timestamp)}</div>

        {!isUser && message.thinkingSteps?.length ? <InlineThinking steps={message.thinkingSteps} /> : null}
      </div>
    </div>
  );
}
