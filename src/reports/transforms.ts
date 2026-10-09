/** Client transforms over a visual's query results; each also says in words what it did, for Info. */
type Rows = Record<string, unknown>[];
export type Results = Record<string, { columns: string[]; rows: Rows }>;
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

const KINDS: Record<string, (t: TransformSpec, r: Results) => Transformed> = {
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
