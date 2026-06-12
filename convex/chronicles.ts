import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAuthenticatedUserId } from "./lib/auth";
import { clampFeedLimit, rankForYouChronicles, sanitizeNowBucketMs } from "./lib/feedRanking";
import {
  decodeFeedCursor,
  isAfterCursor,
  selectFeedPage,
  SAME_TS_BUFFER,
  type FeedCursor,
} from "./lib/feedPagination";
import { assertChronicleContent } from "./lib/contentLimits";

const LIST_DEFAULT_LIMIT = 20;
const FEED_DEFAULT_LIMIT = 40;
const FEED_MAX_LIMIT = 50;
const FOR_YOU_POOL_MULTIPLIER = 3;
const FOR_YOU_MAX_POOL_SIZE = 100;
const FOLLOWING_POOL_MULTIPLIER = 6;
const FOLLOWING_MAX_POOL_SIZE = 200;
const REACTION_FEED_POOL_MULTIPLIER = 6;
const REACTION_FEED_MAX_POOL_SIZE = 300;
const AUTHOR_POOL_MULTIPLIER = 3;
const AUTHOR_MAX_POOL_SIZE = 200;
const FOLLOWING_MAX_FOLLOWEES = 500;
const REPLIES_DEFAULT_LIMIT = 50;
const REPLIES_MAX_LIMIT = 100;
const BATCH_MAX_IDS = 100;
const CASCADE_NODE_BATCH_SIZE = 20;
const CASCADE_CHILD_PAGE_SIZE = 20;
const CASCADE_REACTION_PAGE_SIZE = 50;

// feedPage scan windows: the hard upper bound of index rows read per page.
const FOLLOWING_PAGE_MAX_SCAN = 400;
const AUTHOR_PAGE_MAX_SCAN = 300;
const REACTION_PAGE_SCAN_PAD = 20;

function pushUniqueChronicleId(
  target: Id<"chronicles">[],
  dedupe: Set<string>,
  chronicleId: Id<"chronicles">
) {
  if (dedupe.has(chronicleId)) return;
  dedupe.add(chronicleId);
  target.push(chronicleId);
}

async function processCascadeBatch(
  ctx: MutationCtx,
  queue: Id<"chronicles">[]
): Promise<Id<"chronicles">[]> {
  const pending = [...queue];
  const nextQueue: Id<"chronicles">[] = [];
  const dedupe = new Set<string>();
  let processedNodes = 0;

  while (pending.length > 0 && processedNodes < CASCADE_NODE_BATCH_SIZE) {
    const chronicleId = pending.shift();
    if (!chronicleId) break;
    processedNodes += 1;

    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) continue;

    const [childReplies, likes, reposts, bookmarks] = await Promise.all([
      ctx.db
        .query("chronicles")
        .withIndex("by_parent_chronicle", (q) => q.eq("parentChronicleId", chronicleId))
        .take(CASCADE_CHILD_PAGE_SIZE),
      ctx.db.query("likes").withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId)).take(CASCADE_REACTION_PAGE_SIZE),
      ctx.db.query("reposts").withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId)).take(CASCADE_REACTION_PAGE_SIZE),
      ctx.db
        .query("bookmarks")
        .withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId))
        .take(CASCADE_REACTION_PAGE_SIZE),
    ]);

    await Promise.all([
      ...likes.map((record) => ctx.db.delete(record._id)),
      ...reposts.map((record) => ctx.db.delete(record._id)),
      ...bookmarks.map((record) => ctx.db.delete(record._id)),
    ]);

    for (const child of childReplies) {
      pushUniqueChronicleId(nextQueue, dedupe, child._id);
    }

    const hasChildren = childReplies.length > 0;
    const mayHaveMoreReactions =
      likes.length === CASCADE_REACTION_PAGE_SIZE ||
      reposts.length === CASCADE_REACTION_PAGE_SIZE ||
      bookmarks.length === CASCADE_REACTION_PAGE_SIZE;
    const mayHaveMoreChildren = childReplies.length === CASCADE_CHILD_PAGE_SIZE;

    if (hasChildren || mayHaveMoreChildren || mayHaveMoreReactions) {
      // Requeue parent until all descendants and reactions are fully removed.
      pushUniqueChronicleId(nextQueue, dedupe, chronicleId);
      continue;
    }

    await ctx.db.delete(chronicleId);
  }

  for (const chronicleId of pending) {
    pushUniqueChronicleId(nextQueue, dedupe, chronicleId);
  }

  return nextQueue;
}

