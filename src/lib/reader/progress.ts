interface SpineItemLike {
  cfiBase?: string;
}

interface BookLocationsLike {
  percentageFromCfi?: (cfi: string) => number;
  /** Internal epubjs locations array (used by buildSpineBoundaryMap) */
  _locations?: string[];
}

interface BookLike {
  locations?: BookLocationsLike;
  spine?: unknown;
}

export interface DisplayedPageInfo {
  page?: number;
  total?: number;
}

export interface LocationStartInfo {
  cfi?: string;
  index?: number;
  percentage?: number;
  displayed?: DisplayedPageInfo;
}

export interface LocationDirectionSnapshot {
  index: number | null;
  page: number | null;
  percentage: number;
}

/**
 * Pre-computed map from spine index → { start, end } percentages.
 * Built once after locations are generated / loaded.
 */
export type SpineBoundaryMap = Map<number, { start: number; end: number }>;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function safePercentFromCfi(book: BookLike | null | undefined, cfi?: string) {
  if (!book?.locations || !cfi || typeof cfi !== "string") return null;
  if (typeof book.locations.percentageFromCfi !== "function") return null;
  try {
    const result = book.locations.percentageFromCfi(cfi);
    if (!Number.isFinite(result)) return null;
    return clamp(result);
  } catch {
    return null;
  }
}

/**
 * Build a map of spine index → { start, end } percentages by iterating through
 * the epubjs internal _locations array.  Each location CFI starts with
 * `epubcfi(/6/N!…)` where `/6/N` is the cfiBase of the spine item it belongs to.
 * We group locations by cfiBase-prefix, then map each group to a percentage
 * range based on its position in the array.
 */
export function buildSpineBoundaryMap(
  book: BookLike | null | undefined
): SpineBoundaryMap {
  const map: SpineBoundaryMap = new Map();
  if (!book) return map;

  const spineItems = (book.spine as { spineItems?: SpineItemLike[] } | undefined)
    ?.spineItems;
  if (!spineItems?.length) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: string[] | undefined = (book.locations as any)?._locations;
  if (!locations?.length) return map;

  // Build cfiBase → spineIndex lookup
  const cfiBaseToIndex = new Map<string, number>();
  for (let i = 0; i < spineItems.length; i++) {
    const base = spineItems[i].cfiBase;
    if (base) cfiBaseToIndex.set(base, i);
  }

  // Walk locations once, detect the first location of each spine section.
  // Location CFIs look like `epubcfi(/6/8!/4/2/1:0)`.
  // The cfiBase portion is everything between `epubcfi(` and `!`.
  const sectionFirstLoc = new Map<number, number>(); // spineIndex → first loc index
  const total = locations.length;

  for (let i = 0; i < total; i++) {
    const cfi = locations[i];
    const bangIdx = cfi.indexOf("!");
    if (bangIdx === -1) continue;
    // Extract the path between "epubcfi(" and "!"
    const base = cfi.slice(8, bangIdx); // len("epubcfi(") = 8
    const spineIdx = cfiBaseToIndex.get(base);
    if (spineIdx != null && !sectionFirstLoc.has(spineIdx)) {
      sectionFirstLoc.set(spineIdx, i);
    }
  }

  // Convert to percentages.  Sort sections by their first location index.
  const entries = [...sectionFirstLoc.entries()].sort((a, b) => a[1] - b[1]);

  for (let i = 0; i < entries.length; i++) {
    const [spineIdx, firstLoc] = entries[i];
    const nextFirstLoc = i + 1 < entries.length ? entries[i + 1][1] : total;
    const start = firstLoc / total;
    const end = nextFirstLoc / total;
    if (end > start) {
      map.set(spineIdx, { start, end });
    }
  }

  // For spine items that have NO locations (very short sections like cover images),
  // interpolate from their neighbors.
  for (let i = 0; i < spineItems.length; i++) {
    if (map.has(i)) continue;
    // Find the next section that has a boundary
    let nextWithBounds = -1;
    for (let j = i + 1; j < spineItems.length; j++) {
      if (map.has(j)) { nextWithBounds = j; break; }
    }
    // Find the previous section that has a boundary
    let prevWithBounds = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (map.has(j)) { prevWithBounds = j; break; }
    }

    const prevEnd = prevWithBounds >= 0 ? map.get(prevWithBounds)!.end : 0;
    const nextStart = nextWithBounds >= 0 ? map.get(nextWithBounds)!.start : 1;

    if (nextStart > prevEnd) {
      // Divide the gap evenly among all missing sections in this run
      const gapSections = (nextWithBounds >= 0 ? nextWithBounds : spineItems.length) -
        (prevWithBounds >= 0 ? prevWithBounds + 1 : 0);
      const posInGap = i - (prevWithBounds >= 0 ? prevWithBounds + 1 : 0);
      const step = (nextStart - prevEnd) / Math.max(1, gapSections);
      map.set(i, {
        start: prevEnd + posInGap * step,
        end: prevEnd + (posInGap + 1) * step,
      });
    }
  }

  return map;
}

