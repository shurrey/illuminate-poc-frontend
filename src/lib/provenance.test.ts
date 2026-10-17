import { describe, expect, it } from "vitest";
import { cardBlockedReason, columnMark, governanceOf, summarizeContract } from "./provenance";
import type { Provenance } from "@/types/semantic";

const partial: Provenance = {
  governed: false, governance: "partial", rows: "modified", reason: "joined to a raw table",
  columns: {
    COURSE_ID: { governed: true, definition: "active_courses" },
    NOTE: { governed: false, reason: "Computed in the outer query" },
  },
};

describe("governanceOf", () => {
  it("reads the explicit level", () => {
    expect(governanceOf(partial)).toBe("partial");
    expect(governanceOf({ governed: false, governance: "none" })).toBe("none");
    expect(governanceOf({ governed: true, governance: "full" })).toBe("full");
  });
  it("falls back to the boolean for query_semantic results", () => {
    expect(governanceOf({ governed: true })).toBe("full");
    expect(governanceOf({ governed: false })).toBe("none");
  });
});

describe("columnMark", () => {
  it("marks governed columns with their definition, case-insensitively", () => {
    expect(columnMark(partial, "course_id")).toEqual({ kind: "governed", tooltip: "Governed: active_courses" });
  });
  it("marks ungoverned columns with the reason", () => {
    expect(columnMark(partial, "Note")).toEqual({ kind: "ungoverned", tooltip: "Ungoverned: Computed in the outer query" });
  });
  it("handles missing definition or reason", () => {
    const p: Provenance = { governed: false, columns: { A: { governed: true }, B: { governed: false } } };
    expect(columnMark(p, "A")?.tooltip).toBe("Governed");
    expect(columnMark(p, "B")?.tooltip).toBe("Ungoverned");
  });
  it("returns null when there is no column provenance or the column is unknown", () => {
    expect(columnMark({ governed: true }, "A")).toBeNull();
    expect(columnMark(undefined, "A")).toBeNull();
    expect(columnMark(partial, "OTHER")).toBeNull();
  });
});

describe("cardBlockedReason", () => {
  it("allows a result that has a query contract", () => {
    expect(cardBlockedReason({ governed: true }, { metrics: ["m"] })).toBeNull();
  });
  it("blocks partly governed results", () => {
    expect(cardBlockedReason(partial, undefined)).toMatch(/partly governed/i);
  });
  it("blocks fully governed SQL results that have no contract", () => {
    expect(cardBlockedReason({ governed: true, governance: "full" }, undefined)).toMatch(/written as SQL/);
  });
  it("blocks ungoverned results", () => {
    expect(cardBlockedReason({ governed: false, governance: "none" }, undefined)).toMatch(/No governed metric answers this/);
  });
  it("is null when there is no provenance", () => {
    expect(cardBlockedReason(undefined, undefined)).toBeNull();
  });
});

describe("summarizeContract", () => {
  it("lists metrics, dimensions, filters, range and limit", () => {
    const lines = summarizeContract({
      metrics: ["active_users"], measures: ["avg_grade"], dimensions: ["course_name"],
      filters: [{ dimension: "term", op: "eq", values: ["Fall"] }, { dimension: "x", op: "between", values: [1, 5] }],
      time_range: { dimension: "date", start: "2026-01-01", end: "2026-06-30" },
      order_by: [{ field: "active_users", direction: "desc" }], limit: 10,
    });
    expect(lines).toEqual([
      "Metrics: active_users",
      "Measures: avg_grade",
      "By: course_name",
      "Where: term is Fall; x is between 1 and 5",
      "Dates: date from 2026-01-01 to 2026-06-30",
      "Sorted by: active_users desc",
      "Limit: 10",
    ]);
  });
  it("is empty for an empty contract", () => {
    expect(summarizeContract({})).toEqual([]);
  });
});
