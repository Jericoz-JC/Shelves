import { describe, expect, it } from "vitest";
import {
  enrichFeedChronicle,
  mapReplyDocs,
  mergeReplyMaps,
  type ReplyDocLike,
} from "@/lib/social/feedTransforms";

describe("feed transforms", () => {
  it("enriches chronicles with reaction and author state deterministically", () => {
    const enriched = enrichFeedChronicle({
      doc: {
        _id: "c1",
        authorId: "user_1",
        text: "hello",
        createdAt: 123,
        likeCount: 1,
        replyCount: 2,
        repostCount: 3,
      },
      reactionState: {
        isLiked: true,
        isReposted: false,
        isBookmarked: true,
      },
      author: {
        clerkId: "user_1",
        name: "Elena",
        handle: "elena_reads",
        avatarUrl: "https://avatar.example.com/elena.png",
      },
    });

    expect(enriched).toMatchObject({
      id: "c1",
      authorId: "user_1",
      authorDisplayName: "Elena",
      authorHandle: "elena_reads",
      authorAvatarUrl: "https://avatar.example.com/elena.png",
      isLiked: true,
      isReposted: false,
      isBookmarked: true,
    });
  });

  it("maps reply docs to UI replies", () => {
    const replyDocs: ReplyDocLike[] = [
      {
        _id: "r1",
        parentChronicleId: "c1",
        authorId: "user_2",
        text: "reply",
        createdAt: 42,
      },
      {
        _id: "orphan",
        authorId: "user_3",
        text: "missing parent",
        createdAt: 43,
      },
    ];
    expect(mapReplyDocs(replyDocs)).toEqual([
      {
        id: "r1",
        chronicleId: "c1",
        authorId: "user_2",
        text: "reply",
        createdAt: 42,
      },
    ]);
  });

  it("merges server and local replies with deterministic id dedupe", () => {
    const merged = mergeReplyMaps(
      {
        c1: [
          { id: "s1", chronicleId: "c1", authorId: "user_1", text: "server", createdAt: 1 },
          { id: "same", chronicleId: "c1", authorId: "user_1", text: "server2", createdAt: 2 },
        ],
      },
      {
        c1: [
          { id: "same", chronicleId: "c1", authorId: "user_1", text: "local", createdAt: 3 },
          { id: "l1", chronicleId: "c1", authorId: "user_1", text: "local2", createdAt: 4 },
        ],
      }
    );

    expect(merged.c1.map((reply) => reply.id)).toEqual(["s1", "same", "l1"]);
  });
});
