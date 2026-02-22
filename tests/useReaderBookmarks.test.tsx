import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderBookmarks } from "@/hooks/useReaderBookmarks";
import { IndexedDBService } from "@/lib/db/indexedDB";

vi.mock("@/lib/db/indexedDB", () => ({
  IndexedDBService: {
    getBookmarks: vi.fn(),
    saveBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
  },
}));

describe("useReaderBookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty bookmarks and blocks add when bookHash is null", async () => {
    const { result } = renderHook(() => useReaderBookmarks(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(IndexedDBService.getBookmarks).not.toHaveBeenCalled();
    expect(result.current.bookmarks).toEqual([]);

    const added = await result.current.addBookmark({
      cfi: "epubcfi(/6/2[target])",
      chapter: "Chapter 1",
      percentage: 0.1,
    });

    expect(added).toBeNull();
    expect(IndexedDBService.saveBookmark).not.toHaveBeenCalled();
  });

  it("loads and sorts bookmarks by most recent first", async () => {
    vi.mocked(IndexedDBService.getBookmarks).mockResolvedValueOnce([
      {
        id: "bm-older",
        bookHash: "book-1",
        cfi: "epubcfi(/6/2[old])",
        chapter: "Chapter 1",
        percentage: 0.1,
        createdAt: 100,
      },
      {
        id: "bm-newer",
        bookHash: "book-1",
        cfi: "epubcfi(/6/2[new])",
        chapter: "Chapter 2",
        percentage: 0.6,
        createdAt: 200,
      },
    ]);

    const { result } = renderHook(() => useReaderBookmarks("book-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(IndexedDBService.getBookmarks).toHaveBeenCalledWith("book-1");
    expect(result.current.bookmarks.map((bookmark) => bookmark.id)).toEqual([
      "bm-newer",
      "bm-older",
    ]);
  });

  it("creates and stores a bookmark for the active book", async () => {
    vi.mocked(IndexedDBService.getBookmarks).mockResolvedValueOnce([]);
    vi.mocked(IndexedDBService.saveBookmark).mockResolvedValueOnce();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(12345);

    const { result } = renderHook(() => useReaderBookmarks("book-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addBookmark({
        cfi: "epubcfi(/6/2[target])",
        chapter: "Chapter 3",
        percentage: 0.42,
      });
    });

    expect(IndexedDBService.saveBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^bm-/),
        bookHash: "book-1",
        cfi: "epubcfi(/6/2[target])",
        chapter: "Chapter 3",
        percentage: 0.42,
        createdAt: 12345,
      })
    );
    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0].cfi).toBe("epubcfi(/6/2[target])");
    nowSpy.mockRestore();
  });

  it("removes a bookmark and updates local state", async () => {
    vi.mocked(IndexedDBService.getBookmarks).mockResolvedValueOnce([
      {
        id: "bm-1",
        bookHash: "book-1",
        cfi: "epubcfi(/6/2[target])",
        chapter: "Chapter 1",
        percentage: 0.2,
        createdAt: 100,
      },
    ]);
    vi.mocked(IndexedDBService.deleteBookmark).mockResolvedValueOnce();

    const { result } = renderHook(() => useReaderBookmarks("book-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.removeBookmark("bm-1");
    });

    expect(IndexedDBService.deleteBookmark).toHaveBeenCalledWith("bm-1");
    expect(result.current.bookmarks).toHaveLength(0);
  });
});
