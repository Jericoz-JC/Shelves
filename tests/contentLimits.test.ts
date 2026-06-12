import { describe, expect, it } from "vitest";
import {
  assertChronicleContent,
  assertWithinLimit,
  CHRONICLE_TEXT_MAX,
  ContentLimitError,
  HIGHLIGHT_TEXT_MAX,
} from "../convex/lib/contentLimits";

describe("assertWithinLimit", () => {
  it("accepts values at or below the limit", () => {
    expect(() => assertWithinLimit("text", "a".repeat(10), 10)).not.toThrow();
    expect(() => assertWithinLimit("text", "", 10)).not.toThrow();
    expect(() => assertWithinLimit("text", undefined, 10)).not.toThrow();
  });

  it("rejects values over the limit with a descriptive error", () => {
    expect(() => assertWithinLimit("text", "a".repeat(11), 10)).toThrow(ContentLimitError);
    expect(() => assertWithinLimit("text", "a".repeat(11), 10)).toThrow(/maximum length of 10/);
  });
});

describe("assertChronicleContent", () => {
  it("accepts a maximal valid chronicle", () => {
    expect(() =>
      assertChronicleContent({
        text: "a".repeat(CHRONICLE_TEXT_MAX),
        highlightText: "b".repeat(HIGHLIGHT_TEXT_MAX),
        bookTitle: "A Book",
      })
    ).not.toThrow();
  });

  it("rejects oversized text", () => {
    expect(() =>
      assertChronicleContent({ text: "a".repeat(CHRONICLE_TEXT_MAX + 1) })
    ).toThrow(ContentLimitError);
  });

  it("rejects oversized highlight text", () => {
    expect(() =>
      assertChronicleContent({ text: "ok", highlightText: "h".repeat(HIGHLIGHT_TEXT_MAX + 1) })
    ).toThrow(ContentLimitError);
  });
});
