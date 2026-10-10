import { describe, expect, it } from "vitest";
import { withDependantsCleared } from "./cascade";
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
