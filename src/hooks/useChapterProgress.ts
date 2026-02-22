import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Rendition } from "epubjs";
import type { ChapterItem } from "@/hooks/useChapters";
import {
  computeChapterPercentageFromBoundaries,
  computePreciseBookPercentage,
  isForwardMovement,
  makeDirectionSnapshot,
  type LocationDirectionSnapshot,
  type SpineBoundaryMap,
} from "@/lib/reader/progress";

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
  chapters: ChapterItem[],
  spineBoundaries?: SpineBoundaryMap | null
) {
  const [location, setLocation] = useState<DisplayedLocation | null>(null);
  const lastDirRef = useRef<LocationDirectionSnapshot | null>(null);
  const prevChapterProgressRef = useRef<{ chapterIdx: number; value: number } | null>(null);

  useEffect(() => {
    if (!rendition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(null);
      lastDirRef.current = null;
      prevChapterProgressRef.current = null;
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

    const displayed = location.start.displayed;
    const nextChapter = chapters[chapterIndex + 1];

    const currentBookPercentage = computePreciseBookPercentage(book, location.start, spineBoundaries);
    let raw = computeChapterPercentageFromBoundaries(
      book,
      currentChapter.cfiBase,
      nextChapter?.cfiBase,
      currentBookPercentage,
      spineBoundaries,
      currentChapter.spineIndex,
      nextChapter?.spineIndex
    );

    if (raw == null && displayed?.total) {
      raw = displayed.page / displayed.total;
    }
    if (raw == null) return null;

    // Forward-detection + epsilon bump: if the user paged forward within the
    // same chapter but the raw chapter progress didn't increase (e.g. trailing
    // empty CSS column where displayed.page stays the same), nudge it up so
    // the bar keeps moving.
    const snapshot = makeDirectionSnapshot(location.start, currentBookPercentage);
    const prev = lastDirRef.current;
    const prevCh = prevChapterProgressRef.current;
    lastDirRef.current = { ...snapshot, percentage: currentBookPercentage };

    if (
      prevCh &&
      prevCh.chapterIdx === chapterIndex &&
      prev &&
      isForwardMovement(prev, snapshot) &&
      raw <= prevCh.value
    ) {
      raw = Math.min(1, prevCh.value + 0.01);
    }

    prevChapterProgressRef.current = { chapterIdx: chapterIndex, value: raw };
    return raw;
  }, [book, currentChapter, chapters, chapterIndex, location, spineBoundaries]);

  return {
    location,
    currentChapter,
    chapterIndex,
    chaptersRemaining,
    totalChapters: chapters.length,
    chapterProgress,
  };
}
