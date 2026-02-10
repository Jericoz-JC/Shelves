import { useState, useEffect, useRef, useCallback } from "react";
import type { Book, Rendition } from "epubjs";
import { loadEpubFromArrayBuffer } from "@/lib/epub/epubLoader";
import { getThemeCSS, type ReadingTheme } from "@/lib/theme/readingThemes";

interface UseEpubOptions {
  theme?: ReadingTheme;
  fontSize?: number;
  fontFamily?: string;
}

interface UseEpubReturn {
  book: Book | null;
  rendition: Rendition | null;
  loading: boolean;
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
  const { theme = "paper", fontSize = 18, fontFamily = "Georgia, serif" } = options;
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!arrayBuffer || !viewerRef.current) return;

    let cancelled = false;
    let currentBook: Book | null = null;

    async function init() {
      setLoading(true);
      setError(null);

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
        await epubBook.locations.generate(1024);

        if (cancelled) {
          epubBook.destroy();
          return;
        }

        setBook(epubBook);
        setRendition(rend);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ePub");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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
    };
  }, [arrayBuffer]);

  useEffect(() => {
    if (!rendition) return;

    const css = getThemeCSS(theme, fontSize, fontFamily);
    rendition.themes.default(css);
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
    error,
    viewerRef,
    goNext,
    goPrev,
    goToLocation,
  };
}
