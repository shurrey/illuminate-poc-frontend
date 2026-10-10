import { describe, expect, it } from "vitest";
import { applyTransform } from "./transforms";

const res = (rows: Record<string, unknown>[]) => ({ columns: Object.keys(rows[0] ?? {}), rows });

describe("period_over_period", () => {
  const t = { kind: "period_over_period", value: "current", baseline: "comparison", field: "users" };
  it("gives the value, the baseline and the percentage change", () => {
    const out = applyTransform(t, { current: res([{ users: 120 }]), comparison: res([{ users: 100 }]) });
    expect(out.rows).toEqual([{ value: 120, baseline: 100, change_pct: 20 }]);
    expect(out.words).toBe("% change vs the comparison period");
  });
  it("has no change when the baseline is zero or missing", () => {
    expect(applyTransform(t, { current: res([{ users: 5 }]), comparison: res([{ users: 0 }]) }).rows[0].change_pct).toBeNull();
    expect(applyTransform(t, { current: res([{ users: 5 }]), comparison: res([]) }).rows[0]).toEqual({ value: 5, baseline: null, change_pct: null });
  });
  it("is negative for a fall", () => {
    expect(applyTransform(t, { current: res([{ users: 75 }]), comparison: res([{ users: 100 }]) }).rows[0].change_pct).toBe(-25);
  });
});

describe("percent_of_total", () => {
  it("adds each row's share of the overall total", () => {
    const out = applyTransform({ kind: "percent_of_total", query: "main", field: "n" },
      { main: res([{ k: "a", n: 1 }, { k: "b", n: 3 }]) });
    expect(out.rows.map((r) => r.n_pct)).toEqual([25, 75]);
    expect(out.columns).toEqual(["k", "n", "n_pct"]);
  });
  it("shares within each group, summing to 100 per group", () => {
    const out = applyTransform({ kind: "percent_of_total", query: "main", field: "n", by: "g" },
      { main: res([{ g: "x", n: 1 }, { g: "x", n: 1 }, { g: "y", n: 2 }, { g: "y", n: 6 }]) });
    expect(out.rows.map((r) => r.n_pct)).toEqual([50, 50, 25, 75]);
  });
  it("leaves the share empty when the total is zero", () => {
    expect(applyTransform({ kind: "percent_of_total", query: "main", field: "n" }, { main: res([{ n: 0 }]) }).rows[0].n_pct).toBeNull();
  });
});

describe("unpivot", () => {
  const t = { kind: "unpivot", query: "main", fields: [{ field: "on_time", label: "On time" }, { field: "late", label: "Late" }] };
  it("turns measures into category rows, in the order given", () => {
    const out = applyTransform(t, { main: res([{ late: 2, on_time: 8 }]) });
    expect(out.rows).toEqual([{ category: "On time", value: 8 }, { category: "Late", value: 2 }]);
    expect(out.columns).toEqual(["category", "value"]);
  });
  it("gives empty values when there is no row", () => {
    expect(applyTransform(t, { main: res([]) }).rows).toEqual([{ category: "On time", value: null }, { category: "Late", value: null }]);
  });
  it("describes itself", () => {
    expect(applyTransform(t, { main: res([{ on_time: 1, late: 1 }]) }).words).toBe("Each measure shown as a category");
  });
});

describe("top_n_other", () => {
  const rows = [{ tool: "a", n: 1 }, { tool: "b", n: 5 }, { tool: "c", n: 3 }, { tool: "d", n: 2 }];
  it("keeps the top n by the field and sums the rest into Other", () => {
    const out = applyTransform({ kind: "top_n_other", query: "main", field: "n", label: "tool", n: 2 }, { main: res(rows) });
    expect(out.rows).toEqual([{ tool: "b", n: 5 }, { tool: "c", n: 3 }, { tool: "Other", n: 3 }]);
  });
  it("adds no Other when there are n rows or fewer", () => {
    expect(applyTransform({ kind: "top_n_other", query: "main", field: "n", label: "tool", n: 5 }, { main: res(rows) }).rows).toHaveLength(4);
  });
  it("describes itself", () => {
    expect(applyTransform({ kind: "top_n_other", query: "main", field: "n", label: "tool", n: 2 }, { main: res(rows) }).words)
      .toBe("Top 2 by n, the rest combined as Other");
  });
});

it("rejects an unknown kind", () => {
  expect(() => applyTransform({ kind: "nope" }, {})).toThrow("Unknown transform nope");
});

describe("side_by_side", () => {
  const t = { kind: "side_by_side", queries: { Primary: "current", Comparison: "previous" }, on: "role", field: "sessions" };
  it("merges queries on the key, one column per label, keeping rows found in only one", () => {
    const out = applyTransform(t, {
      current: res([{ role: "Student", sessions: 10 }, { role: "Staff", sessions: 4 }]),
      previous: res([{ role: "Student", sessions: 8 }, { role: "Guest", sessions: 1 }]),
    });
    expect(out.columns).toEqual(["role", "Primary", "Comparison"]);
    expect(out.rows).toEqual([
      { role: "Student", Primary: 10, Comparison: 8 },
      { role: "Staff", Primary: 4, Comparison: null },
      { role: "Guest", Primary: null, Comparison: 1 },
    ]);
  });
});

describe("per_weekday_average", () => {
  const ranged = (rows: Record<string, unknown>[], start: string, end: string) =>
    ({ columns: Object.keys(rows[0] ?? {}), rows, contract: { time_range: { dimension: "slot_date", start, end } } });
  const t = { kind: "per_weekday_average", query: "main", field: "sessions", day: "day_of_week" };
  it("divides each weekday by how many of it fall in the range", () => {
    const out = applyTransform(t, { main: ranged([{ day_of_week: "Mon", sessions: 10 }, { day_of_week: "Thu", sessions: 3 }], "2026-10-01", "2026-10-14") });
    expect(out.rows.map((r) => r.sessions)).toEqual([5, 1.5]);
  });
  it("gives no value for a weekday the range does not contain", () => {
    const out = applyTransform(t, { main: ranged([{ day_of_week: "Mon", sessions: 10 }], "2026-10-01", "2026-10-03") });
    expect(out.rows[0].sessions).toBeNull();
  });
});
