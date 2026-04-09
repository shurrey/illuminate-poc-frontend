"use client";

import { useUser } from "@/context/UserContext";
import { mockReports } from "@/data/mockReports";
import Link from "next/link";
import { Star, Clock, Sparkles } from "lucide-react";

export function QuickAccessBar() {
  const { favorites, toggleFavorite, recentReports } = useUser();

  const recentReportObjects = recentReports
    .map((id) => mockReports.find((r) => r.id === id))
    .filter(Boolean);

  const favoriteReportObjects = mockReports.filter((r) =>
    favorites.includes(r.id)
  );

  const suggestedReports = mockReports
    .filter((r) => !favorites.includes(r.id))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>

      {/* Favorites */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-amber-500" fill="currentColor" />
          <h3 className="text-sm font-semibold text-gray-700">Favorites</h3>
        </div>
        {favoriteReportObjects.length === 0 ? (
          <p className="text-sm text-gray-400 ml-5">
            Star reports to add them here
          </p>
        ) : (
          <div className="space-y-1">
            {favoriteReportObjects.map((report) => (
              <div key={report!.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleFavorite(report!.id)}
                  className="text-amber-500 hover:text-amber-600 flex-shrink-0"
                >
                  <Star size={14} fill="currentColor" />
                </button>
                <Link
                  href={`/reporting/${report!.id}`}
                  className="text-sm text-gray-700 hover:text-blue-600 truncate"
                >
                  {report!.icon} {report!.title}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Recent</h3>
        </div>
        {recentReportObjects.length === 0 ? (
          <p className="text-sm text-gray-400 ml-5">
            Reports you view will appear here
          </p>
        ) : (
          <div className="space-y-1">
            {recentReportObjects.map((report) => (
              <div key={report!.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(report!.id)}
                  className={`flex-shrink-0 ${
                    favorites.includes(report!.id)
                      ? "text-amber-500"
                      : "text-gray-300 hover:text-amber-400"
                  }`}
                >
                  <Star
                    size={14}
                    fill={
                      favorites.includes(report!.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
                <Link
                  href={`/reporting/${report!.id}`}
                  className="text-sm text-gray-700 hover:text-blue-600 truncate"
                >
                  {report!.icon} {report!.title}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Suggested for You
          </h3>
        </div>
        <div className="space-y-1">
          {suggestedReports.map((report) => (
            <div key={report.id} className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(report.id)}
                className={`flex-shrink-0 ${
                  favorites.includes(report.id)
                    ? "text-amber-500"
                    : "text-gray-300 hover:text-amber-400"
                }`}
              >
                <Star
                  size={14}
                  fill={
                    favorites.includes(report.id) ? "currentColor" : "none"
                  }
                />
              </button>
              <Link
                href={`/reporting/${report.id}`}
                className="text-sm text-gray-700 hover:text-blue-600 truncate"
              >
                {report.icon} {report.title}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
