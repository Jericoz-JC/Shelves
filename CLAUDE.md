# Shelves â€” Master Plan

> **Domain:** shelves.cloud
> **Repo:** flux-reader (legacy name)
> **What:** A local-first ePub reader with a social reading network ("Chronicles")

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| ePub engine | epub.js 0.3.93 |
| Local storage | IndexedDB (via `idb` 8.0.3) |
| Backend | Convex 1.31 (scaffolded, not wired) |
| Auth (planned) | Clerk |
| Blob storage (planned) | Cloudflare R2 |
| Animation | Motion 12 |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Current State

### What's Built

**Reader core** â€” fully functional ePub reader:
- 4 reading themes (Paper / Night / Focus / Sepia)
- Font size & family controls
- Chapter navigation with per-chapter progress
- Reading speed calculation & ETA
- Progress scrubber, auto-save/resume position
- Per-book settings, keyboard navigation, safe-area insets

**Library** â€” book collection management:
- ePub upload with SHA-256 dedup
- Cover extraction, responsive grid layout
- Long-press delete with confirmation
- Loading skeletons, empty state

**Social feed** (`feature/social-feed` branch) â€” Chronicles UI with mock data:
- Twitter-like timeline with "For You" / "Following" tabs
- Chronicle composer, like/repost/reply/bookmark actions
- User profiles with follow/unfollow, profile editing
- Book collection grids on profiles
- Animated reply threads, relative timestamps
- 5 mock users, 10 mock chronicles, 12 mock replies

**Convex schema** â€” scaffolded tables (not connected to UI):
- `users`, `books`, `readingProgress`, `userPreferences`
- `chronicles`, `follows`, `likes` (social)

### What's Not Built Yet
- Auth (Clerk integration)
- Convex â†” UI wiring
- R2 blob storage pipeline
- Cross-device sync
- Real social backend (currently mock data)
- PWA / offline support
- Video Reels

---

## File Structure

```text
flux-reader/
â”œâ”€â”€ convex/
â”‚   â”œâ”€â”€ schema.ts              # 7 tables: users, books, readingProgress,
â”‚   â”‚                          #   userPreferences, chronicles, follows, likes
â”‚   â”œâ”€â”€ books.ts
â”‚   â”œâ”€â”€ readingProgress.ts
â”‚   â””â”€â”€ userPreferences.ts
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ library/
â”‚   â”‚   â”‚   â”œâ”€â”€ BookCard.tsx
â”‚   â”‚   â”‚   â””â”€â”€ BookUpload.tsx
â”‚   â”‚   â”œâ”€â”€ reader/
â”‚   â”‚   â”‚   â”œâ”€â”€ ReaderChapterSheet.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReaderControls.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReaderNavigation.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReaderProgress.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReaderScrubSheet.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ReaderTimeline.tsx
â”‚   â”‚   â”œâ”€â”€ social/
â”‚   â”‚   â”‚   â”œâ”€â”€ ChronicleActions.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ChronicleCard.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ChronicleComposer.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ChronicleReplies.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ FeedHeader.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ FeedTimeline.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ProfileBookGrid.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ProfileSettings.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ProfileSidebar.tsx
â”‚   â”‚   â”‚   â””â”€â”€ UserAvatar.tsx
â”‚   â”‚   â””â”€â”€ ui/                # 14 shadcn/ui components
â”‚   â”œâ”€â”€ data/
â”‚   â”‚   â”œâ”€â”€ mockFeed.ts        # 5 mock users, 10 chronicles
â”‚   â”‚   â””â”€â”€ mockReplies.ts     # 12 replies, user book collections
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useBookSettings.ts
â”‚   â”‚   â”œâ”€â”€ useChapterProgress.ts
â”‚   â”‚   â”œâ”€â”€ useChapters.ts
â”‚   â”‚   â”œâ”€â”€ useEpub.ts
â”‚   â”‚   â”œâ”€â”€ useIndexedDB.ts
â”‚   â”‚   â”œâ”€â”€ useReadingProgress.ts
â”‚   â”‚   â””â”€â”€ useReadingSpeed.ts
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”‚   â”œâ”€â”€ indexedDB.ts   # IndexedDBService (CRUD for all stores)
â”‚   â”‚   â”‚   â””â”€â”€ schema.ts     # ShelvesDB v1: 6 object stores
â”‚   â”‚   â”œâ”€â”€ epub/
â”‚   â”‚   â”‚   â”œâ”€â”€ epubLoader.ts
â”‚   â”‚   â”‚   â””â”€â”€ epubParser.ts
â”‚   â”‚   â”œâ”€â”€ theme/
â”‚   â”‚   â”‚   â””â”€â”€ readingThemes.ts  # Paper, Night, Focus, Sepia
â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚       â”œâ”€â”€ cn.ts
â”‚   â”‚       â”œâ”€â”€ fileHash.ts
â”‚   â”‚       â”œâ”€â”€ relativeTime.ts
â”‚   â”‚       â””â”€â”€ utils.ts
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ Feed.tsx
â”‚   â”‚   â”œâ”€â”€ Library.tsx
â”‚   â”‚   â””â”€â”€ Reader.tsx
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â”œâ”€â”€ book.ts
â”‚   â”‚   â”œâ”€â”€ epub.ts
â”‚   â”‚   â””â”€â”€ social.ts
â”‚   â”œâ”€â”€ App.tsx
â”‚   â”œâ”€â”€ main.tsx
â”‚   â””â”€â”€ router.tsx             # /, /library, /read/:bookId, /feed
â”œâ”€â”€ CLAUDE.md                  # â† this file
â”œâ”€â”€ vercel.json
â”œâ”€â”€ vite.config.ts
â””â”€â”€ package.json
```

