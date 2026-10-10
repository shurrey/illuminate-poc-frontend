"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ResultTable } from "@/components/ResultTable";
import type { RunResult, VisualDef } from "@/types/reports";

const COLORS = ["#0066FF", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

/** ratio → percent with one decimal; percent → one decimal; other numbers grouped, at most two decimals. */
export function formatValue(value: unknown, unit = ""): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  if (unit === "ratio") return `${(value * 100).toFixed(1)}%`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

type Table = Pick<RunResult, "columns" | "rows">;

/** The value, plus a change badge when the row carries change_pct (period_over_period). */
export function KpiVisual({ result, encode, unit }: { result: Table; encode: VisualDef["encode"]; unit?: string }) {
  const column = String(encode.value ?? result.columns[result.columns.length - 1]);
  const change = result.rows[0]?.change_pct;
  return (
    <div className="flex items-baseline gap-3">
      <p className="text-3xl font-bold text-gray-900">{formatValue(result.rows[0]?.[column], unit)}</p>
      {typeof change === "number" && (
        <span className={`text-sm font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function BarVisual({ result, encode }: { result: Table; encode: VisualDef["encode"] }) {
  const ys = list(encode.y);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={result.rows} layout={encode.horizontal ? "vertical" : "horizontal"}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {encode.horizontal
          ? <><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey={String(encode.x)} width={140} tick={{ fontSize: 11 }} /></>
          : <><XAxis dataKey={String(encode.x)} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /></>}
        <Tooltip />
        {ys.length > 1 && <Legend />}
        {ys.map((y, i) => <Bar key={y} dataKey={y} stackId={encode.stacked ? "s" : undefined} fill={COLORS[i % COLORS.length]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineVisual({ result, encode }: { result: Table; encode: VisualDef["encode"] }) {
  const ys = list(encode.y);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={result.rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={String(encode.x)} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {ys.length > 1 && <Legend />}
        {ys.map((y, i) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PieVisual({ result, encode }: { result: Table; encode: VisualDef["encode"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={result.rows} dataKey={String(encode.value)} nameKey={String(encode.label)} innerRadius={encode.donut ? 55 : 0} outerRadius={95}>
          {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TableVisual({ result, encode }: { result: Table; encode: VisualDef["encode"] }) {
  const columns = list(encode.columns).filter((c) => result.columns.includes(c));
  return <ResultTable columns={columns.length ? columns : result.columns} rows={result.rows} />;
}

/** A grid of x × y cells shaded by value; order from x_order / y_order lists or a numeric x_sort column. */
export function HeatmapVisual({ result, encode }: { result: Table; encode: VisualDef["encode"] }) {
  const x = String(encode.x), y = String(encode.y), value = String(encode.value);
  const ordered = (key: string, order: unknown, sortBy?: string) => {
    const seen = [...new Set(result.rows.map((r) => String(r[key])))];
    if (Array.isArray(order)) return [...order.map(String).filter((o) => seen.includes(o)), ...seen.filter((s) => !order.map(String).includes(s))];
    if (sortBy) {
      const rank = new Map(result.rows.map((r) => [String(r[key]), Number(r[sortBy])]));
      return seen.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    }
    return seen;
  };
  const xs = ordered(x, encode.x_order, encode.x_sort ? String(encode.x_sort) : undefined);
  const ys = ordered(y, encode.y_order);
  const cell = new Map(result.rows.map((r) => [`${r[x]}|${r[y]}`, r[value]]));
  const max = Math.max(0, ...result.rows.map((r) => (typeof r[value] === "number" ? (r[value] as number) : 0)));
  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-separate border-spacing-0.5">
        <thead>
          <tr><th />{xs.map((c) => <th key={c} className="font-normal text-gray-500 px-1 whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody>
          {ys.map((r) => (
            <tr key={r}>
              <th className="font-normal text-gray-500 pr-2 text-right whitespace-nowrap">{r}</th>
              {xs.map((c) => {
                const v = cell.get(`${c}|${r}`);
                const share = typeof v === "number" && max > 0 ? v / max : 0;
                return (
                  <td key={c} title={`${r} ${c}: ${formatValue(v)}`}
                    className="w-8 h-6 rounded-sm" style={{ backgroundColor: `rgba(0, 102, 255, ${0.08 + share * 0.82})` }} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-1">Darker is more; highest {formatValue(max)}.</p>
    </div>
  );
}
