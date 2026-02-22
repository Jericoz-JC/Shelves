import { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Rendition } from "epubjs";
import { loadEpubFromArrayBuffer } from "@/lib/epub/epubLoader";
import { IndexedDBService } from "@/lib/db/indexedDB";
import { getThemeCSS, READING_THEMES, type ReadingTheme } from "@/lib/theme/readingThemes";
import { buildSpineBoundaryMap, type SpineBoundaryMap } from "@/lib/reader/progress";

const LOCATION_CACHE_VERSION = 2;

interface LocationCacheMeta {
  locationVersion?: number;
  locationBreak?: number;
}

export function isLocationCacheCompatible(
  cache: LocationCacheMeta | undefined,
  locationBreak: number
) {
  if (!cache) return false;
  return (
    cache.locationVersion === LOCATION_CACHE_VERSION &&
    cache.locationBreak === locationBreak
  );
}

interface UseEpubOptions {
  bookHash?: string;
  theme?: ReadingTheme;
  fontSize?: number;
  fontFamily?: string;
}

interface UseEpubReturn {
  book: Book | null;
  rendition: Rendition | null;
  loading: boolean;
  indexing: boolean;
  error: string | null;
  viewerRef: React.RefObject<HTMLDivElement | null>;
  spineBoundaries: SpineBoundaryMap | null;
  goNext: () => void;
  goPrev: () => void;
  goToLocation: (cfi: string) => void;
}

export function useEpub(
  arrayBuffer: ArrayBuffer | null,
  options: UseEpubOptions = {}
): UseEpubReturn {
  const {
    bookHash,
    theme = "paper",
    fontSize = 18,
    fontFamily = "Georgia, serif",
  } = options;
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spineBoundaries, setSpineBoundaries] = useState<SpineBoundaryMap | null>(null);

  useEffect(() => {
    if (!arrayBuffer || !viewerRef.current) return;

    let cancelled = false;
    let currentBook: Book | null = null;

    async function init() {
      setLoading(true);
      setError(null);
      setIndexing(false);

      try {
        const epubBook = loadEpubFromArrayBuffer(arrayBuffer!);
        currentBook = epubBook;

        if (cancelled) {
          epubBook.destroy();
          return;
        }

        const rend = epubBook.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
        });

        await rend.display();

        // Patch manager.next() to fix a sub-pixel rounding bug in epub.js.
        //
        // epub.js decides whether to scroll one more page or jump to the next
        // spine section using:
        //   left = scrollLeft + offsetWidth + delta
        //   if (left <= scrollWidth) → scroll; else → next section
        //
        // CSS column layout reports scrollWidth as a floored integer, so when a
        // section has N pages the browser may report scrollWidth = N*delta - 1.
        // On page N-2, left = N*delta which fails the <= check by ~1px, causing
        // epub.js to jump to the next section and skip the last page entirely.
        //
        // prev() is unaffected because it only checks `scrollLeft > 0`, so
        // going backwards always shows the skipped page — the "phantom page".
        //
        // Fix: intercept the specific case where left > scrollWidth but is
        // within 2px (sub-pixel rounding), and scroll rather than advance.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mgr = (rend as any).manager;
        if (mgr && typeof mgr.next === "function") {
          const origNext = mgr.next.bind(mgr);
          mgr.next = function () {
            if (
              mgr.isPaginated &&
              mgr.settings.axis === "horizontal" &&
              (!mgr.settings.direction || mgr.settings.direction === "ltr")
            ) {
              const projectedLeft =
                mgr.container.scrollLeft +
                mgr.container.offsetWidth +
                mgr.layout.delta;
              const { scrollWidth } = mgr.container;
              if (projectedLeft > scrollWidth && projectedLeft <= scrollWidth + 2) {
                mgr.scrollBy(mgr.layout.delta, 0, true);
                return;
              }
            }
            return origNext();
          };
        }

        if (cancelled) {
          epubBook.destroy();
          return;
        }

        setBook(epubBook);
        setRendition(rend);
        setLoading(false);

        const runIndexing = async () => {
          if (!bookHash) return;

          // Signal indexing=true synchronously (before any await) so it gets
          // batched with the setLoading(false) render.  This guarantees
          // consumers that wait for indexing=false will also get a non-null
          // spineBoundaries — even when locations come from cache.
          setIndexing(true);

          const sections =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((epubBook as any).spine?.spineItems as Array<unknown> | undefined)?.length ??
            0;
          const locationBreak = sections > 120 ? 256 : 128;

          let cachedRecord:
            | { locations: string; locationVersion?: number; locationBreak?: number }
            | undefined;
          try {
            const record = await IndexedDBService.getLocationsRecord(bookHash);
            if (record?.locations) {
              cachedRecord = {
                locations: record.locations,
                locationVersion: record.locationVersion,
                locationBreak: record.locationBreak,
              };
            }
          } catch {
            cachedRecord = undefined;
          }

          if (cancelled) return;

          if (
            cachedRecord?.locations &&
            isLocationCacheCompatible(cachedRecord, locationBreak)
          ) {
            try {
              await epubBook.locations.load(cachedRecord.locations);
              if (!cancelled) {
                setSpineBoundaries(buildSpineBoundaryMap(epubBook));
                setIndexing(false);
              }
              return;
            } catch {
              // Fall through to regeneration if cached data is invalid.
            }
          }

          if (cancelled) return;
          try {
            if (typeof requestAnimationFrame === "function") {
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve())
              );
            }
            await epubBook.locations.generate(locationBreak);
            if (cancelled) return;
            setSpineBoundaries(buildSpineBoundaryMap(epubBook));
            const serialized = epubBook.locations.save();
            if (serialized) {
              await IndexedDBService.saveLocations(bookHash, serialized, {
                locationVersion: LOCATION_CACHE_VERSION,
                locationBreak,
              });
            }
          } finally {
            if (!cancelled) {
              setIndexing(false);
            }
          }
        };

        void runIndexing();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ePub");
          setLoading(false);
          setIndexing(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (currentBook) {
        currentBook.destroy();
      }
      setBook(null);
      setRendition(null);
      setLoading(false);
      setIndexing(false);
      setSpineBoundaries(null);
    };
  }, [arrayBuffer, bookHash]);

  useEffect(() => {
    if (!rendition) return;

    const css = getThemeCSS(theme, fontSize, fontFamily);
    rendition.themes.default(css);
    const config = READING_THEMES[theme];
    rendition.themes.override("background-color", config.background, true);
    rendition.themes.override("color", config.text, true);
    rendition.themes.override("font-family", fontFamily, true);
    rendition.themes.override("font-size", `${fontSize}px`, true);
    rendition.themes.override("line-height", "1.7", true);
    rendition.views().forEach((view: { render: () => void }) => view.render());
  }, [rendition, theme, fontSize, fontFamily]);

  const goNext = useCallback(() => {
    rendition?.next();
  }, [rendition]);

  const goPrev = useCallback(() => {
    rendition?.prev();
  }, [rendition]);

  const goToLocation = useCallback(
    (cfi: string) => {
      rendition?.display(cfi);
    },
    [rendition]
  );

  return {
    book,
    rendition,
    loading,
    indexing,
    error,
    viewerRef,
    spineBoundaries,
    goNext,
    goPrev,
    goToLocation,
  };
}
