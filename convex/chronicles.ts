/**
 * Chronicles Convex mutations — Phase 4 scaffold.
 *
 * These are wired to the schema but not yet connected to the UI.
 * UI currently uses useChronicles (localStorage) from src/hooks/useChronicles.ts.
 * Swap the import in Feed.tsx and Reader.tsx when Phase 4 auth wiring begins.
 *
 * TODO before activating:
 *   - Wire Clerk userId into ctx.auth in each mutation.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    return ctx.db
      .query("chronicles")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    text: v.string(),
    // TODO: remove v.optional once schema is extended with these fields
    highlightText: v.optional(v.string()),
    bookTitle: v.optional(v.string()),
    bookRef: v.optional(v.string()),
    spoilerTag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: replace "anonymous" with ctx.auth.getUserIdentity()?.subject
    const authorId = "anonymous";

    return ctx.db.insert("chronicles", {
      authorId,
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
    // TODO: replace "anonymous" with authenticated userId
    const userId = "anonymous";

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
      await ctx.db.insert("likes", {
        userId,
        chronicleId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(chronicleId, {
        likeCount: chronicle.likeCount + 1,
      });
    }
  },
});

export const remove = mutation({
  args: {
    chronicleId: v.id("chronicles"),
  },
  handler: async (ctx, { chronicleId }) => {
    // TODO: verify ownership via ctx.auth before deleting
    await ctx.db.delete(chronicleId);
  },
});

export const addReply = mutation({
  args: {
    parentChronicleId: v.id("chronicles"),
    text: v.string(),
  },
  handler: async (ctx, { parentChronicleId, text }) => {
    // TODO: replace "anonymous" with authenticated userId
    const authorId = "anonymous";

    const replyId = await ctx.db.insert("chronicles", {
      authorId,
      text,
      parentChronicleId,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      createdAt: Date.now(),
    });

    const parent = await ctx.db.get(parentChronicleId);
    if (parent) {
      await ctx.db.patch(parentChronicleId, {
        replyCount: parent.replyCount + 1,
      });
    }

    return replyId;
  },
});
