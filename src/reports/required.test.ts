import { describe, expect, it } from "vitest";
import { missingRequired } from "./required";
import type { ReportDef } from "@/types/reports";

const report = {
  id: "r", title: "t", area: "teaching", description: "d", pages: [], required_filters: ["course"],
  filters: [{ id: "course", label: "Course ID / name", control: "select", dimension: "dataset.courses.v1:course_id_name" }],
} as ReportDef;

describe("missingRequired", () => {
  it("names the required filters that have no value", () => {
    expect(missingRequired(report, {}).map((f) => f.label)).toEqual(["Course ID / name"]);
    expect(missingRequired(report, { course: [] })).toHaveLength(1);
    expect(missingRequired(report, { course: ["BIO-101 - Biology"] })).toEqual([]);
    expect(missingRequired({ ...report, required_filters: undefined }, {})).toEqual([]);
  });
});
