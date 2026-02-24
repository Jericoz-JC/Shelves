# Convex Chronicles Intake Review — Issue #20

> **Reviewer:** Claude
> **Date:** 2026-02-22
> **Scope:** All Convex backend functions, schema, hooks, and UI wiring for the Chronicles social feature

---

## Summary

The Convex backend for Chronicles is **structurally sound** — schema design, cascade deletion, auth gating, and mutation logic are well-implemented. However, there are **7 critical integration gaps** and **4 moderate issues** that prevent the Convex backend from being production-ready in the UI. The biggest problems are (0) an auth race condition causing the reported "Unauthorized" error, (1) per-user reaction state never reaching the client, and (2) the `list` query returning top-level posts and replies indiscriminately.

---

## Root Cause: Issue #20 — "Convex Chronicle could not Post"

**Error:** `Uncaught Error: Unauthorized at async handler (../convex/chronicles.ts:128:15)`

### What happens

1. User signs in via Clerk on the client.
2. `useAuth().userId` from `@clerk/clerk-react` becomes truthy immediately.
3. User posts a chronicle → `ensureAuthenticatedForWrite()` checks `userId` → returns `true`.
4. `createMutation()` fires, but the Convex client **has not yet received the Clerk JWT token**.
5. On the Convex server, `ctx.auth.getUserIdentity()` returns `null` → `requireAuthenticatedUserId()` throws `"Unauthorized"`.

### Root cause

**Auth race condition** — `useAuth().userId` (Clerk client state) and `useConvexAuth().isAuthenticated` (Convex token state) are two different signals. The hook was gating writes on the Clerk signal, but the Convex client needs its own token propagation to complete before mutations can carry auth.

After Clerk sign-in, `ConvexProviderWithClerk` must:
1. Request a JWT from Clerk's "convex" template.
2. Send it to the Convex backend.
3. Convex validates it against `auth.config.ts`.

Until step 3 completes, `useConvexAuth().isAuthenticated` remains `false` even though `useAuth().userId` is set.

### Fix applied

**File:** `src/hooks/useConvexChronicles.ts`

```diff
- import { useMutation, useQuery } from "convex/react";
+ import { useConvexAuth, useMutation, useQuery } from "convex/react";

  const { userId } = useAuth();
+ const { isAuthenticated, isLoading } = useConvexAuth();

  const ensureAuthenticatedForWrite = () => {
-   if (userId) return true;
-   void openSignIn();
+   if (isAuthenticated) return true;
+   // Don't prompt sign-in while the Convex JWT is still propagating.
+   if (!isLoading) void openSignIn();
    return false;
  };
```

`useConvexAuth().isAuthenticated` only becomes `true` after the Convex client has received and validated the JWT. The `isLoading` guard prevents a redundant sign-in prompt during the transient window where Clerk is signed in but the Convex token hasn't propagated yet.

---

## Additional Critical Issues (P0)

### 1. `isLiked` / `isReposted` / `isBookmarked` are hardcoded `false`

**Files:** `src/hooks/useConvexChronicles.ts:36-38`

```ts
isLiked: false,
isReposted: false,
isBookmarked: false,
```

The Convex `chronicles.list` query returns raw documents with no per-user join data. The hook maps these to the `Chronicle` type but has no way to populate the boolean flags. This means:

- The like/repost/bookmark buttons never show their active state after Convex round-trips.
- Filtered views (`/feed/bookmarks`, `/feed/likes`, `/feed/reposts`) in `Feed.tsx:141-149` always return **empty arrays** because they filter on these fields.
- The `navCounts` sidebar badges (`Feed.tsx:248-258`) always show `0` for bookmarks, likes, and reposts.

**Fix:** Add Convex queries that return the current user's liked/reposted/bookmarked chronicle IDs (e.g., `api.chronicles.userReactionIds`), then join them in the hook mapper. Alternatively, extend `chronicles.list` to accept an optional `userId` arg and batch-join against the `likes`, `reposts`, and `bookmarks` tables server-side.

---

### 2. `chronicles.list` returns both top-level posts AND replies

**File:** `convex/chronicles.ts:97-104`

```ts
export const list = query({
  handler: async (ctx, { limit = LIST_DEFAULT_LIMIT }) => {
    return ctx.db.query("chronicles").withIndex("by_created").order("desc").take(limit);
  },
});
```

The query has no filter on `parentChronicleId`. Replies (chronicles with a non-null `parentChronicleId`) appear in the main feed as standalone posts, which is wrong — they should only appear nested under their parent.

