/** Client transforms over a visual's query results; each also says in words what it did, for Info. */
type Rows = Record<string, unknown>[];
/** A query's result; `contract` is the merged contract the server ran, when available. */
export type Results = Record<string, { columns: string[]; rows: Rows; contract?: { time_range?: { start?: string; end?: string } | null } }>;
export interface Transformed { columns: string[]; rows: Rows; words: string }
export type TransformSpec = { kind: string; [key: string]: unknown };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round = (v: number) => Math.round(v * 100) / 100;

function periodOverPeriod(t: TransformSpec, results: Results): Transformed {
  const field = String(t.field);
  const value = num(results[String(t.value)]?.rows[0]?.[field]);
  const baseline = num(results[String(t.baseline)]?.rows[0]?.[field]);
  const change = value !== null && baseline ? round(((value - baseline) / baseline) * 100) : null;
  return { columns: ["value", "baseline", "change_pct"], rows: [{ value, baseline, change_pct: change }], words: "% change vs the comparison period" };
}

function percentOfTotal(t: TransformSpec, results: Results): Transformed {
  const { columns, rows } = results[String(t.query)];
  const field = String(t.field);
  const by = t.by ? String(t.by) : null;
  const totals = new Map<unknown, number>();
  for (const r of rows) totals.set(by ? r[by] : null, (totals.get(by ? r[by] : null) ?? 0) + (num(r[field]) ?? 0));
  const out = rows.map((r) => {
    const total = totals.get(by ? r[by] : null) ?? 0;
    const v = num(r[field]);
    return { ...r, [`${field}_pct`]: total && v !== null ? round((v / total) * 100) : null };
  });
  return { columns: [...columns, `${field}_pct`], rows: out, words: by ? `Share of the total within each ${by}` : "Share of the total" };
}

function unpivot(t: TransformSpec, results: Results): Transformed {
  const row = results[String(t.query)]?.rows[0] ?? {};
  const fields = t.fields as { field: string; label: string }[];
  return {
    columns: ["category", "value"],
    rows: fields.map(({ field, label }) => ({ category: label, value: row[field] ?? null })),
    words: "Each measure shown as a category",
  };
}

function topNOther(t: TransformSpec, results: Results): Transformed {
  const { columns, rows } = results[String(t.query)];
  const field = String(t.field), label = String(t.label), n = Number(t.n);
  const sorted = [...rows].sort((a, b) => (num(b[field]) ?? 0) - (num(a[field]) ?? 0));
  const rest = sorted.slice(n);
  const out = rest.length === 0 ? sorted
    : [...sorted.slice(0, n), { [label]: "Other", [field]: rest.reduce((s, r) => s + (num(r[field]) ?? 0), 0) }];
  return { columns, rows: out, words: `Top ${n} by ${field}, the rest combined as Other` };
}

function sideBySide(t: TransformSpec, results: Results): Transformed {
  const on = String(t.on), field = String(t.field);
  const labels = Object.entries(t.queries as Record<string, string>);
  const merged = new Map<unknown, Record<string, unknown>>();
  for (const [label, query] of labels) {
    for (const row of results[query]?.rows ?? []) {
      const key = row[on];
      if (!merged.has(key)) merged.set(key, { [on]: key, ...Object.fromEntries(labels.map(([l]) => [l, null])) });
      merged.get(key)![label] = row[field] ?? null;
    }
  }
  return { columns: [on, ...labels.map(([l]) => l)], rows: [...merged.values()], words: `${labels.map(([l]) => l).join(" vs ")}, side by side` };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** How many of each weekday (Sun..Sat) fall in [start, end], inclusive. */
function weekdayCounts(start: string, end: string): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(WEEKDAYS.map((d) => [d, 0]));
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    counts[WEEKDAYS[d.getUTCDay()]]++;
  }
  return counts;
}

function perWeekdayAverage(t: TransformSpec, results: Results): Transformed {
  const result = results[String(t.query)];
  const field = String(t.field), day = String(t.day);
  const range = result?.contract?.time_range;
  // A days query (days with data per weekday) is the divisor when given; otherwise calendar days in the range.
  const counts = t.days_query
    ? Object.fromEntries((results[String(t.days_query)]?.rows ?? []).map((r) => [String(r[day]).slice(0, 3), num(r.days) ?? 0]))
    : range?.start && range?.end ? weekdayCounts(range.start, range.end) : null;
  const rows = (result?.rows ?? []).map((r) => {
    const n = counts?.[String(r[day]).slice(0, 3)] ?? 0;
    const v = num(r[field]);
    return { ...r, [field]: n && v !== null ? round(v / n) : null };
  });
  return { columns: result?.columns ?? [], rows, words: t.days_query ? "Average per day with data on that weekday" : "Average per day of that weekday in the date range" };
}

