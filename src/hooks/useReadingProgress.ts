import { useEffect, useRef, useCallback, useState } from "react";
import type { Book, Rendition } from "epubjs";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { BookProgress } from "@/types/book";
import {
  computePreciseBookPercentage,
  isForwardMovement,
  makeDirectionSnapshot,
  type LocationDirectionSnapshot,
  type SpineBoundaryMap,
} from "@/lib/reader/progress";

interface UseReadingProgressOptions {
  bookHash: string | null;
  rendition: Rendition | null;
  book?: Book | null;
  spineBoundaries?: SpineBoundaryMap | null;
  debounceMs?: number;
}

export function useReadingProgress({
  bookHash,
  rendition,
  book,
  spineBoundaries,
  debounceMs = 1000,
}: UseReadingProgressOptions) {
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const lastDirectionRef = useRef<LocationDirectionSnapshot | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    if (!bookHash) return;

    hasRestoredRef.current = false;
    lastDirectionRef.current = null;
    IndexedDBService.getProgress(bookHash).then((saved) => {
      if (saved) {
        setProgress(saved);
        lastDirectionRef.current = {
          index: null,
          page: null,
          percentage: saved.percentage,
        };
      }
    });
  }, [bookHash]);

  // Navigate to saved position when rendition + progress both ready
  useEffect(() => {
    if (!rendition || !progress?.currentCFI || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    rendition.display(progress.currentCFI);
  }, [rendition, progress]);

  const saveProgress = useCallback(
    (newProgress: BookProgress) => {
      setProgress(newProgress);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        IndexedDBService.saveProgress(newProgress);
      }, debounceMs);
    },
    [debounceMs]
  );

  // Listen to relocation events
  useEffect(() => {
    if (!rendition || !bookHash) return;

    const onRelocated = (location: {
      start: {
        cfi: string;
        index?: number;
        percentage: number;
        displayed: { page: number; total: number };
      };
    }) => {
      const start = location.start;
      const rawPercentage = computePreciseBookPercentage(book, start, spineBoundaries);
      const snapshot = makeDirectionSnapshot(start, rawPercentage);
      const previous = lastDirectionRef.current;

      let percentage = rawPercentage;
      if (previous && isForwardMovement(previous, snapshot)) {
        if (rawPercentage <= previous.percentage) {
          percentage = Math.min(1, previous.percentage + 0.000001);
        } else {
          percentage = rawPercentage;
        }
      }

      lastDirectionRef.current = {
        ...snapshot,
        percentage,
      };

      const newProgress: BookProgress = {
        bookHash,
        currentCFI: start.cfi,
        percentage,
        lastReadAt: Date.now(),
        chapter: null,
      };
      saveProgress(newProgress);
    };

    rendition.on("relocated", onRelocated);
    return () => {
      rendition.off("relocated", onRelocated);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rendition, bookHash, book, spineBoundaries, saveProgress]);

  return { progress };
}