**Fix applied:** Added a compound index `by_parent_and_created` on `[parentChronicleId, createdAt]` to the schema and updated the `list` query to filter server-side:

```ts
return ctx.db
  .query("chronicles")
  .withIndex("by_parent_and_created", (q) => q.eq("parentChronicleId", undefined))
  .order("desc")
  .take(limit);
```

This reliably returns exactly `limit` top-level chronicles without the fragile `take(limit * 2) + filter + slice` heuristic.

---

### 3. Replies are not fetched from the server

**File:** `src/hooks/useConvexChronicles.ts:14-17`

```ts
// TODO (Phase 4.5): subscribe to api.chronicles.listReplies per expanded chronicle
const [localReplies, setLocalReplies] = useState<Record<string, Reply[]>>({});
```

The `replies` map returned by the hook contains only optimistic client-side replies added in the current session. Server-persisted replies are never fetched. When a user refreshes the page or opens the feed on another device, all reply threads appear empty.

**Fix:** Subscribe to `api.chronicles.listReplies` per expanded chronicle, or eagerly fetch replies for all visible chronicles and merge them with `localReplies`.

---

### 4. Follow system is entirely client-side

**File:** `src/pages/Feed.tsx:79-81`

```ts
const [followedIds, setFollowedIds] = useState<Set<string>>(
  new Set(["u1", "u2", "u3", "u4", "u5"])
);
```

The Convex `follows` table exists in the schema (`convex/schema.ts:63-70`) but has **zero mutations or queries**. The UI uses an in-memory `Set` seeded with mock user IDs. Follows don't persist across sessions, let alone across devices.

**Fix:** Implement `follows.follow`, `follows.unfollow`, and `follows.listFollowing` in Convex, then wire them into `Feed.tsx`.

---

### 5. User profiles rely entirely on mock data

**Files:** `src/data/mockFeed.ts` (via `getUserById`), `src/components/social/ChronicleCard.tsx:50-54`

```ts
const user = getUserById(chronicle.authorId) ?? {
  id: chronicle.authorId,
  displayName: chronicle.authorId === currentUserId ? "You" : "Reader",
  handle: chronicle.authorId === currentUserId ? "you" : "reader",
};
```

When Convex is the data source, `authorId` is a Clerk subject string (e.g., `user_2abc...`). The `getUserById()` function only knows about the 5 mock users (`u1`–`u5`). Every real Convex chronicle will render as "Reader" / "@reader" with no avatar.

**Fix:** Either:
- Add a `users.getByClerkId` query and fetch author profiles alongside chronicles.
- Denormalize author display name / handle / avatar URL onto the chronicle document at write time.
- Use Clerk's `useUser()` or `clerkClient.users.getUser()` to resolve profiles.

---

### 6. No `users` table mutations — Convex user record never created

**File:** `convex/schema.ts:5-9`

The `users` table is defined but there are **no mutations to create user records**. There is no Clerk webhook handler or `users.createOrGet` mutation. This means:

- The `users` table stays empty.
- Any future query that joins against `users` (e.g., fetching author profiles) will find no records.
- The `readingProgress` and `chronicles` tables reference `userId` as a raw Clerk subject string, but there's no canonical user record to join against.

**Fix:** Add a `users.createOrGet` mutation called on first sign-in (or a Clerk webhook `user.created` → Convex HTTP action).

---

## Moderate Issues (P1)

### 7. `chronicles.list` is unauthenticated — no spoiler filtering

**File:** `convex/chronicles.ts:97-104`

The `list` query doesn't call `requireAuthenticatedUserId`. This is intentional (allows anonymous feed browsing), but it means:
- The `spoilerTag` field on chronicles is stored but **never acted upon** — no server-side filtering.
- The CLAUDE.md architecture doc explicitly states: "Spoiler filtering server-side — never ship spoiler content to the client and hope JS hides it."

**Recommendation:** When a user is authenticated, join their `readingProgress` to determine which books they haven't finished, then filter out spoiler-tagged chronicles for those books.

---

### 8. Race condition in toggle mutations (like/repost/bookmark)

**File:** `convex/chronicles.ts:144-170` (and similar for repost/bookmark)

The like toggle reads the chronicle's `likeCount`, then patches it. Two concurrent like requests from different users could both read the same `likeCount` and produce an off-by-one count. Convex serializes mutations within a single document via OCC (optimistic concurrency control), so this is mostly mitigated by Convex's transaction model, but the code pattern of `read → compute → patch` is worth noting. If Convex ever relaxes serialization, this becomes a real bug.

