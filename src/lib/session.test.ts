import { describe, expect, it, vi } from "vitest";
import { endSession, onSessionEnd, sessionCheck } from "./session";

describe("session end", () => {
  it("runs every registered reset when a session ends", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onSessionEnd(a);
    const offB = onSessionEnd(b);
    endSession();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it("stops running a reset once it is unregistered", () => {
    const reset = vi.fn();
    onSessionEnd(reset)();
    endSession();
    expect(reset).not.toHaveBeenCalled();
  });

  it("runs the remaining resets when one throws", () => {
    const after = vi.fn();
    const offBad = onSessionEnd(() => { throw new Error("boom"); });
    const offAfter = onSessionEnd(after);
    expect(() => endSession()).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    offBad();
    offAfter();
  });

  it("marks work started before the session ended as stale", () => {
    const live = sessionCheck();
    expect(live()).toBe(true);
    endSession();
    expect(live()).toBe(false);
    expect(sessionCheck()()).toBe(true);
  });
});
