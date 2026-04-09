"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { CardResult } from "@/hooks/useDashboardCards";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Code2, Info, MessageSquare } from "lucide-react";
import { SqlViewModal, InfoModal } from "./CardModals";

function Sparkline({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  const isUp = current > previous;
  const color = invert
    ? isUp ? "#dc2626" : "#16a34a"
    : isUp ? "#16a34a" : "#dc2626";

  const mid = (previous + current) / 2;
  const data = [
    { v: previous },
    { v: previous + (mid - previous) * 0.3 },
    { v: previous + (mid - previous) * 0.6 },
    { v: mid },
    { v: mid + (current - mid) * 0.4 },
    { v: mid + (current - mid) * 0.7 },
    { v: current },
  ];

  return (
    <div className="h-10 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LiveKPICard({ result }: { result: CardResult }) {
  const { card, value, rawValue, rawPrevious, change, loading, error } = result;
  const router = useRouter();
  const [showSql, setShowSql] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  const isNeutral = change === null || change === 0;

  const trendColor = isNeutral
    ? "text-gray-500"
    : card.invertTrend
    ? isPositive ? "text-red-600" : "text-green-600"
    : isPositive ? "text-green-600" : "text-red-600";

  return (
    <>
      <Link href={card.reportLink || "#"} className="block">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#0066FF]/30 transition-all duration-200 cursor-pointer group">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 group-hover:text-[#0066FF] transition-colors">
              {card.label}
            </p>
            {!loading && !error && change !== null && (
              <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
                {isNeutral ? <Minus size={14} /> : isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {card.format === "percent" || card.changeKey?.includes("pct")
                  ? `${Math.abs(change)}pp`
                  : Math.abs(change).toLocaleString()
                }
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 mb-1">
              <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-50 rounded animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertCircle size={16} />
              <span className="text-xs truncate">{error}</span>
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
              {rawValue !== null && rawPrevious !== null && (
                <Sparkline current={rawValue} previous={rawPrevious} invert={card.invertTrend} />
              )}
            </>
          )}

          <p className="text-xs text-gray-400 mt-1">{card.description}</p>

          {/* Bottom action icons */}
          {!loading && !error && (
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSql(true); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="View SQL"
              >
                <Code2 size={14} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(true); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="About this metric"
              >
                <Info size={14} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/chat?prompt=${encodeURIComponent(card.prompt)}`); }}
                className="text-gray-300 hover:text-[#0066FF] transition-colors p-1.5 rounded hover:bg-gray-50"
                title="Ask about this"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {showSql && <SqlViewModal sql={card.query} title={card.label} onClose={() => setShowSql(false)} />}
      {showInfo && <InfoModal title={card.label} description={card.longDescription} onClose={() => setShowInfo(false)} />}
    </>
  );
}
