import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";

export const updateProgress = mutation({
  args: {
    bookHash: v.string(),
    currentCFI: v.optional(v.string()),
    percentage: v.number(),
    lastReadAt: v.number(),
    chapter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_book", (q) => q.eq("userId", userId).eq("bookHash", args.bookHash))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentCFI: args.currentCFI,
        percentage: args.percentage,
        lastReadAt: args.lastReadAt,
        chapter: args.chapter,
      });
      return existing._id;
    }

    return ctx.db.insert("readingProgress", {
      userId,
      bookHash: args.bookHash,
      currentCFI: args.currentCFI,
      percentage: args.percentage,
      lastReadAt: args.lastReadAt,
      chapter: args.chapter,
    });
  },
});

export const getProgress = query({
  args: {
    bookHash: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    return ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_book", (q) => q.eq("userId", userId).eq("bookHash", args.bookHash))
      .unique();
  },
});

export const listUserProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
