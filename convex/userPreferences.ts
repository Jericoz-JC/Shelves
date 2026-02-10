import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updatePreferences = mutation({
  args: {
    userId: v.string(),
    theme: v.string(),
    fontSize: v.number(),
    fontFamily: v.string(),
    lineHeight: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        theme: args.theme,
        fontSize: args.fontSize,
        fontFamily: args.fontFamily,
        lineHeight: args.lineHeight,
      });
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", args);
  },
});

export const getPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});
