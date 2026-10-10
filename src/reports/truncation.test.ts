import { describe, expect, it } from "vitest";
import { wasCut } from "./truncation";

const run = (rows: number, limit?: number, truncated = false) =>
  ({ rows: Array.from({ length: rows }, () => ({})), contract: limit ? { limit } : {}, truncated });

describe("wasCut", () => {
  it("is true when a query returned exactly its row limit, or the server says so", () => {
    expect(wasCut(run(1000, 1000))).toBe(true);
    expect(wasCut(run(100))).toBe(true);
    expect(wasCut(run(5, 1000, true))).toBe(true);
  });
  it("is false below the limit", () => {
    expect(wasCut(run(999, 1000))).toBe(false);
    expect(wasCut(run(3))).toBe(false);
  });
});