### IndexedDB Stores (ShelvesDB v1)

| Store | Key | Contents |
|-------|-----|----------|
| `books` | fileHash | Raw ePub ArrayBuffers |
| `metadata` | fileHash | Title, author, cover URL, size, timestamps |
| `progress` | bookHash | CFI, percentage, last read, chapter |
| `locations` | bookHash | ePub location maps (JSON) |
| `notes` | id | Annotations (indexed by book) |
| `settings` | bookHash | Per-book preferences |

---

## Storage Architecture â€” R2 + Convex Split

**Principle:** Convex for fast, structured, real-time data. R2 for big, static blobs.

### What Goes Where

| Layer | Store | What Lives Here | Why |
|-------|-------|----------------|-----|
| Client | IndexedDB | ePub files (local cache), offline progress queue, reading positions | Instant offline access, zero-latency page turns |
| Edge Blobs | Cloudflare R2 | ePub files, cover images, video uploads (Reels), user avatars, exported highlights PDFs | Cheap bulk storage, zero egress fees, global CDN via CF |
| Real-time DB | Convex | Users, profiles, reading progress, social content (thoughts, discussions, reels metadata), follows, likes, notifications, spoiler tags, book catalog | Sub-100ms queries, real-time subscriptions, transactional writes, server-side spoiler filtering |

### Data Flow

**Book upload:**
1. User selects ePub â†’ stored in IndexedDB immediately (local-first, works offline)
2. Background sync: ePub uploaded to R2 via Convex action (presigned URL)
3. Convex mutation creates/links book record in bookCatalog with R2 key
4. Cover image extracted â†’ uploaded to R2 â†’ URL stored in Convex

**Reading progress:**
1. CFI + percentage written to IndexedDB on every page turn (instant)
2. Debounced sync (every 30s or on pause/close) â†’ Convex mutation
3. Convex record is the source of truth for social features (spoiler engine reads from here)

**Video (Reels):**
1. Client records/selects video
2. Upload directly to R2 via presigned URL (Convex action generates the URL)
3. Convex stores reel metadata: R2 key, caption, book tag, spoiler level, duration
4. Playback streams from R2 via Cloudflare CDN (or Cloudflare Stream for adaptive bitrate later)

**Social content (Thoughts, Discussions):**
- All text content lives in Convex â€” small, structured, needs real-time subscriptions
- Image attachments on Thoughts â†’ R2 (Convex stores the R2 URL)
- Feeds assembled server-side in Convex queries with spoiler filtering baked in

---

## Feature Roadmap (Phases 4â€“8)

