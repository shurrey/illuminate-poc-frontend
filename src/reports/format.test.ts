import { describe, expect, it } from "vitest";
import { formatCells } from "./format";

describe("formatCells", () => {
  it("formats each column by its unit and leaves text and nulls readable", () => {
    const rows = [{ course: "BIO-101", share: 0.8333333, avg: 3.14159, n: 12000 }, { course: "X", share: null, avg: 1, n: 2 }];
    expect(formatCells(rows, { share: "ratio" })).toEqual([
      { course: "BIO-101", share: "83.3%", avg: "3.14", n: "12,000" },
      { course: "X", share: "—", avg: "1", n: "2" },
    ]);
  });
});
