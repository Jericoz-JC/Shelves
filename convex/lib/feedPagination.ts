/**
 * Cursor contract for feed pagination.
 *
 * Cursors encode the index position of the last item the client received:
 * `createdAt` plus `_creationTime` as a tiebreaker for documents written in
 * the same millisecond. Pages resume with an inclusive (`lte`) index range and
 * skip documents at-or-after the cursor position, so concurrent inserts can
 * never cause duplicates or gaps between pages.
 */

export interface FeedCursor {
  /** `createdAt` of the last item on the previous page. */
  t: number;
  /** `_creationTime` tiebreaker for same-millisecond documents. */
  ct: number;
}

export interface CursorablePosition {
  createdAt: number;
  _creationTime: number;
}

/** Extra rows fetched beyond the page size to absorb same-millisecond ties. */
export const SAME_TS_BUFFER = 25;

export function encodeFeedCursor(cursor: FeedCursor): string {
  return JSON.stringify(cursor);
}

export function decodeFeedCursor(raw: string | null): FeedCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FeedCursor>;
    if (typeof parsed.t !== "number" || typeof parsed.ct !== "number") return null;
    return { t: parsed.t, ct: parsed.ct };
  } catch {
    return null;
  }
}

/** True when the document sits strictly after (older than) the cursor position. */
export function isAfterCursor(doc: CursorablePosition, cursor: FeedCursor): boolean {
  if (doc.createdAt < cursor.t) return true;
  if (doc.createdAt > cursor.t) return false;
  return doc._creationTime < cursor.ct;
}

export interface PageSelection<T> {
  items: T[];
  /** Cursor for the next page, or null when the scan is exhausted. */
  continueCursor: string | null;
  isDone: boolean;
}

/**
 * Select a page from a descending, cursor-bounded scan window.
 *
 * `docs` is the raw scan (already range-bounded by the caller); `matches`
 * filters it (e.g. top-level only, followed authors only). The continue
 * cursor points at the last *returned* item when the page fills, or at the
 * last *scanned* document when the window was capped before filling — so the
 * next page resumes exactly where this scan stopped, never skipping rows.
 *
 * `scanExhausted` must be true when `docs` reached the end of the index
 * (i.e. the query returned fewer rows than requested).
 */
export function selectFeedPage<T extends CursorablePosition>(
  docs: T[],
  matches: (doc: T) => boolean,
  pageSize: number,
  scanExhausted: boolean
): PageSelection<T> {
  const items: T[] = [];

  for (const doc of docs) {
    if (!matches(doc)) continue;
    items.push(doc);
    if (items.length === pageSize) {
      return {
        items,
        continueCursor: encodeFeedCursor({ t: doc.createdAt, ct: doc._creationTime }),
        isDone: false,
      };
    }
  }

  if (scanExhausted || docs.length === 0) {
    return { items, continueCursor: null, isDone: true };
  }

  const lastScanned = docs[docs.length - 1];
  return {
    items,
    continueCursor: encodeFeedCursor({
      t: lastScanned.createdAt,
      ct: lastScanned._creationTime,
    }),
    isDone: false,
  };
}
