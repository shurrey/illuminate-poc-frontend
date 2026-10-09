import { describe, expect, it } from "vitest";
import { createPool } from "./pool";

const tick = () => new Promise((r) => setTimeout(r, 1));

describe("createPool", () => {
  it("never runs more than its limit at once and runs everything", async () => {
    const run = createPool(2);
    let active = 0, peak = 0;
    const job = (n: number) => run(async () => { active++; peak = Math.max(peak, active); await tick(); active--; return n; });
    expect(await Promise.all([1, 2, 3, 4, 5].map(job))).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("frees a slot when a job fails", async () => {
    const run = createPool(1);
    await expect(run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(await run(async () => "next")).toBe("next");
  });
});
