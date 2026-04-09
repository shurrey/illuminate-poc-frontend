"use client";

import { Globe } from "lucide-react";

export function LanguageSelector() {
  return (
    <button
      className="text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="Language"
      title="English (United States)"
    >
      <Globe size={18} />
    </button>
  );
}
