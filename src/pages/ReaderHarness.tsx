import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useEpub } from "@/hooks/useEpub";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useChapters } from "@/hooks/useChapters";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import { Button } from "@/components/ui/button";

interface HarnessApi {
  next: () => void;
  prev: () => void;
  getProgress: () => number;
  getChapterProgress: () => number;
  getChapterName: () => string | null;
  getChapterIndex: () => number;
  getTotalChapters: () => number;
  getCfi: () => string | null;
  getSpineInfo: () => unknown;
  getLocationDetail: () => unknown;
  getBoundaryMap: () => unknown;
  setFontSize: (size: number) => void;
}

export default function ReaderHarness() {
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [bookHash, setBookHash] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);

  const { book, rendition, loading, indexing, error, viewerRef, spineBoundaries, goNext, goPrev } = useEpub(arrayBuffer, {
    bookHash: bookHash ?? undefined,
    fontSize,
  });

  const { progress } = useReadingProgress({
    bookHash,
    rendition,
    book,
    spineBoundaries,
  });

  const chapters = useChapters(book);
  const {
    chapterProgress,
    currentChapter,
    chapterIndex,
    totalChapters,
  } = useChapterProgress(book, rendition, chapters, spineBoundaries);

  const api = useMemo<HarnessApi>(
    () => ({
      next: goNext,
      prev: goPrev,
      getProgress: () => progress?.percentage ?? 0,
      getChapterProgress: () => chapterProgress ?? 0,
      getChapterName: () => currentChapter?.label ?? null,
      getChapterIndex: () => chapterIndex,
      getTotalChapters: () => totalChapters,
      getCfi: () => progress?.currentCFI ?? null,
      setFontSize,
      getLocationDetail: () => {
        if (!rendition) return null;
        const loc = rendition.currentLocation() as unknown as { start?: { index?: number; cfi?: string; percentage?: number; displayed?: { page?: number; total?: number } } } | null;
        if (!loc?.start) return null;
        return {
          index: loc.start.index,
          cfi: loc.start.cfi,
          percentage: loc.start.percentage,
          displayedPage: loc.start.displayed?.page,
          displayedTotal: loc.start.displayed?.total,
        };
      },
      getBoundaryMap: () => {
        if (!spineBoundaries) return null;
        const entries: Array<{ spineIndex: number; start: number; end: number }> = [];
        spineBoundaries.forEach((v, k) => entries.push({ spineIndex: k, start: v.start, end: v.end }));
        return entries;
      },
      getSpineInfo: () => {
        if (!book) return null;
        const spine = (book as unknown as Record<string, unknown>).spine as
          | { spineItems?: Array<{ cfiBase?: string; href?: string; index?: number }> }
          | undefined;
        const items = spine?.spineItems ?? [];
        const locs = book.locations;
        return items.map((item, idx) => {
          let pctFromCfi: number | null = null;
          if (item.cfiBase && typeof locs?.percentageFromCfi === "function") {
            try {
              pctFromCfi = locs.percentageFromCfi(item.cfiBase);
            } catch {
              pctFromCfi = null;
            }
          }
          return {
            index: item.index ?? idx,
            href: item.href,
            cfiBase: item.cfiBase,
            pctFromCfi,
          };
        });
      },
    }),
    [goNext, goPrev, progress?.currentCFI, progress?.percentage, book, rendition, spineBoundaries, chapterProgress, currentChapter, chapterIndex, totalChapters]
  );

  useEffect(() => {
    (window as Window & { __readerHarness?: HarnessApi }).__readerHarness = api;
    return () => {
      delete (window as Window & { __readerHarness?: HarnessApi }).__readerHarness;
    };
  }, [api]);

  const onFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    setArrayBuffer(buffer);
    setBookHash(`harness-${file.name}-${file.size}-${file.lastModified}`);
  }, []);

  return (
    <div className="min-h-screen p-4 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Reader Harness</h1>

      <input
        data-testid="harness-file-input"
        type="file"
        accept=".epub,application/epub+zip"
        onChange={onFileChange}
      />

      <div className="flex gap-2">
        <Button data-testid="harness-prev" type="button" variant="outline" onClick={goPrev}>
          Prev
        </Button>
        <Button data-testid="harness-next" type="button" variant="outline" onClick={goNext}>
          Next
        </Button>
      </div>

      <div className="text-sm space-y-1">
        <p data-testid="harness-loading">Loading: {String(loading)}</p>
        <p data-testid="harness-indexing">Indexing: {String(indexing)}</p>
        <p data-testid="harness-progress">Progress: {progress?.percentage ?? 0}</p>
        <p data-testid="harness-cfi">CFI: {progress?.currentCFI ?? ""}</p>
        <p data-testid="harness-boundaries">Boundaries: {spineBoundaries?.size ?? 0}</p>
        <p data-testid="harness-fontsize">FontSize: {fontSize}</p>
        <p data-testid="harness-error">Error: {error ?? ""}</p>
        <p data-testid="harness-chapter-progress">ChapterProgress: {chapterProgress ?? 0}</p>
        <p data-testid="harness-chapter-name">Chapter: {currentChapter?.label ?? ""}</p>
        <p data-testid="harness-chapter-index">ChapterIndex: {chapterIndex}</p>
        <p data-testid="harness-total-chapters">TotalChapters: {totalChapters}</p>
      </div>

      <div ref={viewerRef} className="h-[70vh] w-full border rounded" />
    </div>
  );
}
