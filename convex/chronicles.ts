import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const LIST_DEFAULT_LIMIT = 20;
const REPLIES_DEFAULT_LIMIT = 50;
const REPLIES_MAX_LIMIT = 100;

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = LIST_DEFAULT_LIMIT }) => {
    return ctx.db
      .query("chronicles")
      .withIndex("by_created")
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
      .withIndex("by_parent_chronicle", (q) =>
        q.eq("parentChronicleId", parentId)
      )
      .order("asc")
      .take(Math.min(limit, REPLIES_MAX_LIMIT)),
});

export const create = mutation({
  args: {
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
    text: v.string(),
    highlightText: v.optional(v.string()),
    bookTitle: v.optional(v.string()),
    bookRef: v.optional(v.string()),
    spoilerTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chronicles", {
      authorId: args.userId,
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
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
  },
  handler: async (ctx, { chronicleId, userId }) => {
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
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
  },
  handler: async (ctx, { chronicleId, userId }) => {
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
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
  },
  handler: async (ctx, { chronicleId, userId }) => {
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
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
  },
  handler: async (ctx, { chronicleId, userId }) => {
    const chronicle = await ctx.db.get(chronicleId);
    if (!chronicle) return;
    if (chronicle.authorId !== userId) return;

    // Cascade-delete orphaned likes, reposts, bookmarks, and direct child replies
    const [likes, reposts, bookmarks, childReplies] = await Promise.all([
      ctx.db.query("likes").withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId)).collect(),
      ctx.db.query("reposts").withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId)).collect(),
      ctx.db.query("bookmarks").withIndex("by_chronicle", (q) => q.eq("chronicleId", chronicleId)).collect(),
      ctx.db.query("chronicles").withIndex("by_parent_chronicle", (q) => q.eq("parentChronicleId", chronicleId)).collect(),
    ]);

    await Promise.all([
      ...likes.map((r) => ctx.db.delete(r._id)),
      ...reposts.map((r) => ctx.db.delete(r._id)),
      ...bookmarks.map((r) => ctx.db.delete(r._id)),
      ...childReplies.map((r) => ctx.db.delete(r._id)),
    ]);

    await ctx.db.delete(chronicleId);
  },
});

export const addReply = mutation({
  args: {
    parentChronicleId: v.id("chronicles"),
    text: v.string(),
    // TODO: replace client-supplied userId with authenticated session identity (Clerk) before production
    userId: v.string(),
  },
  handler: async (ctx, { parentChronicleId, text, userId }) => {
    // Validate parent exists before inserting to avoid orphaned replies
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
