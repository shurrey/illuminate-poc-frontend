"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCardStore } from "@/context/CardStoreContext";
import type { DashboardCard } from "@/data/dashboardCards";
import { canShareCard, isPinnedShared, shareStatus } from "@/lib/sharing";
import { ShareDialog } from "@/components/sharing/ShareDialog";
import { SharedWithMe } from "@/components/sharing/SharedWithMe";
import { X, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Plus, RotateCcw, Share2, MinusCircle } from "lucide-react";
import Link from "next/link";

export function CustomizePanel({ onClose }: { onClose: () => void }) {
  const { cards, loading, error, clearError, toggleCard, moveCard, removeCard, resetToDefaults, reload } = useCardStore();
  const { tenant } = useAuth();
  const [sharing, setSharing] = useState<DashboardCard | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Customize Dashboard</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <span className="flex-1">{error}</span>
              <button onClick={clearError} aria-label="Dismiss" className="text-red-400 hover:text-red-600"><X size={14} /></button>
            </div>
          )}
          {loading && <div className="text-xs text-gray-400">Loading your cards...</div>}
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                card.enabled !== false ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              {/* Toggle visibility */}
              <button
                onClick={() => toggleCard(card.id)}
                disabled={loading}
                className={`p-1 rounded transition-colors ${
                  card.enabled !== false ? "text-[#0066FF] hover:bg-blue-50" : "text-gray-400 hover:bg-gray-100"
                }`}
                title={card.enabled !== false ? "Hide card" : "Show card"}
              >
                {card.enabled !== false ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>

              {/* Card info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{card.label}</div>
                <div className="text-xs text-gray-400 truncate">
                  {isPinnedShared(card) ? `Shared by ${card.owner?.name ?? "a colleague"}` : card.description}
                </div>
                {shareStatus(card.shared, tenant?.name) && (
                  <div className="text-[11px] text-[#0066FF] truncate">{shareStatus(card.shared, tenant?.name)}</div>
                )}
              </div>

              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveCard(card.id, "up")}
                  disabled={loading || idx === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveCard(card.id, "down")}
                  disabled={loading || idx === cards.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {canShareCard(card) && (
                <button
                  onClick={() => setSharing(card)}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors"
                  title="Share card"
                >
                  <Share2 size={13} />
                </button>
              )}

              {isPinnedShared(card) ? (
                <button
                  onClick={() => removeCard(card.id)}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove from my home"
                >
                  <MinusCircle size={13} />
                </button>
              ) : !card.isBuiltIn && (
                <button
                  onClick={() => removeCard(card.id)}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete card"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          <div className="pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shared with me</h3>
            <SharedWithMe kind="card" />
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <Link
            href="/cards/new"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} /> Create New Card
          </Link>
          <button
            onClick={resetToDefaults}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RotateCcw size={13} /> Reset to Defaults
          </button>
        </div>
      </div>
      {sharing && (
        <ShareDialog kind="card" itemId={sharing.id} itemName={sharing.label}
          onClose={() => setSharing(null)} onChanged={() => void reload()} />
      )}
    </div>
  );
}
