"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThinkingBubble } from "@/components/chat/ThinkingBubble";
import type { QuerySuggestion } from "@/types/chat";
import { Send, X, ArrowDown, Sparkles, MessageSquare, Trash2 } from "lucide-react";

const SUGGESTIONS: QuerySuggestion[] = [
  { id: "1", text: "What's the average GPA for Fall 2024?", category: "grades" },
  { id: "2", text: "Show enrollment trends by department", category: "students" },
  { id: "3", text: "Which courses have the highest dropout rates?", category: "courses" },
  { id: "4", text: "Identify at-risk students based on engagement", category: "engagement" },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    messages, isLoading, error, sendMessage, cancelQuery, clearMessages,
    statusMessage, thinkingSteps, isThinkingExpanded, toggleThinkingExpanded,
  } = useChat();

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);
  const processedPromptRef = useRef(false);

  // Handle prompt from URL params (from KPI card or DataQASearch)
  useEffect(() => {
    if (processedPromptRef.current) return;
    const promptParam = searchParams.get("prompt");
    const autoSubmit = searchParams.get("autoSubmit");

    if (promptParam) {
      processedPromptRef.current = true;
      // Clean the URL to avoid re-triggering on refresh
      router.replace("/chat", { scroll: false });

      if (autoSubmit === "true") {
        // Auto-submit: send immediately (from DataQASearch or other AI boxes)
        sendMessage(promptParam);
      } else {
        // Pre-fill only: let user review/edit (from KPI card chat icon)
        setInput(promptParam);
        // Focus the textarea so they can edit or just hit Enter
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [searchParams, router, sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 100);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Ask Illuminate</h1>
          <p className="text-sm text-gray-500">Natural language questions about your institutional data</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-[#0066FF]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Ask Illuminate</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Ask natural language questions about your educational data.
              I can query Snowflake, analyze trends, and generate visualizations.
            </p>
            <div className="w-full max-w-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.id} onClick={() => sendMessage(s.text)} className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-sm transition-colors hover:border-[#0066FF]/30">
                    <Sparkles size={14} className="inline mr-2 text-[#0066FF]" />{s.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {showScroll && (
        <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })} className="absolute bottom-32 right-8 bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50">
          <ArrowDown size={18} className="text-gray-600" />
        </button>
      )}

      {/* Thinking bubble */}
      {thinkingSteps.length > 0 && (
        <div className="px-4 sm:px-6 py-2">
          <ThinkingBubble steps={thinkingSteps} isExpanded={isThinkingExpanded} onToggle={toggleThinkingExpanded} isLoading={isLoading} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && thinkingSteps.length === 0 && (
        <div className="px-4 sm:px-6 py-2 flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-[#0066FF] rounded-full animate-bounce" />
          </div>
          <span className="text-sm text-gray-500">{statusMessage || "Processing..."}</span>
        </div>
      )}

      {/* Cancel button */}
      {isLoading && (
        <div className="px-4 sm:px-6 py-2 flex justify-center">
          <button onClick={cancelQuery} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
            <X size={16} /> Stop generating
          </button>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="px-4 sm:px-6 py-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={isLoading}
              placeholder="Ask about your educational data..."
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:border-[#0066FF] focus:outline-none focus:ring-1 focus:ring-[#0066FF] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
