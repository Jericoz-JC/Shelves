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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveChapterIndexFromSpine(
  spineIndex: number,
  chapters: ChapterItem[]
) {
  const exactMatch = chapters.findIndex((chapter) => chapter.spineIndex === spineIndex);
  if (exactMatch >= 0) return exactMatch;

  let nearestPrevious = -1;
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].spineIndex <= spineIndex) {
      nearestPrevious = i;
    } else {
      break;
    }
  }
  return nearestPrevious;
}

export function isLocationsMapReady(book: Book | null) {
  const locations = book?.locations;
  if (!locations || typeof locations.length !== "function") return false;
  try {
    return locations.length() > 0;
  } catch {
    return false;
  }
}

export function computeChapterProgressValue(
  currentPercent: number,
  startPercent: number,
  endPercent: number
) {
  if (!Number.isFinite(currentPercent)) return null;
  if (!Number.isFinite(startPercent) || !Number.isFinite(endPercent)) return null;
  if (endPercent <= startPercent) return null;
  const raw = (currentPercent - startPercent) / (endPercent - startPercent);
  return clamp(raw, 0, 1);
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
    return resolveChapterIndexFromSpine(location.start.index, chapters);
  }, [location, chapters]);

  const currentChapter = chapterIndex >= 0 ? chapters[chapterIndex] : null;
  const chaptersRemaining =
    chapters.length > 0 && chapterIndex >= 0
      ? Math.max(0, chapters.length - (chapterIndex + 1))
      : 0;

  const chapterProgress = useMemo(() => {
    if (!book || !currentChapter || !location) return null;
    if (!isLocationsMapReady(book)) return null;

    const safePercentFromCfi = (cfi?: string) => {
      if (!book.locations || !cfi || typeof cfi !== "string") return null;
      try {
        const percent = book.locations.percentageFromCfi(cfi);
        return Number.isFinite(percent) ? percent : null;
      } catch {
        return null;
      }
    };

    const startPercent = safePercentFromCfi(currentChapter.cfiBase);
    if (startPercent === null) return null;

    const nextChapter = chapters[chapterIndex + 1];
    const endPercent = nextChapter?.cfiBase ? safePercentFromCfi(nextChapter.cfiBase) : 1;
    if (endPercent === null) return null;

    const currentPercentFromLocation = Number.isFinite(location.start.percentage)
      ? location.start.percentage
      : safePercentFromCfi(location.start.cfi);
    if (currentPercentFromLocation === null) return null;

    return computeChapterProgressValue(
      currentPercentFromLocation,
      startPercent,
      endPercent
    );
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
