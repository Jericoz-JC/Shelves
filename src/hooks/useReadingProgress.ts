import { useEffect, useRef, useCallback, useState } from "react";
import type { Rendition } from "epubjs";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { BookProgress } from "@/types/book";

interface UseReadingProgressOptions {
  bookHash: string | null;
  rendition: Rendition | null;
  debounceMs?: number;
}

export function useReadingProgress({
  bookHash,
  rendition,
  debounceMs = 1000,
}: UseReadingProgressOptions) {
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  // Load saved progress on mount
  useEffect(() => {
    if (!bookHash) return;

    hasRestoredRef.current = false;
    IndexedDBService.getProgress(bookHash).then((saved) => {
      if (saved) {
        setProgress(saved);
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
      start: { cfi: string; percentage: number; displayed: { page: number; total: number } };
    }) => {
      const rawPercentage = location.start.percentage;
      const safePercentage = Number.isFinite(rawPercentage) ? rawPercentage : 0;
      const newProgress: BookProgress = {
        bookHash,
        currentCFI: location.start.cfi,
        percentage: Math.min(Math.max(safePercentage, 0), 1),
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
  }, [rendition, bookHash, saveProgress]);

  return { progress };
}
