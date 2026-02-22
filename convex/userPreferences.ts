import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function requireAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity.subject;
}

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
