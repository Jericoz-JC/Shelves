# Shelves

Shelves is a local-first ePub reader with social posting ("Chronicles"), built on React + Vite with Clerk authentication and Convex backend functions.

## Tech Stack
- React 19 + TypeScript + Vite 7
- React Router 7
- Tailwind CSS v4 + shadcn/ui + Radix UI
- Convex (database, queries, mutations, scheduler)
- Clerk (authentication)
- IndexedDB (`idb`) for local ePub files and reader state
- `epub.js` for parsing/rendering ePub content
- Vitest + Testing Library for tests

## Current Product Areas
- Library
  - Upload ePub books
  - Local storage of ePub binaries and metadata in IndexedDB
  - Header auth controls (`Log-In` for signed-out users, Clerk user menu for signed-in users)
- Reader
  - ePub rendering, chapter navigation, highlights, bookmarks
  - Reading progress tracking (local persistence + Convex sync when authenticated)
  - Reading themes and typography controls
- Chronicles Feed
  - Create chronicle posts and replies
  - Like, repost, bookmark, delete
  - Signed-out write actions are auth-gated via Clerk sign-in modal
  - Backend cleanup uses batched/scheduled cascade deletion to avoid oversized Convex transactions

## Architecture Notes
- Local-first remains primary for reading:
  - Books and immediate reader progress are persisted locally in IndexedDB
- Convex is actively wired for social + cloud sync:
  - `convex/chronicles.ts`
  - `convex/readingProgress.ts`
  - `convex/userPreferences.ts`
  - `convex/books.ts`
- Auth is Clerk -> Convex JWT (`convex/auth.config.ts`)

## Social Feed Backend (Issue #22)

### Convex Schema
The social system now persists feed/discovery state in Convex (not React mock state):

- `users`
  - Fields: `clerkId`, `email`, optional `name`, optional `handle`, optional `bio`, optional `avatarUrl`, optional `searchText`
  - Indexes: `by_clerk_id`, `by_handle`
  - Search index: `search_users` on `searchText`
- `follows`
  - Fields: `followerId`, `followeeId`, `createdAt`
  - Indexes: `by_follower`, `by_followee`, `by_follower_and_followee`
- `chronicles`
  - Fields: post content + counters (`likeCount`, `replyCount`, `repostCount`) + threading via `parentChronicleId`
  - Indexes include `by_parent_and_created` (top-level feed reads) and `by_parent_chronicle` (reply reads)
- `likes`, `reposts`, `bookmarks`
  - Store per-user reaction rows and support `by_user`, `by_chronicle`, `by_user_and_chronicle` access patterns

### User and Handle Flow
- `users.createOrGet` provisions/updates the signed-in user from Clerk identity.
- Handles are generated with deterministic candidates (`convex/lib/userHandles.ts`), sanitized to lowercase alphanumeric+underscore.
- Handle uniqueness is enforced in mutation logic by querying `users.by_handle` before insert/update.
- `users.search` uses Convex full-text search on `searchText` (name + handle only; email is not indexed for search).
- `users.getBatch` is batch-limited (`max 100`) for feed author resolution.

### Follow Graph Flow
- `follows.follow`
  - Requires auth
  - Rejects self-follow
  - Verifies followee exists in `users`
  - Idempotent if relationship already exists
- `follows.unfollow` removes relationship if present
- `follows.listFollowing` is capped (`default 200`, `max 500`) and returns deduped followee IDs

### Feed Queries
Implemented in `convex/chronicles.ts`:

- `listForYou(limit, nowBucketMs)`
  - Top-level chronicles only
  - Candidate pool capped (multiplier + hard max)
  - Ranked server-side
  - `nowBucketMs` is sanitized before ranking to avoid malformed client timestamps
- `listFollowing(limit)`
  - Auth-only
  - Includes own posts + followed users
  - Reverse-chronological from bounded pool
- `listByAuthor(limit, authorId)`
  - Used by profile feed route
