import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { Book, Rendition } from "epubjs";
import { api } from "../../convex/_generated/api";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { BookProgress } from "@/types/book";
import {
  computePreciseBookPercentage,
  isForwardMovement,
  makeDirectionSnapshot,
  type LocationDirectionSnapshot,
  type SpineBoundaryMap,
} from "@/lib/reader/progress";

const CONVEX_DEBOUNCE_MS = 30_000;

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
  const convexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const lastDirectionRef = useRef<LocationDirectionSnapshot | null>(null);

  const updateProgressMutation = useMutation(api.readingProgress.updateProgress);

  // Load saved progress on mount
  useEffect(() => {
    if (!bookHash) return;

    hasRestoredRef.current = false;
    lastDirectionRef.current = null;
    IndexedDBService.getProgress(bookHash)
      .then((saved) => {
        if (saved) {
          setProgress(saved);
          lastDirectionRef.current = {
            index: null,
            page: null,
            percentage: saved.percentage,
          };
        }
      })
      .catch((err) => {
        console.error("Failed to restore reader progress:", err);
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

      // 1s debounce to IndexedDB
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        IndexedDBService.saveProgress(newProgress);
      }, debounceMs);

      // 30s debounce to Convex
      if (convexTimerRef.current) clearTimeout(convexTimerRef.current);
      convexTimerRef.current = setTimeout(() => {
        updateProgressMutation({
          bookHash: newProgress.bookHash,
          currentCFI: newProgress.currentCFI ?? undefined,
          percentage: newProgress.percentage,
          lastReadAt: newProgress.lastReadAt,
          chapter: newProgress.chapter ?? undefined,
        }).catch((err) => {
          console.warn("[useReadingProgress] Convex sync failed:", err);
        });
      }, CONVEX_DEBOUNCE_MS);
    },
    [debounceMs, updateProgressMutation]
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
      if (convexTimerRef.current) clearTimeout(convexTimerRef.current);
    };
  }, [rendition, bookHash, book, spineBoundaries, saveProgress]);

  return { progress };
}
