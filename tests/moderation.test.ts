import { describe, expect, it } from "vitest";
import {
  assertCleanContent,
  findBlockedTerm,
  ModerationError,
  normalizeForModeration,
} from "../convex/lib/moderation";

describe("normalizeForModeration", () => {
  it("lowercases and maps common leetspeak", () => {
    expect(normalizeForModeration("Sh1T")).toBe("shit");
    expect(normalizeForModeration("FUCK")).toBe("fuck");
    expect(normalizeForModeration("a$$h0le")).toBe("asshole");
  });
});

describe("findBlockedTerm", () => {
  it("passes clean text", () => {
    expect(findBlockedTerm("I loved this chapter so much")).toBeNull();
    expect(findBlockedTerm("")).toBeNull();
  });

  it("catches blocked words at word boundaries", () => {
    expect(findBlockedTerm("this book is shit")).toBe("shit");
    expect(findBlockedTerm("WHAT THE FUCK")).toBe("fuck");
  });

  it("catches leetspeak variants", () => {
    expect(findBlockedTerm("what the f4ck... wait, fuck")).toBe("fuck");
    expect(findBlockedTerm("sh1t take")).toBe("shit");
  });

  it("does not flag innocent words containing blocked fragments", () => {
    // Scunthorpe protection: word-boundary matching for the common list.
    expect(findBlockedTerm("the class assignment was hard")).toBeNull();
    expect(findBlockedTerm("I made a dent in my reading list")).toBeNull();
    expect(findBlockedTerm("she shitake mushroom... actually shiitake")).toBeNull();
  });

  it("catches severe slurs even with separator evasion", () => {
    expect(findBlockedTerm("n i g g e r")).not.toBeNull();
    expect(findBlockedTerm("f-a-g-g-o-t")).not.toBeNull();
  });
});

describe("assertCleanContent", () => {
  it("throws ModerationError naming the field", () => {
    expect(() => assertCleanContent("text", "total bullshit")).toThrow(ModerationError);
    expect(() => assertCleanContent("text", "total bullshit")).toThrow(/not allowed/);
  });

  it("accepts clean and undefined values", () => {
    expect(() => assertCleanContent("text", "a lovely read")).not.toThrow();
    expect(() => assertCleanContent("bio", undefined)).not.toThrow();
  });
});
