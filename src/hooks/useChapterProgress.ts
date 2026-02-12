import { useEffect, useMemo, useState } from "react";
import type { Book, Rendition } from "epubjs";
import type { ChapterItem } from "@/hooks/useChapters";

interface DisplayedLocation {
  start: {
    index: number;
    cfi: string;
    percentage: number;
    displayed: { page: number; total: number };
  };
}

export function useChapterProgress(
  book: Book | null,
  rendition: Rendition | null,
  chapters: ChapterItem[]
) {
  const [location, setLocation] = useState<DisplayedLocation | null>(null);

  useEffect(() => {
    if (!rendition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(null);
      return;
    }

    const onRelocated = (loc: DisplayedLocation) => {
      setLocation(loc);
    };

    rendition.on("relocated", onRelocated);
    return () => {
      rendition.off("relocated", onRelocated);
    };
  }, [rendition]);

  const chapterIndex = useMemo(() => {
    if (!location || chapters.length === 0) return -1;
    const spineIndex = location.start.index;
    let idx = -1;
    for (let i = 0; i < chapters.length; i += 1) {
      if (chapters[i].spineIndex <= spineIndex) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [location, chapters]);

  const currentChapter = chapterIndex >= 0 ? chapters[chapterIndex] : null;
  const chaptersRemaining =
    chapters.length > 0 && chapterIndex >= 0
      ? Math.max(0, chapters.length - (chapterIndex + 1))
      : 0;

  const chapterProgress = useMemo(() => {
    if (!book || !currentChapter || !location) return null;

    const currentPercent = location.start.percentage;
    if (Number.isFinite(currentPercent)) {
      const startCfi = currentChapter.cfiBase;
      const nextChapter = chapters[chapterIndex + 1];
      const endCfi = nextChapter?.cfiBase;

      const safePercentFromCfi = (cfi?: string) => {
        if (!book.locations || !cfi || typeof cfi !== "string") return null;
        try {
          return book.locations.percentageFromCfi(cfi);
        } catch {
          return null;
        }
      };

      if (book.locations && startCfi) {
        const startPercent = safePercentFromCfi(startCfi);
        const endPercent = endCfi ? safePercentFromCfi(endCfi) : 1;

        if (
          startPercent !== null &&
          endPercent !== null &&
          endPercent > startPercent
        ) {
          const raw = (currentPercent - startPercent) / (endPercent - startPercent);
          return Math.min(Math.max(raw, 0), 1);
        }
      }
    }

    const displayed = location.start.displayed;
    if (displayed?.total) {
      return displayed.page / displayed.total;
    }

    return null;
  }, [book, currentChapter, chapters, chapterIndex, location]);

  return {
    location,
    currentChapter,
    chapterIndex,
    chaptersRemaining,
    totalChapters: chapters.length,
    chapterProgress,
  };
}
