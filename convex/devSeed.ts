import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Dev-only seeding helpers for exercising feed pagination locally:
 *
 *   npx convex run devSeed:seed '{"count": 45}'
 *   npx convex run devSeed:cleanup
 *
 * Internal mutations — not callable from clients. Seeded rows are marked by
 * the `seed-user-` author prefix so cleanup can find everything it created.
 */

const SEED_AUTHOR_PREFIX = "seed-user-";
const SEED_AUTHOR_COUNT = 3;

export const seed = internalMutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, { count = 45 }) => {
    const now = Date.now();

    for (let i = 0; i < SEED_AUTHOR_COUNT; i++) {
      const clerkId = `${SEED_AUTHOR_PREFIX}${i}`;
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
        .unique();
      if (!existing) {
        await ctx.db.insert("users", {
          clerkId,
          email: `${clerkId}@example.test`,
          name: `Seed Reader ${i + 1}`,
          handle: `seedreader${i + 1}`,
          searchText: `seed reader ${i + 1} seedreader${i + 1}`,
        });
      }
    }

    const ids = [];
    for (let i = 0; i < count; i++) {
      const id = await ctx.db.insert("chronicles", {
        authorId: `${SEED_AUTHOR_PREFIX}${i % SEED_AUTHOR_COUNT}`,
        text: `[seed] chronicle #${i + 1} — pagination test post`,
        likeCount: (i * 7) % 23,
        replyCount: 0,
        repostCount: (i * 3) % 11,
        createdAt: now - i * 60_000,
      });
      ids.push(id);
    }

    // A few replies on the newest chronicle to exercise lazy reply loading.
    for (let r = 0; r < 3; r++) {
      await ctx.db.insert("chronicles", {
        authorId: `${SEED_AUTHOR_PREFIX}${r % SEED_AUTHOR_COUNT}`,
        text: `[seed] reply #${r + 1}`,
        parentChronicleId: ids[0],
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        createdAt: now - r * 1000,
      });
    }
    await ctx.db.patch(ids[0], { replyCount: 3 });

    return { inserted: count, replies: 3 };
  },
});

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;
    for (let i = 0; i < SEED_AUTHOR_COUNT; i++) {
      const authorId = `${SEED_AUTHOR_PREFIX}${i}`;
      const chronicles = await ctx.db
        .query("chronicles")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .collect();
      for (const chronicle of chronicles) {
        await ctx.db.delete(chronicle._id);
        deleted += 1;
      }
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", authorId))
        .unique();
      if (user) await ctx.db.delete(user._id);
    }
    return { deleted };
  },
});
