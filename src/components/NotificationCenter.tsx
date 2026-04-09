"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { mockNotifications } from "@/data/mockAlerts";
import { Bell, AlertCircle, Lightbulb, RefreshCw, Check } from "lucide-react";
import Link from "next/link";

const categoryConfig = {
  alert: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  insight: { icon: Lightbulb, color: "text-purple-500", bg: "bg-purple-50" },
  update: { icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-50" },
};

const severityColors = {
  info: "border-l-blue-400",
  warning: "border-l-amber-400",
  critical: "border-l-red-500",
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

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "alert" | "insight" | "update">("all");
  const { readNotifications, markNotificationRead, markAllNotificationsRead } = useUser();
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = mockNotifications.filter(
    (n) => !n.read && !readNotifications.includes(n.id)
  ).length;

  const filtered =
    filter === "all"
      ? mockNotifications
      : mockNotifications.filter((n) => n.category === filter);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-white transition-colors p-1"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 font-medium"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="flex border-b border-gray-100 px-2 bg-gray-50">
            {(["all", "alert", "insight", "update"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  filter === tab
                    ? "text-[#0066FF] border-b-2 border-[#0066FF]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "all" ? "All" : tab + "s"}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {filtered.map((notification) => {
              const config = categoryConfig[notification.category];
              const Icon = config.icon;
              const isRead =
                notification.read || readNotifications.includes(notification.id);

              const content = (
                <div
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-3 ${
                    notification.severity
                      ? severityColors[notification.severity]
                      : "border-l-transparent"
                  } ${!isRead ? "bg-blue-50/30" : ""}`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center`}
                    >
                      <Icon size={14} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm truncate ${
                            !isRead
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#0066FF] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );

              return notification.link ? (
                <Link key={notification.id} href={notification.link} onClick={() => setIsOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
