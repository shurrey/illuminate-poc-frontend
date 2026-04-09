"use client";

import { useEffect, useRef } from "react";
import type { ThinkingStep } from "@/types/chat";
import { Brain, ChevronRight, Wrench, Loader2 } from "lucide-react";

export function ThinkingBubble({ steps, isExpanded, onToggle, isLoading }: {
  steps: ThinkingStep[];
  isExpanded: boolean;
  onToggle: () => void;
  isLoading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, isExpanded]);

  if (steps.length === 0) return null;

  const toolCount = steps.filter((s) => s.type === "tool_call").length;
  const agent = steps[steps.length - 1]?.agent || "Agent";
  const name = agent.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="mb-3">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors">
        <ChevronRight size={16} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        <Brain size={16} className="text-purple-500" />
        <span className="flex-1 text-left">
          {isLoading ? (
            <span className="flex items-center gap-2">
              {name} Agent is thinking
              <span className="inline-flex"><span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span><span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span><span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span></span>
            </span>
          ) : (
            <span>{name} Agent reasoning{toolCount > 0 && ` (${toolCount} tool${toolCount > 1 ? "s" : ""} used)`}</span>
          )}
        </span>
        {isLoading && <Loader2 size={16} className="animate-spin text-purple-500" />}
      </button>
      {isExpanded && (
        <div ref={scrollRef} className="mt-2 pl-4 border-l-2 border-purple-200 space-y-2 max-h-64 overflow-y-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-sm">
              {step.type === "thinking" ? (
                <div>
                  <div className="font-medium text-purple-600 text-xs mb-1">{step.agent.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Agent</div>
                  <div className="whitespace-pre-wrap text-gray-700 bg-white p-2 rounded border border-gray-100">{step.content || "Thinking..."}</div>
                </div>
              ) : step.type === "tool_call" ? (
                <div className="flex items-center gap-2 text-[#0066FF] bg-blue-50 px-2 py-1 rounded">
                  <Wrench size={14} />
                  <span className="font-mono text-xs">Tool #{step.tool_id}: {step.tool}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
