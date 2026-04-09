"use client";

import { HelpCircle } from "lucide-react";

export function HelpButton() {
  return (
    <a
      href="https://help.anthology.com/illuminate"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
      aria-label="Help"
    >
      <HelpCircle size={22} />
    </a>
  );
}
