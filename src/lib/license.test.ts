import { describe, expect, it } from "vitest";
import { isLearnSchema, LEARN_REFUSAL, PREVIEW_REFUSAL, previewState, referencesLearn } from "./license";

describe("isLearnSchema", () => {
  it("matches LEARN in any case and nothing else", () => {
    expect(isLearnSchema("LEARN")).toBe(true);
    expect(isLearnSchema("learn")).toBe(true);
    expect(isLearnSchema("CDM_LMS")).toBe(false);
    expect(isLearnSchema("LEARN_X")).toBe(false);
  });
});

describe("previewState", () => {
  it("hides the tab from non-admins", () => {
    expect(previewState("premium", "CDM_LMS", false)).toEqual({ visible: false, enabled: false });
  });
  it("shows a disabled tab with the refusal for a Core admin on LEARN", () => {
    expect(previewState("core", "LEARN", true)).toEqual({ visible: true, enabled: false, reason: PREVIEW_REFUSAL });
  });
  it("fails closed on LEARN when the license is unknown", () => {
    expect(previewState(null, "LEARN", true)).toEqual({ visible: true, enabled: false, reason: PREVIEW_REFUSAL });
  });
  it("enables admins on CDM for any license and on LEARN for Premium", () => {
    expect(previewState("core", "CDM_LMS", true)).toEqual({ visible: true, enabled: true });
    expect(previewState(null, "CDM_LMS", true)).toEqual({ visible: true, enabled: true });
    expect(previewState("premium", "LEARN", true)).toEqual({ visible: true, enabled: true });
  });
  it("uses the exact refusal text", () => {
    expect(PREVIEW_REFUSAL).toBe("Data preview for LEARN tables is available with Illuminate Premium");
    expect(LEARN_REFUSAL).toBe("This query uses LEARN data, which is available with Illuminate Premium.");
  });
});

describe("referencesLearn", () => {
  it.each([
    "select * from LEARN.COURSE_MAIN",
    'select * from "LEARN".COURSE_MAIN',
    "select * from learn.course_main",
    "select * from db.learn.course_main",
    "from x join Learn.users u on 1=1",
  ])("matches %s", (sql) => expect(referencesLearn(sql)).toBe(true));
  it.each([
    "select * from LEARNING.COURSES",
    "select * from CDM_LMS.LEARN_X",
    "select learn_count from t",
    "select 1",
  ])("ignores %s", (sql) => expect(referencesLearn(sql)).toBe(false));
});