> Phases 1â€“3 are complete (reader core, library, social UI with mock data).

### Phase 4 â€” Convex Social Backend
- Wire Chronicles, follows, likes to Convex mutations/queries
- Replace mock data with real-time Convex subscriptions
- Server-side feed assembly with pagination
- Real-time like/reply/repost counts

### Phase 5 â€” Auth (Clerk)
- Clerk integration with Convex
- User creation flow, profile setup
- Protected routes, session management

### Phase 6 â€” Cross-Device Sync
- IndexedDB â†” Convex sync engine (write-ahead log pattern)
- R2 upload pipeline with presigned URLs
- Lazy book hydration (metadata first, ePub on demand)
- Offline queue with conflict resolution

### Phase 7 â€” Reader Enhancements
- Highlights & annotations synced to Convex
- Reading streaks & statistics
- Book recommendations based on library overlap
- Spoiler engine (server-side filtering by reading progress)

### Phase 8 â€” PWA & Polish
- Service worker for full offline support
- Install prompt, push notifications
- Video Reels pipeline (R2 + Cloudflare Stream)

---

## Optimization Roadmap (Phases 1â€“5)

### Optimization Phase 1: Foundation (wire-up phase)

**IndexedDB â†” Convex sync engine:**
- Write-ahead log pattern: all writes hit IndexedDB first, then queue for Convex sync
- Conflict resolution: last-write-wins on reading progress (server timestamp), with client vector clock for edge cases
- Offline queue: mutations stored in IndexedDB when offline, replayed on reconnect
- Dedup: reading progress updates debounced to 30-second intervals

**R2 upload pipeline:**
- Convex action generates presigned PUT URLs â†’ client uploads directly to R2 (no proxying through Convex)
- Chunked uploads for large ePubs (>50MB) using R2 multipart upload
- Dedup: hash the ePub (fileHash already computed) â†’ check if R2 key exists before uploading â†’ skip if duplicate
- 1,000 users uploading the same bestseller = 1 R2 object, not 1,000

**Lazy book hydration:**
- New device sign-in: don't download all ePubs immediately
- Sync book metadata + covers from Convex (tiny payload)
- Download ePub from R2 only when user taps to read â†’ cache in IndexedDB
- Pre-fetch the next likely book (most recently read, highest progress but unfinished)

### Optimization Phase 2: Feed & Query (social launch)

**Server-side spoiler filtering in Convex:**
- Feed query joins readingProgress against content's bookId + spoilerLevel
- Denormalize: store a `spoilerBracket` field (0â€“3) on content, store user's bracket per book in a materialized view â†’ simple integer comparison instead of percentage math
- Pagination: cursor-based (by `createdAt` + `_id`), never offset-based

**Feed assembly strategy:**
- Fan-out-on-write pattern for home feed: when a user posts, a Convex scheduled function writes a reference to each follower's feed table
- Read path: `SELECT * FROM feedItems WHERE userId = X ORDER BY createdAt DESC LIMIT 20` â€” fast, indexed, no joins
- Fan-out capped: users with >10K followers switch to fan-out-on-read to avoid write amplification

**Convex query caching:**
- Structure queries to maximize cache hits: separate "feed page 1" from "feed page 2"
- Avoid overly broad queries that invalidate on unrelated writes

### Optimization Phase 3: Media Pipeline (Reels launch)

**Video processing:**
- Upload raw video to R2
- Convex scheduled action triggers transcoding (via Cloudflare Stream API or a worker)
- Generate HLS manifest + multiple bitrate renditions
- Thumbnail extraction: pull frame at 1s mark, resize, store in R2

**Image optimization:**
- All user-uploaded images go through a Cloudflare Worker that resizes on-the-fly
- Store original in R2, serve via `image.shelves.cloud/{key}?w=400&q=80`
- Generate srcset variants: 200w, 400w, 800w for responsive loading
- WebP/AVIF conversion at the edge

**CDN strategy:**
- R2 + Cloudflare CDN = zero egress cost with global edge caching
- Aggressive `Cache-Control` on immutable assets (ePub files, processed images, transcoded video)
- Short TTL on mutable assets (avatars)
- Content-hash URLs for cache busting: `covers/{hash}.jpg` not `covers/user123.jpg`