async function scheduleCascadeIfNeeded(
  ctx: MutationCtx,
  remainingQueue: Id<"chronicles">[]
): Promise<void> {
  if (remainingQueue.length === 0) return;
  await ctx.scheduler.runAfter(0, internal.chronicles.deleteCascadeBatch, {
    queue: remainingQueue,
  });
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = LIST_DEFAULT_LIMIT }) => {
    return ctx.db
      .query("chronicles")
      .withIndex("by_parent_and_created", (q) => q.eq("parentChronicleId", undefined))
      .order("desc")
      .take(limit);
  },
});

export const listReplies = query({
  args: {
    parentId: v.id("chronicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { parentId, limit = REPLIES_DEFAULT_LIMIT }) =>
    ctx.db
      .query("chronicles")
      .withIndex("by_parent_chronicle", (q) => q.eq("parentChronicleId", parentId))
      .order("asc")
      .take(Math.min(limit, REPLIES_MAX_LIMIT)),
});

export const listRepliesBatch = query({
  args: {
    parentIds: v.array(v.id("chronicles")),
    limitPerParent: v.optional(v.number()),
  },
  handler: async (ctx, { parentIds, limitPerParent = REPLIES_DEFAULT_LIMIT }) => {
    if (parentIds.length === 0) return {};
    if (parentIds.length > BATCH_MAX_IDS) {
      throw new Error(`Too many parentIds requested. Max is ${BATCH_MAX_IDS}.`);
    }

    const safeLimit = Math.min(limitPerParent, REPLIES_MAX_LIMIT);
    const uniqueParentIds = [...new Set(parentIds)];

    const entries = await Promise.all(
      uniqueParentIds.map(async (parentId) => {
        const replies = await ctx.db
          .query("chronicles")
          .withIndex("by_parent_chronicle", (q) => q.eq("parentChronicleId", parentId))
          .order("asc")
          .take(safeLimit);
        return [parentId, replies] as const;
      })
    );

    return Object.fromEntries(entries);
  },
});

export const listForYou = query({
  args: {
    limit: v.optional(v.number()),
    nowBucketMs: v.number(),
  },
  handler: async (ctx, { limit, nowBucketMs }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const validatedNowBucketMs = sanitizeNowBucketMs(nowBucketMs);
    const candidatePoolSize = Math.min(
      FOR_YOU_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * FOR_YOU_POOL_MULTIPLIER)
    );

    const candidates = await ctx.db
      .query("chronicles")
      .withIndex("by_parent_and_created", (q) => q.eq("parentChronicleId", undefined))
      .order("desc")
      .take(candidatePoolSize);

    return rankForYouChronicles(candidates, safeLimit, validatedNowBucketMs);
  },
});

export const listByAuthor = query({
  args: {
    authorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { authorId, limit }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const candidatePoolSize = Math.min(
      AUTHOR_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * AUTHOR_POOL_MULTIPLIER)
    );

    const candidates = await ctx.db
      .query("chronicles")
      .withIndex("by_author", (q) => q.eq("authorId", authorId))
      .order("desc")
      .take(candidatePoolSize);

    return candidates
      .filter((chronicle) => chronicle.parentChronicleId === undefined)
      .slice(0, safeLimit);
  },
});

export const listFollowing = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const followerId = await requireAuthenticatedUserId(ctx);

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", followerId))
      .order("desc")
      .take(FOLLOWING_MAX_FOLLOWEES);
    const allowedAuthors = new Set([followerId, ...follows.map((follow) => follow.followeeId)]);

    const candidatePoolSize = Math.min(
      FOLLOWING_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * FOLLOWING_POOL_MULTIPLIER)
    );

    const candidates = await ctx.db
      .query("chronicles")
      .withIndex("by_parent_and_created", (q) => q.eq("parentChronicleId", undefined))
      .order("desc")
      .take(candidatePoolSize);

    return candidates
      .filter((chronicle) => allowedAuthors.has(chronicle.authorId))
      .slice(0, safeLimit);
  },
});

