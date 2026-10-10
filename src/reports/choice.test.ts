import { describe, expect, it } from "vitest";
import { choiceValue } from "./choice";
import type { ReportFilterDef } from "@/types/reports";

const metric: ReportFilterDef = { id: "metric", label: "Key metric", control: "choice", options: ["User count", "Course count"], default: ["User count"] };

describe("choiceValue", () => {
  it("is the chosen option, else the default, never an unknown value", () => {
    expect(choiceValue(metric, { metric: ["Course count"] })).toBe("Course count");
    expect(choiceValue(metric, {})).toBe("User count");
    expect(choiceValue(metric, { metric: ["Nope"] })).toBe("User count");
  });
});
