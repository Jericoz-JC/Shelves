import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Rendition } from "epubjs";
import type { ChapterItem } from "@/hooks/useChapters";
import { clamp } from "@/lib/utils/math";
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
  chapters: ChapterItem[],
  spineBoundaries?: SpineBoundaryMap | null
) {
  const [location, setLocation] = useState<DisplayedLocation | null>(null);
  const [chapterProgress, setChapterProgress] = useState<number | null>(null);
  const lastDirRef = useRef<LocationDirectionSnapshot | null>(null);
  const prevChapterProgressRef = useRef<{ chapterIdx: number; value: number } | null>(null);

  useEffect(() => {
    if (!rendition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(null);
      setChapterProgress(null);
      lastDirRef.current = null;
      prevChapterProgressRef.current = null;
      return;
    }

    const onRelocated = (loc: DisplayedLocation) => {
      setLocation(loc);

      if (!book || chapters.length === 0) {
        setChapterProgress(null);
        return;
      }

      const spineIndex = loc.start.index;
      let locChapterIndex = -1;
      for (let i = 0; i < chapters.length; i += 1) {
        if (chapters[i].spineIndex <= spineIndex) {
          locChapterIndex = i;
        } else {
          break;
        }
      }

      if (locChapterIndex < 0) {
        setChapterProgress(null);
        return;
      }

      const currentChapter = chapters[locChapterIndex];
      const nextChapter = chapters[locChapterIndex + 1];
      const displayed = loc.start.displayed;

      const currentBookPercentage = computePreciseBookPercentage(book, loc.start, spineBoundaries);
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
      if (raw == null) {
        setChapterProgress(null);
        return;
      }

      const snapshot = makeDirectionSnapshot(loc.start, currentBookPercentage);
      const prev = lastDirRef.current;
      const prevCh = prevChapterProgressRef.current;
      let nextProgress = raw;

      if (
        prevCh &&
        prevCh.chapterIdx === locChapterIndex &&
        prev &&
        isForwardMovement(prev, snapshot) &&
        nextProgress <= prevCh.value
      ) {
        nextProgress = Math.min(1, prevCh.value + 0.01);
      }

      lastDirRef.current = { ...snapshot, percentage: currentBookPercentage };
      prevChapterProgressRef.current = { chapterIdx: locChapterIndex, value: nextProgress };
      setChapterProgress(nextProgress);
    };

    rendition.on("relocated", onRelocated);
    return () => {
      rendition.off("relocated", onRelocated);
    };
  }, [rendition, book, chapters, spineBoundaries]);

  const chapterIndex = useMemo(() => {
    if (!location || chapters.length === 0) return -1;
    return resolveChapterIndexFromSpine(location.start.index, chapters);
  }, [location, chapters]);

  const currentChapter = chapterIndex >= 0 ? chapters[chapterIndex] : null;
  const chaptersRemaining =
    chapters.length > 0 && chapterIndex >= 0
      ? Math.max(0, chapters.length - (chapterIndex + 1))
      : 0;

  return {
    location,
    currentChapter,
    chapterIndex,
    chaptersRemaining,
    totalChapters: chapters.length,
    chapterProgress,
  };
}
