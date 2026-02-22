import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAuthenticatedUserId } from "./lib/auth";

const LIST_DEFAULT_LIMIT = 20;
const REPLIES_DEFAULT_LIMIT = 50;
const REPLIES_MAX_LIMIT = 100;
const CASCADE_NODE_BATCH_SIZE = 20;
const CASCADE_CHILD_PAGE_SIZE = 20;
const CASCADE_REACTION_PAGE_SIZE = 50;

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
    return ctx.db.query("chronicles").withIndex("by_created").order("desc").take(limit);
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
    } else {
      await ctx.db.insert("bookmarks", { userId, chronicleId, createdAt: Date.now() });
    }
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
