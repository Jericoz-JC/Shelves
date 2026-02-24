import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";
import { dedupeFolloweeIds, isSelfFollow } from "./lib/follows";

const LIST_FOLLOWING_DEFAULT_LIMIT = 200;
const LIST_FOLLOWING_MAX_LIMIT = 500;

export const follow = mutation({
  args: {
    followeeId: v.string(),
  },
  handler: async (ctx, { followeeId }) => {
    const followerId = await requireAuthenticatedUserId(ctx);
    if (isSelfFollow(followerId, followeeId)) {
      throw new Error("Cannot follow yourself");
    }

    const followee = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", followeeId))
      .unique();
    if (!followee) {
      throw new Error("Followee not found");
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
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const followerId = await requireAuthenticatedUserId(ctx);
    const safeLimit = Math.max(
      1,
      Math.min(limit ?? LIST_FOLLOWING_DEFAULT_LIMIT, LIST_FOLLOWING_MAX_LIMIT)
    );
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", followerId))
      .order("desc")
      .take(safeLimit);

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
