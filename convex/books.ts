import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createBook = mutation({
  args: {
    fileHash: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    totalLocations: v.optional(v.number()),
    fileSizeBytes: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        publisher: v.optional(v.string()),
        language: v.optional(v.string()),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("books")
      .withIndex("by_file_hash", (q) => q.eq("fileHash", args.fileHash))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("books", args);
  },
});

export const getBook = query({
  args: { fileHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_file_hash", (q) => q.eq("fileHash", args.fileHash))
      .unique();
  },
});

export const listBooks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("books").collect();
  },
});