- `listBookmarked`, `listLiked`, `listReposted`
  - Auth-only feeds from reaction tables
  - Dedupe chronicle IDs, fetch chronicle docs, return top-level entries
- `listRepliesBatch(parentIds, limitPerParent)`
  - Batched reply fetch with hard request cap (`max 100 parent IDs`)
- `userReactionStates(chronicleIds)`
  - Batched per-user `isLiked/isReposted/isBookmarked`
  - Hard request cap (`max 100 chronicle IDs`)

### Ranking Algorithm (For You)
Ranking is implemented in `convex/lib/feedRanking.ts` and applied in `listForYou`:

- Engagement score:
  - `0.5 * likeCount + 13.5 * replyCount + 1.0 * repostCount`
- Time decay:
  - `max(0.5, 2^(-hoursOld / 12))`
- Book bonus:
  - `x1.3` when `bookRef` is present
- Author diversity penalty:
  - Applied after base scoring as `1 / (1 + priorPostsByAuthorInRankedSet)`

Additional safeguards:
- Client `nowBucketMs` is clamped/sanitized (`0..4102444800000`) via `sanitizeNowBucketMs`.
- Frontend updates `nowBucketMs` every 60 seconds, so ranking naturally re-evaluates on a fixed cadence.

### Frontend Feed Wiring
- `useConvexChronicles(feedType)` supports:
  - `forYou`, `following`, `author`, `bookmarks`, `likes`, `reposts`
- Feed routes in `Feed.tsx` map to server-backed feed types:
  - `/feed` -> `forYou`
  - `/feed/following` -> `following`
  - `/feed/bookmarks` -> `bookmarks`
  - `/feed/likes` -> `likes`
  - `/feed/reposts` -> `reposts`
  - `/feed/profile/:userId` -> `author`
- Auth gating in hook queries avoids unauthorized Convex calls:
  - `following`, `bookmarks`, `likes`, `reposts`, and `userReactionStates` are skipped for signed-out users.
- Author profiles are resolved via `users.getBatch`; replies are resolved via `listRepliesBatch`.
- `UserSearch` performs debounced handle/name lookup (`300ms`) through `users.search` and links to profile routes.

### Deterministic Test Coverage
- `tests/feedRanking.test.ts`
  - Covers ranking weights, time-decay floor, diversity behavior, and `nowBucketMs` sanitization bounds.
- `tests/userHandles.test.ts`
  - Covers normalization/sanitization, validation, deterministic suffix generation, valid fallback candidate, and underscore edge cases.

## Environment Variables

### Frontend (`.env.local` for local dev, Vercel env vars for deploy)
- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

### Convex deployment env
- `CLERK_JWT_ISSUER_DOMAIN`

## Local Development
1. Install dependencies:
   - `npm install`
2. Start frontend:
   - `npm run dev`
3. Start Convex dev backend in another terminal:
   - `npx convex dev`
4. Open:
   - `http://localhost:5173`

## Convex Codegen Workflow
- After changing any file in `convex/` that adds/removes/renames public functions, regenerate client bindings:
  - `npx convex codegen`
- Commit updated generated files in `convex/_generated/`.
- If generated bindings are stale, `npm run build` will fail during TypeScript checks.

## Scripts
- `npm run dev` - start Vite dev server
- `npm run dev:harness` - start dev server opening `/reader-harness`
- `npm run build` - type-check and build production bundle
- `npm run preview` - preview production build
- `npm run test` - run all tests
- `npm run test:progress` - run reader-progress focused tests

## Reader Progress Harness
- Start with: `npm run dev:harness`
- Open: `http://localhost:5173/reader-harness`
- Console helpers:
  - `window.__readerHarness.next()`
  - `window.__readerHarness.prev()`
  - `window.__readerHarness.getProgress()`
  - `window.__readerHarness.getCfi()`

## Deployment Notes
- Vercel frontend must have:
  - `VITE_CONVEX_URL`
  - `VITE_CLERK_PUBLISHABLE_KEY`
- Convex deployment must have:
  - `CLERK_JWT_ISSUER_DOMAIN`

## License
MIT