export const listBookmarked = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const userId = await requireAuthenticatedUserId(ctx);
    const candidatePoolSize = Math.min(
      REACTION_FEED_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * REACTION_FEED_POOL_MULTIPLIER)
    );

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(candidatePoolSize);

    const dedupe = new Set<string>();
    const chronicleIds = bookmarks
      .map((bookmark) => bookmark.chronicleId)
      .filter((chronicleId) => {
        if (dedupe.has(chronicleId)) return false;
        dedupe.add(chronicleId);
        return true;
      });

    const chronicles = await Promise.all(chronicleIds.map((chronicleId) => ctx.db.get(chronicleId)));
    return chronicles
      .filter((chronicle): chronicle is NonNullable<typeof chronicle> =>
        Boolean(chronicle && chronicle.parentChronicleId === undefined)
      )
      .slice(0, safeLimit);
  },
});

export const listLiked = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const userId = await requireAuthenticatedUserId(ctx);
    const candidatePoolSize = Math.min(
      REACTION_FEED_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * REACTION_FEED_POOL_MULTIPLIER)
    );

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(candidatePoolSize);

    const dedupe = new Set<string>();
    const chronicleIds = likes
      .map((like) => like.chronicleId)
      .filter((chronicleId) => {
        if (dedupe.has(chronicleId)) return false;
        dedupe.add(chronicleId);
        return true;
      });

    const chronicles = await Promise.all(chronicleIds.map((chronicleId) => ctx.db.get(chronicleId)));
    return chronicles
      .filter((chronicle): chronicle is NonNullable<typeof chronicle> =>
        Boolean(chronicle && chronicle.parentChronicleId === undefined)
      )
      .slice(0, safeLimit);
  },
});

export const listReposted = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const safeLimit = clampFeedLimit(limit, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const userId = await requireAuthenticatedUserId(ctx);
    const candidatePoolSize = Math.min(
      REACTION_FEED_MAX_POOL_SIZE,
      Math.max(safeLimit, safeLimit * REACTION_FEED_POOL_MULTIPLIER)
    );

    const reposts = await ctx.db
      .query("reposts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(candidatePoolSize);

    const dedupe = new Set<string>();
    const chronicleIds = reposts
      .map((repost) => repost.chronicleId)
      .filter((chronicleId) => {
        if (dedupe.has(chronicleId)) return false;
        dedupe.add(chronicleId);
        return true;
      });

    const chronicles = await Promise.all(chronicleIds.map((chronicleId) => ctx.db.get(chronicleId)));
    return chronicles
      .filter((chronicle): chronicle is NonNullable<typeof chronicle> =>
        Boolean(chronicle && chronicle.parentChronicleId === undefined)
      )
      .slice(0, safeLimit);
  },
});

export const userReactionStates = query({
  args: {
    chronicleIds: v.array(v.id("chronicles")),
  },
  handler: async (ctx, { chronicleIds }) => {
    if (chronicleIds.length === 0) return {};
    if (chronicleIds.length > BATCH_MAX_IDS) {
      throw new Error(`Too many chronicleIds requested. Max is ${BATCH_MAX_IDS}.`);
    }

    const userId = await requireAuthenticatedUserId(ctx);
    const uniqueChronicleIds = [...new Set(chronicleIds)];

    const states = await Promise.all(
      uniqueChronicleIds.map(async (chronicleId) => {
        const [like, repost, bookmark] = await Promise.all([
          ctx.db
            .query("likes")
            .withIndex("by_user_and_chronicle", (q) =>
              q.eq("userId", userId).eq("chronicleId", chronicleId)
            )
            .unique(),
          ctx.db
            .query("reposts")
            .withIndex("by_user_and_chronicle", (q) =>
              q.eq("userId", userId).eq("chronicleId", chronicleId)
            )
            .unique(),
          ctx.db
            .query("bookmarks")
            .withIndex("by_user_and_chronicle", (q) =>
              q.eq("userId", userId).eq("chronicleId", chronicleId)
            )
            .unique(),
        ]);

        return [
          chronicleId,
          {
            isLiked: like !== null,
            isReposted: repost !== null,
            isBookmarked: bookmark !== null,
          },
        ] as const;
      })
    );

    return Object.fromEntries(states);
  },
});

