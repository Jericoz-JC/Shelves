import { describe, expect, it } from "vitest";
import { resolveCurrentUserId } from "@/lib/social/identity";
import { mapChronicleDocToFeedChronicle } from "@/lib/social/mapChronicles";

describe("social identity resolution", () => {
  it("prefers canonical Clerk user id when available", () => {
    expect(resolveCurrentUserId("user_2abc123")).toBe("user_2abc123");
  });

  it("falls back to legacy id only when no auth id is available", () => {
    expect(resolveCurrentUserId(undefined)).toBe("me");
    expect(resolveCurrentUserId(null)).toBe("me");
  });
});

describe("chronicle mapping", () => {
  it("preserves author id from Convex docs and maps fields deterministically", () => {
    const mapped = mapChronicleDocToFeedChronicle({
      _id: "c1",
      authorId: "user_2abc123",
      text: "hello world",
      createdAt: 123,
      likeCount: 4,
      replyCount: 2,
      repostCount: 1,
      highlightText: "quote",
      bookTitle: "Book",
      bookRef: "hash_1",
      spoilerTag: true,
    });

    expect(mapped).toMatchObject({
      id: "c1",
      authorId: "user_2abc123",
      text: "hello world",
      createdAt: 123,
      likeCount: 4,
      replyCount: 2,
      repostCount: 1,
      highlightText: "quote",
      bookTitle: "Book",
      bookHash: "hash_1",
      spoilerTag: true,
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
    });
  });
});
