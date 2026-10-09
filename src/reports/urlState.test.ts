import { describe, expect, it } from "vitest";
import { urlFor, valuesFromUrl } from "./urlState";
import type { ReportFilterDef } from "@/types/reports";

const filters: ReportFilterDef[] = [
  { id: "term", label: "Term", control: "multi_select", dimension: "dataset.courses.v1:term_name", default: "current_term" },
  { id: "dates", label: "Dates", control: "date_range", time_dimension: "dataset.courses.v1:course_start", default: "last_30_days" },
];
const params = (url: string) => new URLSearchParams(url.split("?")[1]);

describe("report URL state", () => {
  it("uses the defaults until the user has changed something", () => {
    expect(valuesFromUrl(filters, new URLSearchParams("id=r"))).toBeNull();
  });

  it("round-trips selections and date ranges", () => {
    const values = { term: ["Q4: 2026", "FY: 2026"], dates: { start: "2026-01-01", end: "2026-03-31" } };
    expect(valuesFromUrl(filters, params(urlFor("r", filters, values)))).toEqual(values);
  });

  it("keeps a cleared filter cleared rather than snapping back to its default", () => {
    const cleared = valuesFromUrl(filters, params(urlFor("r", filters, { term: [], dates: {} })));
    expect(cleared).toEqual({});
  });

  it("keeps an open-ended date range", () => {
    expect(valuesFromUrl(filters, params(urlFor("r", filters, { dates: { start: "2026-01-01" } })))).toEqual({ dates: { start: "2026-01-01" } });
  });
});
