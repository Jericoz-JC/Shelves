import { useCallback, useEffect, useRef, useState } from "react";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { BookSettings } from "@/types/book";

const DEFAULT_SETTINGS = {
  disableBottomScrubber: false,
  spotifyMood: null as string | null,
};

export function useBookSettings(bookHash: string | null) {
  const [settings, setSettings] = useState<BookSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<BookSettings | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    if (!bookHash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    IndexedDBService.getBookSettings(bookHash)
      .then((stored) => {
        if (cancelled) return;
        if (stored) {
          setSettings(stored);
        } else {
          setSettings({
            bookHash,
            ...DEFAULT_SETTINGS,
            updatedAt: Date.now(),
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSettings({
          bookHash,
          ...DEFAULT_SETTINGS,
          updatedAt: Date.now(),
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookHash]);

  const saveSettings = useCallback(
    async (partial: Partial<BookSettings>) => {
      if (!bookHash) return;
      const base = settingsRef.current ?? {
        bookHash,
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
      };
      const merged: BookSettings = {
        ...base,
        ...partial,
        bookHash,
        updatedAt: Date.now(),
      };
      settingsRef.current = merged;
      setSettings(merged);
      await IndexedDBService.saveBookSettings(merged);
    },
    [bookHash]
  );

  return { settings, loading, saveSettings };
}
