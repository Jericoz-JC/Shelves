import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";
import { dedupeFolloweeIds, isSelfFollow } from "./lib/follows";

export const follow = mutation({
  args: {
    followeeId: v.string(),
  },
  handler: async (ctx, { followeeId }) => {
    const followerId = await requireAuthenticatedUserId(ctx);
    if (isSelfFollow(followerId, followeeId)) {
      throw new Error("Cannot follow yourself");
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert("follows", {
      followerId,
      followeeId,
      createdAt: Date.now(),
    });
  },
});

export const unfollow = mutation({
  args: {
    followeeId: v.string(),
  },
  handler: async (ctx, { followeeId }) => {
    const followerId = await requireAuthenticatedUserId(ctx);

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .unique();

    if (!existing) return null;
    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

export const listFollowing = query({
  args: {},
  handler: async (ctx) => {
    const followerId = await requireAuthenticatedUserId(ctx);
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", followerId))
      .collect();

    return dedupeFolloweeIds(rows.map((row) => row.followeeId));
  },
});

export const isFollowing = query({
  args: {
    followeeId: v.string(),
  },
  handler: async (ctx, { followeeId }) => {
    const followerId = await requireAuthenticatedUserId(ctx);
    const row = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", followerId).eq("followeeId", followeeId)
      )
      .unique();

    return row !== null;
  },
});
