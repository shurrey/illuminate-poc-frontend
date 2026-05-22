"use client";

import { useCardStore } from "@/context/CardStoreContext";
import { X, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";

export function CustomizePanel({ onClose }: { onClose: () => void }) {
  const { cards, toggleCard, moveCard, removeCard, resetToDefaults } = useCardStore();

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
                <div className="text-xs text-gray-400 truncate">{card.description}</div>
              </div>

              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveCard(card.id, "up")}
                  disabled={idx === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveCard(card.id, "down")}
                  disabled={idx === cards.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Delete (user-created only) */}
              {!card.isBuiltIn && (
                <button
                  onClick={() => removeCard(card.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete card"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
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
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RotateCcw size={13} /> Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
