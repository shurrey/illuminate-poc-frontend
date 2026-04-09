"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationCenter } from "./NotificationCenter";
import { LanguageSelector } from "./LanguageSelector";
import { NavDrawer } from "./NavDrawer";
import {
  Home,
  BarChart3,
  BookOpen,
  MessageSquare,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { SnowflakeLogo } from "./SnowflakeLogo";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chat", label: "Ask Illuminate", icon: MessageSquare },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
  { href: "/developer", label: "Data Dictionary", icon: BookOpen },
];

export function Navigation() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <header className="bg-[#1a1a2e] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Hamburger + Logo + Nav */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>

              <Link href="/" className="flex items-center">
                <BrandLogo height={22} variant="light" />
              </Link>

              <nav className="hidden md:flex items-center gap-0.5 ml-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Snowflake + utilities */}
            <div className="flex items-center gap-2">
              <a
                href="https://app.snowflake.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                title="Launch Snowflake"
              >
                <SnowflakeLogo height={20} className="text-white" />
              </a>

              <div className="w-px h-5 bg-white/20 mx-1" />

              <NotificationCenter />
              <LanguageSelector />
              <Link
                href="/settings"
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={17} />
              </Link>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Sign out"
                title="Sign Out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
