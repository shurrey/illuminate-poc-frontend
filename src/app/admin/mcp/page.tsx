"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMcpSetting, getMcpSetup, setMcpSetting, type McpSetup } from "@/services/adminApi";
import { orderedSnippets } from "@/lib/mcpSetup";

export default function McpAdminPage() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Bot size={28} className="mx-auto text-gray-400 mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">AI clients (MCP)</h1>
        <p className="text-gray-500 mt-2">Managing AI client access requires administrator access. Ask your Illuminate administrator to add you.</p>
      </div>
    );
  }
  return <McpSettings />;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* clipboard unavailable */ });
  };
  return (
    <button onClick={copy} aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded px-2 py-1">
      {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}
    </button>
  );
}

function McpSettings() {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<McpSetup | null>(null);

  useEffect(() => {
    getMcpSetting().then((r) => setEnabled(r.enabled)).catch((e) => setError(e instanceof Error ? e.message : "Could not load the setting"));
    getMcpSetup().then(setSetup).catch((e) => setError(e instanceof Error ? e.message : "Could not load the setup details"));
  }, []);

  const toggle = () => {
    setSaving(true);
    setError(null);
    setMcpSetting(!enabled)
      .then((r) => setEnabled(r.enabled))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not save the setting"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">AI clients (MCP)</h1>

      <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
        <div>
          <div className="font-medium text-gray-900">Allow AI clients</div>
          <p className="text-sm text-gray-500 mt-1">
            People sign in as themselves in a browser window. What they can see and do through an AI client is exactly what they can see and do here, following their role.
          </p>
        </div>
        <button role="switch" aria-checked={enabled} aria-label="Allow AI clients" disabled={saving} onClick={toggle}
          className={`relative shrink-0 ml-4 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-blue-600" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {setup === null ? null : !setup.deployed ? (
        <p className="text-sm text-gray-500">The MCP server isn&apos;t deployed yet</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">MCP URL</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all">{setup.url}</code>
              <CopyButton text={setup.url} label="MCP URL" />
            </div>
          </section>
          {orderedSnippets(setup.snippets).map((s) => (
            <section key={s.key}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900">{s.label}</h2>
                <CopyButton text={s.copyText} label={s.label} />
              </div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">{s.text}</pre>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
