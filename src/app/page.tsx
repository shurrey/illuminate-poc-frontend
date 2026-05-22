"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { LiveKPICard } from "@/components/LiveKPICard";
import { useDashboardCards } from "@/hooks/useDashboardCards";
import { WhatChangedFeed } from "@/components/WhatChangedFeed";
import { QuickAccessBar } from "@/components/QuickAccessBar";
import { DataQASearch } from "@/components/DataQASearch";
import { CustomizePanel } from "@/components/CustomizePanel";
import { SlidersHorizontal, GripVertical, X } from "lucide-react";

type WidgetId = "ai" | "kpis" | "feed" | "quickaccess";

const widgetLabels: Record<WidgetId, string> = {
  ai: "Ask About Your Data",
  kpis: "Key Metrics",
  feed: "What Changed",
  quickaccess: "Quick Access",
};

const defaultWidgets: WidgetId[] = ["ai", "kpis", "feed", "quickaccess"];

export default function HomePage() {
  const { visibleWidgets, setVisibleWidgets } = useUser();
  const cardResults = useDashboardCards();
  const [showCustomize, setShowCustomize] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);

  const widgets = visibleWidgets.length > 0 ? visibleWidgets as WidgetId[] : defaultWidgets;

  const toggleWidget = (id: WidgetId) => {
    if (widgets.includes(id)) {
      setVisibleWidgets(widgets.filter((w) => w !== id));
    } else {
      setVisibleWidgets([...widgets, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your institutional analytics at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWidgetConfig(!showWidgetConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showWidgetConfig
                ? "bg-gray-200 text-gray-700"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <GripVertical size={15} />
            Sections
          </button>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
          >
            <SlidersHorizontal size={15} />
            Customize
          </button>
        </div>
      </div>

      {/* Widget section toggle */}
      {showWidgetConfig && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Dashboard Sections</h3>
            <button onClick={() => setShowWidgetConfig(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {defaultWidgets.map((id) => (
              <button
                key={id}
                onClick={() => toggleWidget(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  widgets.includes(id)
                    ? "bg-[#0066FF]/5 border-[#0066FF]/30 text-[#0066FF]"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {widgetLabels[id]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data Q&A */}
      {widgets.includes("ai") && (
        <div className="mb-8">
          <DataQASearch />
        </div>
      )}

      {/* KPI Cards */}
      {widgets.includes("kpis") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cardResults.map((result) => (
            <LiveKPICard key={result.card.id} result={result} />
          ))}
        </div>
      )}

      {/* Two-column layout: Feed + Quick Access */}
      {(widgets.includes("feed") || widgets.includes("quickaccess")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {widgets.includes("feed") && (
            <div className="lg:col-span-2">
              <WhatChangedFeed />
            </div>
          )}
          {widgets.includes("quickaccess") && (
            <div>
              <QuickAccessBar />
            </div>
          )}
        </div>
      )}

      {/* Customize panel (slide-out) */}
      {showCustomize && <CustomizePanel onClose={() => setShowCustomize(false)} />}
    </div>
  );
}
