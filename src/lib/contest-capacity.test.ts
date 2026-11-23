import { describe, it, expect } from "vitest";
import {
  capacityInfo,
  formatCapacity,
  parseMaxEntriesInput,
  isContestEntryCapacityError,
} from "./contest-capacity";

describe("capacityInfo", () => {
  it("treats null max as unlimited", () => {
    const c = capacityInfo(12, null);
    expect(c.status).toBe("unlimited");
    expect(c.isFull).toBe(false);
    expect(c.spotsRemaining).toBeNull();
    expect(c.max).toBeNull();
  });

  it("treats undefined/missing max as unlimited (pre-migration safety)", () => {
    expect(capacityInfo(3, undefined).status).toBe("unlimited");
    expect(capacityInfo(3, null).entrants).toBe(3);
  });

  it("open with spots remaining", () => {
    const c = capacityInfo(4, 10);
    expect(c.status).toBe("open");
    expect(c.isFull).toBe(false);
    expect(c.spotsRemaining).toBe(6);
  });

  it("full at exactly the cap", () => {
    const c = capacityInfo(10, 10);
    expect(c.status).toBe("full");
    expect(c.isFull).toBe(true);
    expect(c.spotsRemaining).toBe(0);
  });

  it("over_capacity when entrants exceed the cap (cap lowered under count)", () => {
    const c = capacityInfo(15, 10);
    expect(c.status).toBe("over_capacity");
    expect(c.isFull).toBe(true);
    expect(c.spotsRemaining).toBe(0);
  });

  it("zero entrants is open", () => {
    const c = capacityInfo(0, 5);
    expect(c.status).toBe("open");
    expect(c.spotsRemaining).toBe(5);
  });

  it("cap of 1: first slot open, second is full", () => {
    expect(capacityInfo(0, 1).status).toBe("open");
    expect(capacityInfo(1, 1).status).toBe("full");
  });
});

describe("formatCapacity", () => {
  it("unlimited", () => {
    expect(formatCapacity(7, null)).toBe("7 entered · unlimited spots");
  });
  it("capped", () => {
    expect(formatCapacity(4, 10)).toBe("4 / 10 entered");
  });
  it("over capacity", () => {
    expect(formatCapacity(15, 10)).toBe("15 / 10 entered");
  });
});

describe("parseMaxEntriesInput", () => {
  it("empty means unlimited", () => {
    expect(parseMaxEntriesInput("")).toEqual({ value: null, error: null });
    expect(parseMaxEntriesInput("   ")).toEqual({ value: null, error: null });
  });
  it("valid integer", () => {
    expect(parseMaxEntriesInput("25")).toEqual({ value: 25, error: null });
  });
  it("rejects zero and negatives", () => {
    expect(parseMaxEntriesInput("0").error).toMatch(/whole number/);
    expect(parseMaxEntriesInput("-3").error).toMatch(/whole number/);
  });
  it("rejects fractions and text", () => {
    expect(parseMaxEntriesInput("2.5").error).toMatch(/whole number/);
    expect(parseMaxEntriesInput("abc").error).toMatch(/whole number/);
  });
  it("caps at MAX_SAFE ceiling", () => {
    expect(parseMaxEntriesInput("1000001").error).toMatch(/at most/);
    expect(parseMaxEntriesInput("1000000").error).toBeNull();
  });
});

describe("isContestEntryCapacityError", () => {
  it("recognises the DB block", () => {
    expect(isContestEntryCapacityError(new Error("contest_full: this contest is full (10/10)"))).toBe(true);
    expect(isContestEntryCapacityError("CONTEST_OVER_CAPACITY")).toBe(true);
  });
  it("does not match unrelated errors", () => {
    expect(isContestEntryCapacityError(new Error("duplicate key value"))).toBe(false);
    expect(isContestEntryCapacityError(null)).toBe(false);
  });
});
