import { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Rendition } from "epubjs";
import { loadEpubFromArrayBuffer } from "@/lib/epub/epubLoader";
import { IndexedDBService } from "@/lib/db/indexedDB";
import { getThemeCSS, READING_THEMES, type ReadingTheme } from "@/lib/theme/readingThemes";

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

        if (cancelled) {
          epubBook.destroy();
          return;
        }

        setBook(epubBook);
        setRendition(rend);
        setLoading(false);

        const runIndexing = async () => {
          if (!bookHash) return;
          let cached: string | undefined;
          try {
            cached = await IndexedDBService.getLocations(bookHash);
          } catch {
            cached = undefined;
          }

          if (cancelled) return;

          if (cached) {
            try {
              await epubBook.locations.load(cached);
              return;
            } catch {
              // Fall through to regeneration if cached data is invalid.
            }
          }

          if (cancelled) return;
          setIndexing(true);
          try {
            if (typeof requestAnimationFrame === "function") {
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve())
              );
            }
            await epubBook.locations.generate(1024);
            if (cancelled) return;
            const serialized = epubBook.locations.save();
            if (serialized) {
              await IndexedDBService.saveLocations(bookHash, serialized);
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
    goNext,
    goPrev,
    goToLocation,
  };
}