interface ViewerReactionState {
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
}

interface FeedPageItem extends Doc<"chronicles"> {
  author: {
    clerkId: string;
    name?: string;
    handle?: string;
    avatarUrl?: string;
  } | null;
  viewer: ViewerReactionState | null;
}

/**
 * Hydrate a page of chronicles with author records and the viewer's reaction
 * states in bounded batches — at most one user lookup per distinct author and
 * three point lookups per chronicle, all capped by the page size.
 */
async function hydrateFeedPage(
  ctx: QueryCtx,
  chronicles: Doc<"chronicles">[]
): Promise<FeedPageItem[]> {
  const authorIds = [...new Set(chronicles.map((chronicle) => chronicle.authorId))];
  const authorDocs = await Promise.all(
    authorIds.map((clerkId) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
        .unique()
    )
  );
  const authorByClerkId = new Map(
    authorDocs
      .filter((author): author is NonNullable<typeof author> => author !== null)
      .map((author) => [author.clerkId, author])
  );

  const identity = await ctx.auth.getUserIdentity();
  const viewerId = identity?.subject ?? null;

  const viewerStates = viewerId
    ? await Promise.all(
        chronicles.map(async (chronicle) => {
          const [like, repost, bookmark] = await Promise.all([
            ctx.db
              .query("likes")
              .withIndex("by_user_and_chronicle", (q) =>
                q.eq("userId", viewerId).eq("chronicleId", chronicle._id)
              )
              .unique(),
            ctx.db
              .query("reposts")
              .withIndex("by_user_and_chronicle", (q) =>
                q.eq("userId", viewerId).eq("chronicleId", chronicle._id)
              )
              .unique(),
            ctx.db
              .query("bookmarks")
              .withIndex("by_user_and_chronicle", (q) =>
                q.eq("userId", viewerId).eq("chronicleId", chronicle._id)
              )
              .unique(),
          ]);
          return {
            isLiked: like !== null,
            isReposted: repost !== null,
            isBookmarked: bookmark !== null,
          };
        })
      )
    : null;

  return chronicles.map((chronicle, index) => {
    const author = authorByClerkId.get(chronicle.authorId);
    return {
      ...chronicle,
      author: author
        ? {
            clerkId: author.clerkId,
            name: author.name,
            handle: author.handle,
            avatarUrl: author.avatarUrl,
          }
        : null,
      viewer: viewerStates ? viewerStates[index] : null,
    };
  });
}

function topLevelByCreatedDesc(ctx: QueryCtx, cursor: FeedCursor | null, scanSize: number) {
  return ctx.db
    .query("chronicles")
    .withIndex("by_parent_and_created", (q) => {
      const base = q.eq("parentChronicleId", undefined);
      return cursor ? base.lte("createdAt", cursor.t) : base;
    })
    .order("desc")
    .take(scanSize);
}

async function reactionFeedPage(
  ctx: QueryCtx,
  table: "bookmarks" | "likes" | "reposts",
  userId: string,
  cursor: FeedCursor | null,
  pageSize: number
) {
  const scanSize = pageSize + REACTION_PAGE_SCAN_PAD;
  const rows = await ctx.db
    .query(table)
    .withIndex("by_user", (q) => {
      const base = q.eq("userId", userId);
      return cursor ? base.lt("_creationTime", cursor.ct) : base;
    })
    .order("desc")
    .take(scanSize);
  const scanExhausted = rows.length < scanSize;

  const chronicleById = new Map<string, Doc<"chronicles">>();
  await Promise.all(
    rows.map(async (row) => {
      if (chronicleById.has(row.chronicleId)) return;
      const chronicle = await ctx.db.get(row.chronicleId);
      if (chronicle) chronicleById.set(row.chronicleId, chronicle);
    })
  );

  const seen = new Set<string>();
  const selection = selectFeedPage(
    rows,
    (row) => {
      // Reaction rows are scanned in _creationTime index order, so the
      // cursor compares _creationTime alone (createdAt may not agree).
      if (cursor && row._creationTime >= cursor.ct) return false;
      if (seen.has(row.chronicleId)) return false;
      const chronicle = chronicleById.get(row.chronicleId);
      if (!chronicle || chronicle.parentChronicleId !== undefined) return false;
      seen.add(row.chronicleId);
      return true;
    },
    pageSize,
    scanExhausted
  );

  return {
    chronicles: selection.items.map((row) => chronicleById.get(row.chronicleId)!),
    continueCursor: selection.continueCursor,
    isDone: selection.isDone,
  };
}