function averageBy(t: TransformSpec, results: Results): Transformed {
  const field = String(t.field), by = (t.by as string[]).map(String);
  const groups = new Map<string, { key: Record<string, unknown>; sum: number; n: number }>();
  for (const r of results[String(t.query)]?.rows ?? []) {
    const id = JSON.stringify(by.map((b) => r[b]));
    const g = groups.get(id) ?? { key: Object.fromEntries(by.map((b) => [b, r[b]])), sum: 0, n: 0 };
    const v = num(r[field]);
    if (v !== null) { g.sum += v; g.n++; }
    groups.set(id, g);
  }
  return {
    columns: [...by, field],
    rows: [...groups.values()].map((g) => ({ ...g.key, [field]: g.n ? round(g.sum / g.n) : null })),
    words: `Average of ${field} per ${by.join(" and ")}`,
  };
}

function partOfWhole(t: TransformSpec, results: Results): Transformed {
  const field = String(t.field);
  const [partLabel, restLabel] = (t.labels as string[]).map(String);
  const whole = num(results[String(t.whole)]?.rows[0]?.[field]) ?? 0;
  const part = num(results[String(t.part)]?.rows[0]?.[field]) ?? 0;
  return {
    columns: ["category", "value"],
    rows: [{ category: partLabel, value: part }, { category: restLabel, value: Math.max(whole - part, 0) }],
    words: `${partLabel} out of the total, and the rest`,
  };
}

function join(t: TransformSpec, results: Results): Transformed {
  const on = (t.on as string[]).map(String);
  const names = (t.queries as string[]).map(String);
  const ratios = Object.entries((t.ratios ?? {}) as Record<string, [string, string]>);
  const differences = Object.entries((t.differences ?? {}) as Record<string, [string, string]>);
  // `as` renames a query's columns before merging, so two queries can return the same measure.
  const renames = (t.as ?? {}) as Record<string, Record<string, string>>;
  const renamed = (n: string, c: string) => renames[n]?.[c] ?? c;
  const columns: string[] = [...on];
  for (const n of names) for (const c of results[n]?.columns ?? []) if (!columns.includes(renamed(n, c))) columns.push(renamed(n, c));
  const merged = new Map<string, Record<string, unknown>>();
  for (const n of names) {
    for (const r of results[n]?.rows ?? []) {
      const key = JSON.stringify(on.map((c) => r[c]));
      const row = Object.fromEntries(Object.entries(r).map(([c, v]) => [renamed(n, c), v]));
      merged.set(key, { ...(merged.get(key) ?? {}), ...row });
    }
  }
  const rows = [...merged.values()].map((r) => {
    const full: Record<string, unknown> = Object.fromEntries(columns.map((c) => [c, r[c] ?? null]));
    for (const [name, [a, b]] of differences) {
      const x = num(full[a]);
      full[name] = x === null ? null : x - (num(full[b]) ?? 0);
    }
    for (const [name, [numerator, denominator]] of ratios) {
      const a = num(full[numerator]), b = num(full[denominator]);
      full[name] = a !== null && b ? a / b : null;
    }
    return full;
  });
  return { columns: [...columns, ...differences.map(([n]) => n), ...ratios.map(([n]) => n)], rows, words: `Combined on ${on.join(", ")}` };
}

const KINDS: Record<string, (t: TransformSpec, r: Results) => Transformed> = {
  join,
  average_by: averageBy,
  part_of_whole: partOfWhole,
  side_by_side: sideBySide,
  per_weekday_average: perWeekdayAverage,
  period_over_period: periodOverPeriod,
  percent_of_total: percentOfTotal,
  unpivot,
  top_n_other: topNOther,
};

export function applyTransform(t: TransformSpec, results: Results): Transformed {
  const fn = KINDS[t.kind];
  if (!fn) throw new Error(`Unknown transform ${t.kind}`);
  return fn(t, results);
}
