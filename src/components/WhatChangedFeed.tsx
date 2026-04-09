"use client";

import { mockChanges } from "@/data/mockChanges";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
    badge: "bg-blue-100 text-blue-700",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
    badge: "bg-amber-100 text-amber-700",
  },
  alert: {
    icon: AlertCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-500",
    badge: "bg-red-100 text-red-700",
  },
};

function timeAgo(timestamp: string): string {
  const now = new Date("2026-03-18T10:00:00Z");
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function WhatChangedFeed() {
  const changes = mockChanges
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          What Changed
        </h2>
        <p className="text-sm text-gray-500">Notable changes since your last visit</p>
      </div>

      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {changes.map((change) => {
          const config = severityConfig[change.severity];
          const Icon = config.icon;

          const inner = (
            <div
              className={`px-5 py-4 hover:bg-gray-50 transition-colors ${
                change.link ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}
                >
                  <Icon size={16} className={config.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {change.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}
                    >
                      {change.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {change.description}
                  </p>
                  {change.metric && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">
                        {change.metric.label}:
                      </span>
                      <span className="text-gray-500">
                        {change.metric.oldValue}
                      </span>
                      <span className="text-gray-400">&rarr;</span>
                      <span
                        className={`font-semibold ${
                          change.metric.change > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {change.metric.newValue}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {timeAgo(change.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );

          return change.link ? (
            <Link key={change.id} href={change.link}>
              {inner}
            </Link>
          ) : (
            <div key={change.id}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
