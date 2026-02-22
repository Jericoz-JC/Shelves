import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";

export const updatePreferences = mutation({
  args: {
    theme: v.string(),
    fontSize: v.number(),
    fontFamily: v.string(),
    lineHeight: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

    return ctx.db.insert("userPreferences", {
      userId,
      theme: args.theme,
      fontSize: args.fontSize,
      fontFamily: args.fontFamily,
      lineHeight: args.lineHeight,
    });
  },
});

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthenticatedUserId(ctx);
    return ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});
