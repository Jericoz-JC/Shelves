import { useCallback, useEffect, useState } from "react";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { ReaderBookmark } from "@/types/book";

interface CreateBookmarkInput {
  cfi: string;
  chapter: string | null;
  percentage: number | null;
}

function createBookmarkId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bm-${crypto.randomUUID()}`;
  }
  return `bm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortBookmarksByCreatedAt(bookmarks: ReaderBookmark[]) {
  return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
}

export function useReaderBookmarks(bookHash: string | null) {
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!bookHash) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stored = await IndexedDBService.getBookmarks(bookHash);
      setBookmarks(sortBookmarksByCreatedAt(stored));
    } catch (err) {
      console.error("Failed to load reader bookmarks:", err);
    } finally {
      setLoading(false);
    }
  }, [bookHash]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addBookmark = useCallback(
    async (input: CreateBookmarkInput): Promise<ReaderBookmark | null> => {
      if (!bookHash) return null;
      try {
        const nextBookmark: ReaderBookmark = {
          id: createBookmarkId(),
          bookHash,
          cfi: input.cfi,
          chapter: input.chapter,
          percentage: input.percentage,
          createdAt: Date.now(),
        };
        await IndexedDBService.saveBookmark(nextBookmark);
        setBookmarks((prev) => sortBookmarksByCreatedAt([...prev, nextBookmark]));
        return nextBookmark;
      } catch (err) {
        console.error("Failed to save reader bookmark:", err);
        return null;
      }
    },
    [bookHash]
  );

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    try {
      await IndexedDBService.deleteBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== bookmarkId));
    } catch (err) {
      console.error("Failed to delete reader bookmark:", err);
    }
  }, []);

  return {
    bookmarks,
    loading,
    refresh,
    addBookmark,
    removeBookmark,
  };
}