**Recommendation:** No immediate action needed — Convex's transaction isolation handles this. But consider using an atomic increment helper if Convex adds one, or denormalize counts via a scheduled aggregation.

---

### 9. `bookmark` mutation doesn't validate chronicle existence

**File:** `convex/chronicles.ts:202-222`

Unlike `like` and `repost` (which both fetch the chronicle to check existence before toggling), `bookmark` inserts into the `bookmarks` table without verifying the chronicle exists. This allows bookmarking deleted or non-existent chronicles.

```ts
// like mutation checks:
const chronicle = await ctx.db.get(chronicleId);
if (!chronicle) return;

// bookmark mutation — no such check
```

**Fix:** Add `const chronicle = await ctx.db.get(chronicleId); if (!chronicle) return;` before the toggle logic.

---

### 10. Cascade deletion doesn't decrement parent `replyCount` for nested replies

**File:** `convex/chronicles.ts:24-85`

The `remove` mutation correctly decrements the parent's `replyCount` when deleting a direct reply (`chronicles.ts:235-242`). But the cascade batch processor (`processCascadeBatch`) deletes child replies of the deleted chronicle without adjusting any parent reply counts. This is correct only if the cascade always starts from the root being deleted — but if a reply has sub-replies and only the reply is deleted (not the root), the root's `replyCount` is decremented by 1, while the sub-replies are cascade-deleted without further count adjustments. This is technically correct for the current UI (no nested reply counts displayed), but worth documenting as a known simplification.

---

## Minor Issues (P2)

### 11. `createdAt` is set via `Date.now()` on the client-invoked mutation

**Files:** `convex/chronicles.ts:139`, `convex/chronicles.ts:278`

Using `Date.now()` inside a Convex mutation uses the server's clock, which is fine. But the field is a raw `number`, not a Convex system field. Consider using `_creationTime` (auto-set by Convex) instead of a manual `createdAt` to avoid any drift and simplify the schema.

---

### 12. `text` field has no length validation

**Files:** `convex/chronicles.ts:119-141`, `convex/chronicles.ts:259-287`

The `create` and `addReply` mutations accept `text: v.string()` with no maximum length. The UI has a 500-character limit (`ChronicleComposer`), but the backend allows arbitrarily long text. A malicious client could bypass the UI and submit very large payloads.

**Fix:** Add `v.string()` with a Convex custom validator or add a runtime check: `if (text.length > 2000) throw new Error("Text too long")`.

---

### 13. `ChronicleCard` username resolution breaks with Convex data

**File:** `src/components/social/ChronicleCard.tsx:50-54`

The component calls `getUserById(chronicle.authorId)` which only resolves mock user IDs. With Convex, `authorId` is either `"me"` (mapped in the hook) or a Clerk subject. The fallback to "Reader" / "@reader" is functional but provides a degraded experience.

---

### 14. No pagination or cursor-based fetching

**File:** `convex/chronicles.ts:97-104`

The `list` query uses `.take(limit)` which is offset-based. The CLAUDE.md optimization roadmap (Phase 2) explicitly calls for cursor-based pagination: "Pagination: cursor-based (by `createdAt` + `_id`), never offset-based." For now this works, but infinite scroll will need a cursor.

---

## Architecture Assessment

| Aspect | Grade | Notes |
|--------|-------|-------|
| Schema design | **B+** | Well-indexed, proper separation of concerns. Missing `users` mutations. |
| Auth security | **A-** | All write mutations gated. `list` query intentionally open. Bookmark missing existence check. |
| Cascade deletion | **A** | Sophisticated batch + scheduler pattern, handles deep threads safely. |
| Frontend integration | **D** | Hook exists but critical per-user state missing. Feed filters broken. Replies not fetched. |
| Data consistency | **B** | Toggle mutations are correct under Convex's serialization. Count denormalization is sound. |
| Production readiness | **C-** | Backend is 70% complete; frontend wiring is 30% complete. |

---

## Recommended Priority Order

1. **Filter replies out of `chronicles.list`** — Replies appearing as top-level posts is a visible bug.
2. **Add per-user reaction state queries** — Without this, like/bookmark/repost buttons are non-functional after round-trip.
3. **Fetch server replies in `useConvexChronicles`** — Reply threads must persist across sessions.
4. **Add user record creation flow** — Required for profile resolution and follows.
5. **Wire follows to Convex** — Currently fully ephemeral.
6. **Add text length validation on backend** — Defense in depth.
7. **Validate chronicle existence in `bookmark` mutation** — Consistency with like/repost.
8. **Implement spoiler filtering** — Per architecture doc requirement.