function getSpineBoundariesFromMap(
  boundaryMap: SpineBoundaryMap | null | undefined,
  spineIndex?: number
): { start: number; end: number } | null {
  if (!boundaryMap || !Number.isInteger(spineIndex) || (spineIndex as number) < 0) return null;
  return boundaryMap.get(spineIndex as number) ?? null;
}

/** @deprecated — only used as fallback when no boundary map is available */
function getSpineBoundaries(
  book: BookLike | null | undefined,
  spineIndex?: number
): { start: number; end: number } | null {
  if (!book || !Number.isInteger(spineIndex) || (spineIndex as number) < 0) {
    return null;
  }

  const spineItems = (book.spine as { spineItems?: SpineItemLike[] } | undefined)?.spineItems;
  if (!spineItems || !spineItems.length) {
    return null;
  }
  const current = spineItems[spineIndex as number];
  if (!current?.cfiBase) {
    return null;
  }

  const start = safePercentFromCfi(book, current.cfiBase);
  if (start == null) {
    return null;
  }

  const nextCfi = spineItems[(spineIndex as number) + 1]?.cfiBase;
  const end = nextCfi ? safePercentFromCfi(book, nextCfi) : 1;
  if (end == null || end <= start) {
    return null;
  }

  return { start, end };
}

function getDisplayedFraction(displayed?: DisplayedPageInfo) {
  if (!displayed) return null;
  const { page, total } = displayed;
  if (!Number.isFinite(page) || !Number.isFinite(total) || !total || total <= 0) return null;
  return clamp((page as number) / (total as number));
}

export function computePreciseBookPercentage(
  book: BookLike | null | undefined,
  start: LocationStartInfo,
  boundaryMap?: SpineBoundaryMap | null
) {
  // Prefer pre-computed boundary map (always works when locations are indexed)
  const boundaries =
    getSpineBoundariesFromMap(boundaryMap, start.index) ??
    getSpineBoundaries(book, start.index);
  const displayedFraction = getDisplayedFraction(start.displayed);

  if (boundaries && displayedFraction != null) {
    return clamp(boundaries.start + displayedFraction * (boundaries.end - boundaries.start));
  }

  const indexedFromCfi = safePercentFromCfi(book, start.cfi);
  if (indexedFromCfi != null) return indexedFromCfi;

  const eventPercent = start.percentage;
  if (typeof eventPercent === "number" && Number.isFinite(eventPercent)) {
    return clamp(eventPercent);
  }

  return 0;
}

export function isForwardMovement(
  previous: LocationDirectionSnapshot | null,
  next: LocationDirectionSnapshot
) {
  if (!previous) return false;

  if (
    previous.index != null &&
    next.index != null &&
    previous.index !== next.index
  ) {
    return next.index > previous.index;
  }

  if (previous.page != null && next.page != null && previous.page !== next.page) {
    return next.page > previous.page;
  }

  return next.percentage > previous.percentage;
}

export function makeDirectionSnapshot(start: LocationStartInfo, percentage: number) {
  const page = start.displayed?.page;
  return {
    index: Number.isInteger(start.index) ? (start.index as number) : null,
    page: Number.isFinite(page) ? (page as number) : null,
    percentage,
  } as LocationDirectionSnapshot;
}

export function computeChapterPercentageFromBoundaries(
  book: BookLike | null | undefined,
  chapterStartCfi: string | undefined,
  nextChapterStartCfi: string | undefined,
  currentBookPercentage: number,
  boundaryMap?: SpineBoundaryMap | null,
  chapterSpineIndex?: number,
  nextChapterSpineIndex?: number
) {
  // Prefer SpineBoundaryMap — the cfiBase fallback almost never works
  let startPercent: number | null = null;
  let endPercent: number | null = null;

  if (boundaryMap && Number.isInteger(chapterSpineIndex) && (chapterSpineIndex as number) >= 0) {
    const bounds = boundaryMap.get(chapterSpineIndex as number);
    if (bounds) startPercent = bounds.start;

    if (Number.isInteger(nextChapterSpineIndex) && (nextChapterSpineIndex as number) >= 0) {
      const nextBounds = boundaryMap.get(nextChapterSpineIndex as number);
      if (nextBounds) endPercent = nextBounds.start; // chapter ends where next chapter starts
    } else {
      endPercent = 1; // last chapter goes to end of book
    }
  }

  // Fallback to cfi-based lookup
  if (startPercent == null) {
    startPercent = safePercentFromCfi(book, chapterStartCfi);
  }
  if (startPercent == null) return null;

  if (endPercent == null) {
    endPercent = nextChapterStartCfi
      ? safePercentFromCfi(book, nextChapterStartCfi)
      : 1;
  }

  if (endPercent == null || endPercent <= startPercent) return null;
  return clamp((currentBookPercentage - startPercent) / (endPercent - startPercent));
}
