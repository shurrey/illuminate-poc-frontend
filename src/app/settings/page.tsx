"use client";

import Link from "next/link";
import { Settings, User, Bell, Shield, Globe, Layers } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const sections = [
  { icon: User, title: "Profile", description: "Manage your account details, display name, and avatar" },
  { icon: Bell, title: "Notifications", description: "Configure alert preferences, email digests, and notification channels" },
  { icon: Shield, title: "Privacy & Security", description: "Two-factor authentication, session management, and data privacy controls" },
  { icon: Globe, title: "Language & Region", description: "Set your preferred language, timezone, and date format" },
];

// ── Settings Page ─────────────────────────────────────────

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-500 mt-1">
          Manage your account preferences and application configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0066FF]/10 transition-colors">
                  <Icon size={20} className="text-gray-500 group-hover:text-[#0066FF] transition-colors" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#0066FF] transition-colors">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin/definitions"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all cursor-pointer group block"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0066FF]/10 transition-colors">
                <Layers size={20} className="text-gray-500 group-hover:text-[#0066FF] transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#0066FF] transition-colors">
                  Metric Definitions
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Override Blackboard&apos;s canonical metric definitions with
                  your institution&apos;s own — retention windows, FTE divisor,
                  completion-rate filters. Edits go live immediately.
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
