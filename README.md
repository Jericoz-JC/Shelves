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
