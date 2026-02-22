import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingProgress } from "../src/hooks/useReadingProgress";
import { IndexedDBService } from "../src/lib/db/indexedDB";
import { FakeRendition } from "./tooling/fakeRendition";

vi.mock("@/lib/db/indexedDB", () => ({
  IndexedDBService: {
    getProgress: vi.fn(),
    saveProgress: vi.fn(),
  },
}));

function createBookWithBoundaries(boundaries: Record<string, number>) {
  const percentageFromCfi = (cfi: string) => boundaries[cfi] ?? 0;
  return {
    locations: {
      percentageFromCfi,
    },
    spine: {
      spineItems: [
        { cfiBase: "cfi-0" },
        { cfiBase: "cfi-1" },
      ],
    },
  };
}

describe("useReadingProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(IndexedDBService.getProgress).mockResolvedValue(undefined);
  });

  it("computes distinct progress for distinct rendered pages in same section", async () => {
    const rendition = new FakeRendition();
    const book = createBookWithBoundaries({ "cfi-0": 0, "cfi-1": 1 });

    const { result } = renderHook(() =>
      useReadingProgress({
        bookHash: "book-1",
        rendition: rendition as never,
        book: book as never,
        debounceMs: 10,
      })
    );

    await waitFor(() => {
      expect(IndexedDBService.getProgress).toHaveBeenCalledWith("book-1");
    });

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "same-cfi-bucket",
          index: 0,
          percentage: 0.75,
          displayed: { page: 3, total: 4 },
        },
      });
    });

    expect(result.current.progress?.percentage).toBeCloseTo(0.75, 5);

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "same-cfi-bucket",
          index: 0,
          percentage: 0.75,
          displayed: { page: 4, total: 4 },
        },
      });
    });

    expect(result.current.progress?.percentage).toBeCloseTo(1, 5);
  });

  it("keeps forward progress monotonic when raw values dip", async () => {
    const rendition = new FakeRendition();

    const { result } = renderHook(() =>
      useReadingProgress({
        bookHash: "book-1",
        rendition: rendition as never,
        book: null,
        debounceMs: 10,
      })
    );

    await waitFor(() => {
      expect(IndexedDBService.getProgress).toHaveBeenCalledWith("book-1");
    });

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "cfi-1",
          percentage: 0.5,
          displayed: { page: 1, total: 2 },
        },
      });
    });

    expect(result.current.progress?.percentage).toBeCloseTo(0.5, 5);

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "cfi-2",
          percentage: 0.4,
          displayed: { page: 2, total: 2 },
        },
      });
    });

    expect(result.current.progress?.percentage).toBeCloseTo(0.5, 5);

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "cfi-3",
          percentage: 0.3,
          displayed: { page: 1, total: 2 },
        },
      });
    });

    expect(result.current.progress?.percentage).toBeCloseTo(0.3, 5);
  });

  it("restores saved location and persists debounced progress", async () => {
    const rendition = new FakeRendition();
    vi.mocked(IndexedDBService.getProgress).mockResolvedValueOnce({
      bookHash: "book-1",
      currentCFI: "saved-cfi",
      percentage: 0.2,
      lastReadAt: 100,
      chapter: null,
    });

    renderHook(() =>
      useReadingProgress({
        bookHash: "book-1",
        rendition: rendition as never,
        book: null,
        debounceMs: 10,
      })
    );

    await waitFor(() => {
      expect(rendition.displayedCfi).toBe("saved-cfi");
    });

    vi.useFakeTimers();

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "next-cfi",
          percentage: 0.4,
          displayed: { page: 1, total: 2 },
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(11);
    });

    expect(IndexedDBService.saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        bookHash: "book-1",
        currentCFI: "next-cfi",
      })
    );

    vi.useRealTimers();
  });
});