### Optimization Phase 4: Scale (growth phase)

**Read replicas / edge reads:**
- Monitor Convex query latency as user count grows
- If needed: cache hot data (trending feed, popular book clubs) in Cloudflare KV as read-through cache with short TTL

**Search infrastructure:**
- Start with Convex full-text search indexes
- Migrate to Typesense/Meilisearch/Algolia when needed
- Index: book titles, thought text, discussion titles/bodies, usernames, book club names
- Faceted search: filter by genre, spoiler-safe content only, book club, date range

**Notification fan-out:**
- Early: Convex mutation writes one notification per recipient (fine up to ~1K followers)
- Growth: batch notification writes in scheduled actions, process in chunks of 100
- Push notifications: integrate with FCM/APNs via Convex HTTP actions

**Rate limiting & abuse prevention:**
- Convex-side rate limits: max 10 thoughts/minute, max 3 video uploads/hour
- R2 upload size limits enforced via presigned URL conditions
- Content hash dedup: identical posts within 60s window â†’ reject

### Optimization Phase 5: Advanced (at scale)

**Reading progress as an event stream:**
- Append to a `readingEvents` log instead of updating a single row
- Enables: reading speed analytics, heatmaps (which chapters get re-read), session duration tracking
- Compact periodically: roll up events older than 30 days into the summary record
- Feeds recommendation algorithms: "users who slow down at Chapter 7 also loved..."

**Spoiler engine v2 â€” ML-assisted tagging:**
- Train a classifier on post text + book metadata to suggest/auto-assign spoiler brackets
- Run as Convex action post-creation: if confidence > 0.9, auto-tag; otherwise flag for user confirmation

**Social graph optimizations:**
- Materialized follower counts (increment/decrement, not `COUNT(*)` on read)
- Mutual follow detection: maintain a `mutualFollows` table
- "Users like you" recommendations: collaborative filtering on library overlap

**R2 lifecycle policies:**
- Auto-delete orphaned uploads (unlinked videos) after 24 hours
- Move rarely-accessed ePubs to R2 Infrequent Access after 90 days
- Compress cover images not accessed in 30 days (downsize to 400px max)

---

## Cost Model

| Scale | Users | R2 Storage | R2 Ops | Convex | Est. Monthly |
|-------|-------|-----------|--------|---------|--------------|
| Launch | 1K | ~5 GB | Minimal | Free tier | ~$0 |
| Early growth | 10K | ~100 GB | ~1M reads/mo | Pro tier | ~$50â€“80 |
| Traction | 100K | ~2 TB | ~50M reads/mo | Pro + scale | ~$300â€“500 |
| Scale | 1M | ~20 TB | ~500M reads/mo | Enterprise | ~$2â€“5K |

R2 zero-egress model is critical â€” a social platform with video would be crushing on S3 egress fees. R2 makes Reels economically viable even at scale.

---

## Key Architecture Decisions

1. **R2 for blobs, Convex for everything else** â€” clean separation, no ambiguity about where data lives
2. **Presigned URLs for uploads** â€” client talks directly to R2, Convex never proxies large files
3. **IndexedDB as local cache, not source of truth** â€” after auth wiring, Convex is canonical; IndexedDB is for offline/speed
4. **ePub dedup by fileHash** â€” one copy per unique book in R2, regardless of how many users upload it
5. **Spoiler filtering server-side** â€” never ship spoiler content to the client and hope JS hides it
6. **Fan-out-on-write for feeds** â€” pre-compute feeds at write time, read path stays fast
7. **Event-sourced reading progress** â€” enables analytics, recommendations, and the spoiler engine to evolve independently

---

## Conventions

- **Components:** functional React with hooks, no class components
- **Styling:** Tailwind utility classes + `cn()` helper for conditional classes
- **State:** local state + IndexedDB hooks (no Redux/Zustand)
- **Types:** TypeScript strict, types in `src/types/`
- **File naming:** PascalCase for components, camelCase for utilities/hooks
- **UI primitives:** always use shadcn/ui components from `src/components/ui/`
