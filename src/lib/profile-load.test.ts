import { describe, it, expect } from "vitest";
import { isTransientProfileError, friendlyProfileError, retryTransient, withTimeout, ProfileLoadTimeout } from "@/lib/profile-load";

describe("profile-load", () => {
  it("treats profile timeout as transient so retry actually runs", async () => {
    let calls = 0;
    const result = await retryTransient(async () => {
      calls += 1;
      if (calls === 1) throw new ProfileLoadTimeout();
      return "ok";
    }, { sleep: async () => {} });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });
  it("isTransient flags ProfileLoadTimeout instance", () => {
    expect(isTransientProfileError(new ProfileLoadTimeout())).toBe(true);
  });
  it("friendly maps timeout to TIMEOUT not generic", () => {
    expect(friendlyProfileError(new ProfileLoadTimeout()).code).toBe("TIMEOUT");
  });
  it("withTimeout rejects with ProfileLoadTimeout", async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toBeInstanceOf(ProfileLoadTimeout);
  });
  it("does not retry non-transient errors", async () => {
    let calls = 0;
    await expect(retryTransient(async () => { calls += 1; throw Object.assign(new Error("0 rows"), { code: "PGRST116" }); }, { sleep: async () => {} })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
