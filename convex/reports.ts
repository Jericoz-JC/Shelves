import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";

const REASONS = ["spam", "abuse", "spoilers", "other"] as const;
const DETAIL_MAX = 500;
const MAX_OPEN_REPORTS_PER_REPORTER = 50;

/** File a report against a user profile or a chronicle. Idempotent per
 * reporter+target: re-reporting the same target updates the existing open
 * report instead of stacking duplicates. */
export const create = mutation({
  args: {
    targetType: v.union(v.literal("user"), v.literal("chronicle")),
    targetClerkId: v.optional(v.string()),
    chronicleId: v.optional(v.id("chronicles")),
    reason: v.union(
      v.literal("spam"),
      v.literal("abuse"),
      v.literal("spoilers"),
      v.literal("other")
    ),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporterId = await requireAuthenticatedUserId(ctx);

    if (!REASONS.includes(args.reason)) throw new Error("Invalid reason");
    if (args.detail && args.detail.length > DETAIL_MAX) {
      throw new Error(`detail exceeds ${DETAIL_MAX} characters`);
    }

    if (args.targetType === "user") {
      if (!args.targetClerkId) throw new Error("targetClerkId is required");
      if (args.targetClerkId === reporterId) throw new Error("Cannot report yourself");
    } else if (!args.chronicleId) {
      throw new Error("chronicleId is required");
    }

    if (args.targetType === "chronicle") {
      const chronicle = await ctx.db.get(args.chronicleId!);
      if (!chronicle) throw new Error("Chronicle not found");
      if (chronicle.authorId === reporterId) throw new Error("Cannot report your own post");
    }

    // Abuse guard: cap how many open reports a single account can file.
    const reporterOpen = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", reporterId))
      .take(MAX_OPEN_REPORTS_PER_REPORTER);
    if (reporterOpen.length >= MAX_OPEN_REPORTS_PER_REPORTER) {
      throw new Error("Report limit reached");
    }

    // Dedupe: one open report per reporter per target.
    const existing = reporterOpen.find(
      (report) =>
        report.status === "open" &&
        report.targetType === args.targetType &&
        (args.targetType === "user"
          ? report.targetClerkId === args.targetClerkId
          : report.chronicleId === args.chronicleId)
    );
    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        detail: args.detail,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("reports", {
      reporterId,
      targetType: args.targetType,
      targetClerkId: args.targetType === "user" ? args.targetClerkId : undefined,
      chronicleId: args.targetType === "chronicle" ? args.chronicleId : undefined,
      reason: args.reason,
      detail: args.detail,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

/** Admin/dashboard use: npx convex run reports:listOpen */
export const listOpen = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) =>
    ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(Math.min(limit, 200)),
});
