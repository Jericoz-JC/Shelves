import { describe, expect, it } from "vitest";
import {
  isSpoilerGated,
  redactSpoilerContent,
  shouldRevealSpoiler,
} from "../convex/lib/spoilers";

const gated = {
  authorId: "author-1",
  spoilerTag: true,
  bookRef: "book-hash",
  spoilerProgress: 0.6,
  text: "Snape kills Dumbledore",
  highlightText: "the quote",
};

describe("isSpoilerGated", () => {
  it("requires both the spoiler tag and a book reference", () => {
    expect(isSpoilerGated(gated)).toBe(true);
    expect(isSpoilerGated({ ...gated, spoilerTag: false })).toBe(false);
    expect(isSpoilerGated({ ...gated, spoilerTag: undefined })).toBe(false);
    expect(isSpoilerGated({ ...gated, bookRef: undefined })).toBe(false);
    expect(isSpoilerGated({ ...gated, bookRef: "" })).toBe(false);
  });
});

describe("shouldRevealSpoiler", () => {
  it("always reveals ungated content", () => {
    expect(shouldRevealSpoiler({ ...gated, spoilerTag: false }, null, null)).toBe(true);
  });

  it("always reveals to the author", () => {
    expect(shouldRevealSpoiler(gated, "author-1", null)).toBe(true);
  });

  it("hides from signed-out viewers", () => {
    expect(shouldRevealSpoiler(gated, null, null)).toBe(false);
  });

  it("hides from viewers who have not started the book", () => {
    expect(shouldRevealSpoiler(gated, "viewer-1", null)).toBe(false);
  });

  it("gates on the poster's position", () => {
    expect(shouldRevealSpoiler(gated, "viewer-1", 0.59)).toBe(false);
    expect(shouldRevealSpoiler(gated, "viewer-1", 0.6)).toBe(true);
    expect(shouldRevealSpoiler(gated, "viewer-1", 1)).toBe(true);
  });

  it("treats a missing poster position as start-of-book (any reader unlocks)", () => {
    const legacy = { ...gated, spoilerProgress: undefined };
    expect(shouldRevealSpoiler(legacy, "viewer-1", 0)).toBe(true);
    expect(shouldRevealSpoiler(legacy, "viewer-1", null)).toBe(false);
  });
});

describe("redactSpoilerContent", () => {
  it("strips text and highlight but keeps metadata", () => {
    const redacted = redactSpoilerContent(gated);
    expect(redacted.text).toBe("");
    expect(redacted.highlightText).toBeUndefined();
    expect(redacted.spoilerRedacted).toBe(true);
    expect(redacted.bookRef).toBe("book-hash");
    expect(redacted.spoilerTag).toBe(true);
  });
});