/**
 * Cursor-paginated, server-hydrated feed (issue #27).
 *
 * One round trip returns a page of chronicles with author records and the
 * viewer's reaction states attached. Every variant reads a bounded number of
 * index rows per page, so feed cost no longer grows with table size.
 *
 * "For You" is a ranked discovery window: the first page ranks the newest
 * candidate pool (exactly the legacy listForYou behavior); older pages
 * continue in reverse-chronological order below that pool.
 */
export const feedPage = query({
  args: {
    feed: v.union(
      v.literal("forYou"),
      v.literal("following"),
      v.literal("author"),
      v.literal("bookmarks"),
      v.literal("likes"),
      v.literal("reposts")
    ),
    authorId: v.optional(v.string()),
    nowBucketMs: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { feed, authorId, nowBucketMs, paginationOpts }) => {
    const pageSize = clampFeedLimit(paginationOpts.numItems, FEED_DEFAULT_LIMIT, FEED_MAX_LIMIT);
    const cursor = decodeFeedCursor(paginationOpts.cursor);

    let chronicles: Doc<"chronicles">[];
    let continueCursor: string | null;
    let isDone: boolean;

    if (feed === "forYou") {
      // Ranked chronological windows: each page is the next chronological
      // slice (cursor-stable — pages partition the index, so no duplicates
      // or gaps), reordered by engagement ranking within the window for
      // display. The continue cursor follows the chronological spine, never
      // the display order.
      const scanSize = pageSize + SAME_TS_BUFFER;
      const docs = await topLevelByCreatedDesc(ctx, cursor, scanSize);
      const selection = selectFeedPage(
        docs,
        (doc) => cursor === null || isAfterCursor(doc, cursor),
        pageSize,
        docs.length < scanSize
      );
      chronicles = rankForYouChronicles(
        selection.items,
        selection.items.length,
        sanitizeNowBucketMs(nowBucketMs ?? Date.now())
      );
      continueCursor = selection.continueCursor;
      isDone = selection.isDone;
    } else if (feed === "following") {
      const followerId = await requireAuthenticatedUserId(ctx);
      const follows = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", followerId))
        .order("desc")
        .take(FOLLOWING_MAX_FOLLOWEES);
      const allowedAuthors = new Set([
        followerId,
        ...follows.map((follow) => follow.followeeId),
      ]);

      const docs = await topLevelByCreatedDesc(ctx, cursor, FOLLOWING_PAGE_MAX_SCAN);
      const selection = selectFeedPage(
        docs,
        (doc) =>
          (cursor === null || isAfterCursor(doc, cursor)) &&
          allowedAuthors.has(doc.authorId),
        pageSize,
        docs.length < FOLLOWING_PAGE_MAX_SCAN
      );
      chronicles = selection.items;
      continueCursor = selection.continueCursor;
      isDone = selection.isDone;
    } else if (feed === "author") {
      if (!authorId) throw new Error("authorId is required for the author feed");
      // by_author_and_created matches the cursor's createdAt ordering — the
      // plain by_author index orders by _creationTime, which is not
      // guaranteed to agree with createdAt.
      const docs = await ctx.db
        .query("chronicles")
        .withIndex("by_author_and_created", (q) => {
          const base = q.eq("authorId", authorId);
          return cursor ? base.lte("createdAt", cursor.t) : base;
        })
        .order("desc")
        .take(AUTHOR_PAGE_MAX_SCAN);
      const selection = selectFeedPage(
        docs,
        (doc) =>
          doc.parentChronicleId === undefined &&
          (cursor === null || isAfterCursor(doc, cursor)),
        pageSize,
        docs.length < AUTHOR_PAGE_MAX_SCAN
      );
      chronicles = selection.items;
      continueCursor = selection.continueCursor;
      isDone = selection.isDone;
    } else {
      const userId = await requireAuthenticatedUserId(ctx);
      const table =
        feed === "bookmarks" ? "bookmarks" : feed === "likes" ? "likes" : "reposts";
      const result = await reactionFeedPage(ctx, table, userId, cursor, pageSize);
      chronicles = result.chronicles;
      continueCursor = result.continueCursor;
      isDone = result.isDone;
    }

    const page = await hydrateFeedPage(ctx, chronicles);

    // Telemetry: visible in the Convex dashboard alongside execution time.
    console.log(
      `[feedPage] feed=${feed} returned=${page.length} cursor=${cursor !== null} done=${isDone}`
    );

    return {
      page,
      isDone,
      continueCursor: continueCursor ?? "",
    };
  },
});

