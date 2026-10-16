import { describe, expect, it } from "vitest";
import { userStorageKey } from "./userStorage";

describe("userStorageKey", () => {
  it("gives each user their own key", () => {
    expect(userStorageKey("illuminate-queries-v2", "alice")).not.toBe(userStorageKey("illuminate-queries-v2", "bob"));
  });

  it("never returns the shared, unscoped key", () => {
    expect(userStorageKey("illuminate-queries-v2", "alice")).not.toBe("illuminate-queries-v2");
  });

  it("has no key without a signed-in user", () => {
    expect(userStorageKey("illuminate-queries-v2", null)).toBeNull();
    expect(userStorageKey("illuminate-queries-v2", "")).toBeNull();
  });
});
