/** ratio → percent with one decimal; percent → one decimal; other numbers grouped, at most two decimals. */
export function formatValue(value: unknown, unit = ""): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  if (unit === "ratio") return `${(value * 100).toFixed(1)}%`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Every cell as display text, using `units[column]` where given. */
export function formatCells(rows: Record<string, unknown>[], units: Record<string, string> = {}): Record<string, string>[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([c, v]) => [c, formatValue(v, units[c])])));
}
