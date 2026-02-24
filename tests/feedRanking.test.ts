import { describe, expect, it } from "vitest";
import {
  clampFeedLimit,
  computeBaseChronicleScore,
  computeChronicleTimeDecay,
  rankForYouChronicles,
  type RankableChronicle,
} from "../convex/lib/feedRanking";

const NOW = 1_700_000_000_000;

function makeChronicle(overrides: Partial<RankableChronicle> = {}): RankableChronicle {
  return {
    _id: "c1",
    authorId: "u1",
    createdAt: NOW - 60_000,
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    ...overrides,
  };
}

describe("feed ranking algorithm", () => {
  it("clamps feed limits to deterministic bounds", () => {
    expect(clampFeedLimit(undefined, 40, 50)).toBe(40);
    expect(clampFeedLimit(0, 40, 50)).toBe(1);
    expect(clampFeedLimit(200, 40, 50)).toBe(50);
  });

  it("applies the configured time decay floor", () => {
    const ancient = NOW - 1000 * 60 * 60 * 72;
    expect(computeChronicleTimeDecay(ancient, NOW)).toBe(0.5);
  });

  it("ranks high-reply engagement above like-heavy low-depth engagement", () => {
    const replyHeavy = makeChronicle({
      _id: "reply-heavy",
      replyCount: 3,
      likeCount: 5,
      authorId: "u-replies",
    });
    const likesHeavy = makeChronicle({
      _id: "likes-heavy",
      replyCount: 0,
      likeCount: 80,
      authorId: "u-likes",
    });

    const ranked = rankForYouChronicles([likesHeavy, replyHeavy], 2, NOW);
    expect(ranked[0]._id).toBe("reply-heavy");
  });

  it("applies diversity so same-author posts are penalized", () => {
    const first = makeChronicle({
      _id: "a1",
      authorId: "u-same",
      replyCount: 2,
    });
    const second = makeChronicle({
      _id: "a2",
      authorId: "u-same",
      replyCount: 2,
      createdAt: NOW - 120_000,
    });
    const otherAuthor = makeChronicle({
      _id: "b1",
      authorId: "u-other",
      replyCount: 1,
      likeCount: 10,
    });

    const ranked = rankForYouChronicles([first, second, otherAuthor], 3, NOW);
    expect(ranked.map((item) => item._id)).toEqual(["a1", "b1", "a2"]);
  });

  it("applies book-linked bonus", () => {
    const withBook = makeChronicle({ bookRef: "hash-1", replyCount: 1 });
    const withoutBook = makeChronicle({ _id: "no-book", replyCount: 1 });
    expect(computeBaseChronicleScore(withBook, NOW)).toBeGreaterThan(
      computeBaseChronicleScore(withoutBook, NOW)
    );
  });
});
