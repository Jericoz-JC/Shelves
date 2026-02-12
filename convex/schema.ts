import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  books: defineTable({
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
  }).index("by_file_hash", ["fileHash"]),

  readingProgress: defineTable({
    userId: v.string(),
    bookHash: v.string(),
    currentCFI: v.optional(v.string()),
    percentage: v.number(),
    lastReadAt: v.number(),
    chapter: v.optional(v.string()),
  })
    .index("by_user_and_book", ["userId", "bookHash"])
    .index("by_user", ["userId"]),

  userPreferences: defineTable({
    userId: v.string(),
    theme: v.string(),
    fontSize: v.number(),
    fontFamily: v.string(),
    lineHeight: v.number(),
  }).index("by_user", ["userId"]),

  chronicles: defineTable({
    authorId: v.string(),
    text: v.string(),
    bookRef: v.optional(v.string()),
    parentChronicleId: v.optional(v.id("chronicles")),
    spoilerTag: v.optional(v.boolean()),
    likeCount: v.number(),
    replyCount: v.number(),
    repostCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_created", ["createdAt"])
    .index("by_parent_chronicle", ["parentChronicleId"]),

  follows: defineTable({
    followerId: v.string(),
    followeeId: v.string(),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_followee", ["followeeId"])
    .index("by_follower_and_followee", ["followerId", "followeeId"]),

  likes: defineTable({
    userId: v.string(),
    chronicleId: v.id("chronicles"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chronicle", ["chronicleId"])
    .index("by_user_and_chronicle", ["userId", "chronicleId"]),
});
