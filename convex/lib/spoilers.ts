/**
 * Server-side spoiler gating (issue #31).
 *
 * Rule: a spoiler-tagged chronicle that references a book is hidden until the
 * viewer has a reading-progress record for that book at or beyond the
 * poster's position when they posted. The author always sees their own
 * content; signed-out viewers and non-readers of the book see a redacted
 * card. Spoiler text never leaves the server for gated viewers.
 *
 * Spoiler-tagged chronicles without a book reference have no objective
 * unlock criterion, so they keep the client-side badge treatment.
 */

export interface SpoilerGateFields {
  authorId: string;
  spoilerTag?: boolean;
  bookRef?: string;
  /** Author's reading percentage (0..1) for bookRef at post time. */
  spoilerProgress?: number;
}

export function isSpoilerGated(doc: SpoilerGateFields): boolean {
  return doc.spoilerTag === true && typeof doc.bookRef === "string" && doc.bookRef.length > 0;
}

export function shouldRevealSpoiler(
  doc: SpoilerGateFields,
  viewerId: string | null,
  /** Viewer's percentage for doc.bookRef, or null when they have no record. */
  viewerProgress: number | null
): boolean {
  if (!isSpoilerGated(doc)) return true;
  if (viewerId !== null && viewerId === doc.authorId) return true;
  if (viewerId === null || viewerProgress === null) return false;
  return viewerProgress >= (doc.spoilerProgress ?? 0);
}

export function redactSpoilerContent<T extends SpoilerGateFields & { text: string; highlightText?: string }>(
  doc: T
): T & { spoilerRedacted: true } {
  return {
    ...doc,
    text: "",
    highlightText: undefined,
    spoilerRedacted: true,
  };
}
