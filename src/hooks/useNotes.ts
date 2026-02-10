import { useCallback, useEffect, useState } from "react";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { ReaderNote } from "@/types/book";

export function useNotes(bookHash: string | null) {
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!bookHash) {
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      const stored = await IndexedDBService.getNotes(bookHash);
      setNotes(stored.sort((a, b) => a.createdAt - b.createdAt));
    } finally {
      setLoading(false);
    }
  }, [bookHash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNote = useCallback(
    async (note: Omit<ReaderNote, "id" | "createdAt" | "updatedAt">) => {
      const newNote: ReaderNote = {
        ...note,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await IndexedDBService.saveNote(newNote);
      setNotes((prev) => [...prev, newNote]);
      return newNote;
    },
    []
  );

  const updateNote = useCallback(async (id: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, text, updatedAt: Date.now() }
          : note
      )
    );
    const note = notes.find((item) => item.id === id);
    if (note) {
      await IndexedDBService.saveNote({
        ...note,
        text,
        updatedAt: Date.now(),
      });
    }
  }, [notes]);

  const deleteNote = useCallback(async (id: string) => {
    await IndexedDBService.deleteNote(id);
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return { notes, loading, addNote, updateNote, deleteNote, refresh };
}
