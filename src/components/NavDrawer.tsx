"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  BarChart3,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SnowflakeLogo } from "./SnowflakeLogo";
import { BrandLogo } from "./BrandLogo";

interface NavSection {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
  external?: boolean;
}

const navSections: NavSection[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Ask Illuminate", href: "/chat", icon: MessageSquare },
  {
    label: "Reporting",
    href: "/reporting",
    icon: BarChart3,
    children: [
      { label: "Learning", href: "/reporting?area=learning" },
      { label: "Teaching", href: "/reporting?area=teaching" },
      { label: "Leading", href: "/reporting?area=leading" },
      { label: "Data Q&A", href: "/reporting?area=data-qa" },
      { label: "Custom Reports", href: "/reporting?area=custom" },
    ],
  },
  { label: "Data Dictionary", href: "/developer", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
  {
    label: "Privacy & Security",
    href: "/privacy",
    icon: ShieldCheck,
  },
  {
    label: "Need help?",
    href: "https://help.anthology.com/illuminate",
    icon: HelpCircle,
    external: true,
  },
];

export function NavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 left-0 w-72 bg-[#1a1a2e] shadow-xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
          <BrandLogo height={20} variant="light" />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Snowflake CTA */}
        <div className="px-4 py-3 border-b border-white/10">
          <a
            href="https://app.snowflake.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
          >
            <SnowflakeLogo height={22} className="text-white" />
          </a>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section) => {
            const Icon = section.icon;
            const active = isActive(section.href);
            const isExpanded = expanded[section.label];
            const hasChildren = section.children && section.children.length > 0;

            return (
              <div key={section.label}>
                <div className="flex items-center">
                  {section.external ? (
                    <a
                      href={section.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white w-full transition-colors"
                      onClick={onClose}
                    >
                      <Icon size={18} />
                      {section.label}
                      <ExternalLink size={14} className="ml-auto text-gray-500" />
                    </a>
                  ) : (
                    <>
                      <Link
                        href={section.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors flex-1 ${
                          active
                            ? "bg-white/15 text-white"
                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={18} />
                        {section.label}
                      </Link>
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(section.label)}
                          className="px-3 py-2.5 text-gray-500 hover:text-white transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {hasChildren && isExpanded && (
                  <div className="ml-10 border-l border-white/10">
                    {section.children!.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        onClick={onClose}
                        className="block px-4 py-2 text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
