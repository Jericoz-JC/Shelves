import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateProgress = mutation({
  args: {
    userId: v.string(),
    bookHash: v.string(),
    currentCFI: v.optional(v.string()),
    percentage: v.number(),
    lastReadAt: v.number(),
    chapter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", args.userId).eq("bookHash", args.bookHash)
      )
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

    return await ctx.db.insert("readingProgress", args);
  },
});

export const getProgress = query({
  args: {
    userId: v.string(),
    bookHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readingProgress")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", args.userId).eq("bookHash", args.bookHash)
      )
      .unique();
  },
});

export const listUserProgress = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
