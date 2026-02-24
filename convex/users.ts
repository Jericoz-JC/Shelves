import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAuthenticatedUserId } from "./lib/auth";
import {
  buildHandleCandidates,
  buildUserSearchText,
  deriveHandleSeed,
  isValidHandle,
  sanitizeHandleCandidate,
} from "./lib/userHandles";

const USERS_BATCH_MAX_IDS = 100;

type IdentityShape = {
  subject: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

function getIdentityField(
  identity: IdentityShape,
  key: "email" | "name" | "pictureUrl"
): string | undefined {
  const value = identity[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

async function reserveUniqueHandle(
  ctx: MutationCtx,
  seed: string,
  excludeUserId?: string
): Promise<string> {
  const candidates = buildHandleCandidates(seed);
  for (const candidate of candidates) {
    if (!isValidHandle(candidate)) continue;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", candidate))
      .unique();
    if (!existing || existing.clerkId === excludeUserId) {
      return candidate;
    }
  }
  throw new Error("Unable to reserve a unique handle");
}

export const createOrGet = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireAuthenticatedUserId(ctx);
    const identity = (await ctx.auth.getUserIdentity()) as IdentityShape | null;
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    const name = getIdentityField(identity, "name");
    const email = getIdentityField(identity, "email") ?? "";
    const avatarUrl = getIdentityField(identity, "pictureUrl");

    if (existing) {
      const hasHandle = typeof existing.handle === "string" && existing.handle.length > 0;
      const nextHandle = hasHandle
        ? existing.handle
        : await reserveUniqueHandle(
            ctx,
            deriveHandleSeed({ name: existing.name ?? name, email: existing.email, clerkId }),
            clerkId
          );

      const nextEmail = existing.email || email;
      const nextName = existing.name ?? name;
      const nextAvatarUrl = existing.avatarUrl ?? avatarUrl;
      const nextSearchText = buildUserSearchText({
        name: nextName,
        handle: nextHandle,
      });

      const shouldPatch =
        existing.email !== nextEmail ||
        existing.name !== nextName ||
        existing.avatarUrl !== nextAvatarUrl ||
        existing.handle !== nextHandle ||
        existing.searchText !== nextSearchText;

      if (shouldPatch) {
        await ctx.db.patch(existing._id, {
          email: nextEmail,
          name: nextName,
          avatarUrl: nextAvatarUrl,
          handle: nextHandle,
          searchText: nextSearchText,
        });
      }

      return existing._id;
    }

    const handle = await reserveUniqueHandle(
      ctx,
      deriveHandleSeed({ name, email, clerkId }),
      clerkId
    );

    return ctx.db.insert("users", {
      clerkId,
      email,
      name,
      avatarUrl,
      handle,
      searchText: buildUserSearchText({ name, handle }),
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const clerkId = await requireAuthenticatedUserId(ctx);
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, { clerkId }) =>
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique(),
});

export const getBatch = query({
  args: {
    clerkIds: v.array(v.string()),
  },
  handler: async (ctx, { clerkIds }) => {
    const uniqueClerkIds = [...new Set(clerkIds)];
    if (uniqueClerkIds.length > USERS_BATCH_MAX_IDS) {
      throw new Error(`Too many clerkIds requested. Max is ${USERS_BATCH_MAX_IDS}.`);
    }
    const users = await Promise.all(
      uniqueClerkIds.map((clerkId) =>
        ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .unique()
      )
    );

    return users.filter((user) => user !== null);
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 8 }) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("searchText", normalizedQuery))
      .take(Math.max(1, Math.min(limit, 20)));
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    handle: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = await requireAuthenticatedUserId(ctx);
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!me) {
      throw new Error("User profile not found. Call createOrGet before updating profile.");
    }

    const normalizedHandle = sanitizeHandleCandidate(args.handle);
    if (!isValidHandle(normalizedHandle)) {
      throw new Error("Invalid handle format");
    }

    const existingHandleOwner = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .unique();

    if (existingHandleOwner && existingHandleOwner._id !== me._id) {
      throw new Error("Handle is already taken");
    }

    const name = args.name.trim() || me.name || "Reader";
    const bio = args.bio?.trim();
    const nextBio = bio && bio.length > 0 ? bio : undefined;
    const nextSearchText = buildUserSearchText({
      name,
      handle: normalizedHandle,
    });

    const shouldPatch =
      me.name !== name ||
      me.handle !== normalizedHandle ||
      me.bio !== nextBio ||
      me.searchText !== nextSearchText;

    if (shouldPatch) {
      await ctx.db.patch(me._id, {
        name,
        handle: normalizedHandle,
        bio: nextBio,
        searchText: nextSearchText,
      });
    }

    return me._id;
  },
});
