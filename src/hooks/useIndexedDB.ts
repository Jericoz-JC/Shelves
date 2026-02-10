import { useState, useEffect, useCallback } from "react";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { BookMetadata } from "@/types/book";

export function useLibrary() {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const metadata = await IndexedDBService.getAllMetadata();
      // Sort by most recently added
      metadata.sort((a, b) => b.addedAt - a.addedAt);
      setBooks(metadata);
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteBook = useCallback(
    async (fileHash: string) => {
      await IndexedDBService.deleteBook(fileHash);
      await refresh();
    },
    [refresh]
  );

  return { books, loading, refresh, deleteBook };
}
