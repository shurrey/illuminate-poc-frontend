"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { suggestedQuestions } from "@/data/mockReports";
import { Search, Sparkles, ArrowRight } from "lucide-react";

export function DataQASearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    router.push(`/chat?prompt=${encodeURIComponent(q.trim())}&autoSubmit=true`);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="bg-gradient-to-r from-[#0066FF] to-[#0044cc] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} />
          <h2 className="text-lg font-semibold">Ask About Your Data</h2>
        </div>
        <p className="text-blue-100 text-sm mb-4">
          Get instant answers using natural language — powered by AI
        </p>

        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(query); }}
            placeholder="Ask a question about your data..."
            className="w-full pl-11 pr-12 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {query && (
            <button
              onClick={() => handleSubmit(query)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0066FF] text-white p-1.5 rounded-md hover:bg-[#0052cc]"
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {showSuggestions && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-blue-200 mb-2">Suggested questions:</p>
            {suggestedQuestions
              .filter((q) => !query || q.toLowerCase().includes(query.toLowerCase()))
              .map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-50 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Search size={12} className="text-blue-300 flex-shrink-0" />
                  {q}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
