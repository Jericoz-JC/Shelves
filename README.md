# Shelves

A local-first ePub reader built with React, Vite, and epub.js. Books and reading progress are stored in IndexedDB. Convex schema and functions are scaffolded but not deployed. Planned domain: shelves.cloud.

## What Was Built
- Vite + React + TypeScript with @/ path aliases
- Tailwind CSS v4 + shadcn/ui components
- Motion installed for animations
- Convex schema and functions for users, books, reading progress, and preferences
- IndexedDB storage for books, metadata, and progress
- ePub loading, parsing, and rendering with theme injection
- Reading themes (Paper, Night, Focus, Sepia) and font controls
- Library and Reader pages with upload, navigation, and progress UI
- Verification: TypeScript check, Vite build, and dev server run

## How To Run
1. npm install
2. npm run dev
3. Open http://localhost:5173

Optional:
- npm run build
- npm run preview
- npm run test
- npm run test:progress

## Reader Progress Harness
- Start harness: `npm run dev:harness`
- Open `http://localhost:5173/reader-harness`
- Upload an `.epub`, then use `Prev` / `Next` to paginate
- Live progress appears in `Progress:` and `CFI:` fields

Automation entrypoint in browser console:
- `window.__readerHarness.next()`
- `window.__readerHarness.prev()`
- `window.__readerHarness.getProgress()`
- `window.__readerHarness.getCfi()`

## Data Storage
- Local IndexedDB only (books, metadata, progress)
- Convex backend is scaffolded but not wired up to the UI yet

## License
MIT

## Next Steps (Plan)
1. Create the initial commit and push to GitHub
2. Validate runtime behavior (upload, render, progress resume, themes)
3. Decide on auth + sync (Clerk + Convex) and wire up backend
4. Add tests for IndexedDB service and reading progress behavior
5. Polish UX (error states, duplicate handling, link taps in reader)

## Questions For README
- Is the license holder name correct in LICENSE?
- What browsers are officially supported?
- Should we include screenshots or a short demo GIF?
- Do you want a privacy note about local-only storage?
- Should we add deployment details for shelves.cloud?  
