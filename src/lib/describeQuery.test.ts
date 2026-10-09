import { describe, expect, it } from "vitest";
import { describeQuery } from "./describeQuery";
import type { SemanticCatalog } from "@/types/semantic";

const catalog: SemanticCatalog = {
  datasets: [{
    id: "dataset.student_grade.v1", display_name: "Student course grades", description: "One row per enrollment with a grade.",
    grain: "one row per student enrollment", domain: "grades", dimensions: [], joins: [],
    measures: [
      { name: "average_grade_percentage", agg: "avg", expr: "GRADE_PERCENTAGE", unit: "percent", description: "Mean grade.", synonyms: [] },
      { name: "failing_enrollments", agg: "count_distinct", expr: "IFF(GRADE_PERCENTAGE < 60, PERSON_COURSE_ID, NULL)", unit: "enrollments", description: "", synonyms: [] },
      { name: "enrollments", agg: "count_distinct", expr: "PERSON_COURSE_ID", unit: "enrollments", description: "", synonyms: [] },
      { name: "share_failing", agg: "ratio", expr: null, numerator: "failing_enrollments", denominator: "enrollments", unit: "ratio", description: "Share failing.", synonyms: [] },
    ],
    filters: [{ name: "graded", description: "Has a final grade", sql: "GRADED_IND = 1" }],
  }],
  metrics: [{
    id: "metric.average_grade.v1", display_name: "Average grade", description: "Average final grade.", owner: "", authority: "",
    last_reviewed: "2026-10-01", measure: "dataset.student_grade.v1:average_grade_percentage", default_filters: ["graded"],
    synonyms: [], example_questions: [],
  }],
};

describe("describeQuery", () => {
  it("describes a metric's aggregation, expression, dataset and default filters", () => {
    const [d] = describeQuery({ metrics: ["metric.average_grade.v1"] }, catalog);
    expect(d.title).toBe("Average grade");
    expect(d.calculation).toEqual([{ label: "Calculation", detail: "Average of", code: "GRADE_PERCENTAGE" }]);
    expect(d.dataset).toEqual({ name: "Student course grades", grain: "one row per student enrollment", description: "One row per enrollment with a grade." });
    expect(d.filters).toContainEqual({ label: "Has a final grade", detail: "Metric default filter", code: "GRADED_IND = 1" });
  });

  it("describes a ratio as its numerator and denominator", () => {
    const [d] = describeQuery({ measures: ["dataset.student_grade.v1:share_failing"] }, catalog);
    expect(d.calculation).toEqual([
      { label: "Numerator: failing_enrollments", detail: "Number of distinct", code: "IFF(GRADE_PERCENTAGE < 60, PERSON_COURSE_ID, NULL)" },
      { label: "Denominator: enrollments", detail: "Number of distinct", code: "PERSON_COURSE_ID" },
    ]);
  });

  it("lists contract filters and the time range", () => {
    const [d] = describeQuery({
      measures: ["dataset.student_grade.v1:enrollments"],
      filters: [{ dimension: "dataset.courses.v1:term_name", op: "in", values: ["Fall 2026", "Spring 2026"] }],
      time_range: { dimension: "course_start", start: "2026-01-01", end: "2026-06-30" },
    }, catalog);
    expect(d.filters).toEqual([
      { label: "term_name", detail: "is one of Fall 2026, Spring 2026" },
      { label: "Time range", detail: "course_start from 2026-01-01 to 2026-06-30" },
    ]);
  });

  it("reports the overrides and transform that shaped the number", () => {
    const [d] = describeQuery({ metrics: ["metric.average_grade.v1"] }, catalog,
      { governed: true, overlays: ["measure:dataset.student_grade.v1:average_grade_percentage@v2"] }, "% change vs the comparison period");
    expect(d.overrides).toEqual(["measure:dataset.student_grade.v1:average_grade_percentage@v2"]);
    expect(d.transform).toBe("% change vs the comparison period");
  });
});