export const create = mutation({
  args: {
    text: v.string(),
    highlightText: v.optional(v.string()),
    bookTitle: v.optional(v.string()),
    bookRef: v.optional(v.string()),
    spoilerTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    assertChronicleContent(args);
    return ctx.db.insert("chronicles", {
      authorId: userId,
      text: args.text,
      highlightText: args.highlightText,
      bookTitle: args.bookTitle,
      bookRef: args.bookRef,
      spoilerTag: args.spoilerTag,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const like = mutation({
  args: {
    chronicleId: v.id("chronicles"),
  },
  handler: async (ctx, { chronicleId }) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_chronicle", (q) =>
        q.eq("userId", userId).eq("chronicleId", chronicleId)
      )
      .unique();

    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) return;

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(chronicleId, {
        likeCount: Math.max(0, chronicle.likeCount - 1),
      });
    } else {
      await ctx.db.insert("likes", { userId, chronicleId, createdAt: Date.now() });
      await ctx.db.patch(chronicleId, { likeCount: chronicle.likeCount + 1 });
    }
  },
});

export const repost = mutation({
  args: {
    chronicleId: v.id("chronicles"),
  },
  handler: async (ctx, { chronicleId }) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("reposts")
      .withIndex("by_user_and_chronicle", (q) =>
        q.eq("userId", userId).eq("chronicleId", chronicleId)
      )
      .unique();

    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) return;

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(chronicleId, {
        repostCount: Math.max(0, chronicle.repostCount - 1),
      });
    } else {
      await ctx.db.insert("reposts", { userId, chronicleId, createdAt: Date.now() });
      await ctx.db.patch(chronicleId, { repostCount: chronicle.repostCount + 1 });
    }
  },
});

export const bookmark = mutation({
  args: {
    chronicleId: v.id("chronicles"),
  },
  handler: async (ctx, { chronicleId }) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_chronicle", (q) =>
        q.eq("userId", userId).eq("chronicleId", chronicleId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return;
    }

    // Match like/repost: never bookmark a deleted or nonexistent chronicle.
    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) return;

    await ctx.db.insert("bookmarks", { userId, chronicleId, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: {
    chronicleId: v.id("chronicles"),
  },
  handler: async (ctx, { chronicleId }) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) return;
    if (chronicle.authorId !== userId) return;

    if (chronicle.parentChronicleId) {
      const parent = await ctx.db.get(chronicle.parentChronicleId);
      if (parent) {
        await ctx.db.patch(parent._id, {
          replyCount: Math.max(0, parent.replyCount - 1),
        });
      }
    }

    const remainingQueue = await processCascadeBatch(ctx, [chronicleId]);
    await scheduleCascadeIfNeeded(ctx, remainingQueue);
  },
});

export const deleteCascadeBatch = internalMutation({
  args: {
    queue: v.array(v.id("chronicles")),
  },
  handler: async (ctx, args) => {
    const remainingQueue = await processCascadeBatch(ctx, args.queue);
    await scheduleCascadeIfNeeded(ctx, remainingQueue);
  },
});

export const addReply = mutation({
  args: {
    parentChronicleId: v.id("chronicles"),
    text: v.string(),
  },
  handler: async (ctx, { parentChronicleId, text }) => {
    const userId = await requireAuthenticatedUserId(ctx);
    assertChronicleContent({ text });

    // Validate parent exists before inserting to avoid orphaned replies.
    const parent = await ctx.db.get(parentChronicleId);
    if (!parent) throw new Error("Parent chronicle not found");

    const replyId = await ctx.db.insert("chronicles", {
      authorId: userId,
      text,
      parentChronicleId,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.patch(parentChronicleId, {
      replyCount: parent.replyCount + 1,
    });

    return replyId;
  },
});
