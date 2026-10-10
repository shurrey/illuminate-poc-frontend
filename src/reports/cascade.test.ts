import { describe, expect, it } from "vitest";
import { offerSearch, optionFilters, withDependantsCleared } from "./cascade";
import type { ReportFilterDef } from "@/types/reports";

const level = (n: number, parents: number[]): ReportFilterDef => ({
  id: `ih${n}`, label: `Level ${n}`, control: "select", dimensions: [{ ref: `dataset.course_filters_ih.v1:ih_level_${n}` }],
  depends_on: parents.map((p) => `ih${p}`),
});
const filters = [level(1, []), level(2, [1]), level(3, [1, 2]), level(4, [1, 2, 3])];

describe("withDependantsCleared", () => {
  it("clears every level below the one that changed", () => {
    const next = withDependantsCleared(filters, { ih1: ["A"], ih2: ["B"], ih3: ["C"], ih4: ["D"], dates: { start: "2026-01-01" } }, "ih1", ["Z"]);
    expect(next).toEqual({ ih1: ["Z"], dates: { start: "2026-01-01" } });
  });
  it("keeps the levels above", () => {
    expect(withDependantsCleared(filters, { ih1: ["A"], ih2: ["B"], ih3: ["C"] }, "ih2", ["Y"])).toEqual({ ih1: ["A"], ih2: ["Y"] });
  });
});

import { optionValues } from "./cascade";

describe("optionValues", () => {
  it("drops empty values and the filter's excluded placeholders", () => {
    const rows = [{ ih: "-" }, { ih: "All Nodes" }, { ih: "Nursing" }, { ih: null }, { ih: "Art" }];
    expect(optionValues(rows, "ih", ["-", "All Nodes"])).toEqual(["Nursing", "Art"]);
  });
});

describe("optionFilters", () => {
  it("narrows options by the parents' values and, when searching, by a substring of the option", () => {
    const parents = [{ dimension: "dataset.courses.v1:ih_level_1", values: ["Arts"] }];
    expect(optionFilters(parents, "dataset.courses.v1:course_number", "")).toEqual([
      { dimension: "dataset.courses.v1:ih_level_1", op: "in", values: ["Arts"] }]);
    expect(optionFilters(parents, "dataset.courses.v1:course_number", "  bio ")).toEqual([
      { dimension: "dataset.courses.v1:ih_level_1", op: "in", values: ["Arts"] },
      { dimension: "dataset.courses.v1:course_number", op: "contains", values: ["bio"] }]);
  });
});

describe("offerSearch", () => {
  it("offers a search box once options reach the load limit, and keeps it while a search is typed", () => {
    expect(offerSearch(999, "")).toBe(false);
    expect(offerSearch(1000, "")).toBe(true);
    expect(offerSearch(3, "bio")).toBe(true);
  });
});
