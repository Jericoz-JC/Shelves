import { useState, useEffect, useRef, useCallback } from "react";
import type { Rendition } from "epubjs";
import { IndexedDBService } from "@/lib/db/indexedDB";
import type { ReaderNote } from "@/types/book";
import type { ReadingTheme } from "@/lib/theme/readingThemes";

export type HighlightColor = "yellow" | "blue" | "green" | "pink";

const HIGHLIGHT_FILL: Record<HighlightColor, string> = {
  yellow: "#FFD700",
  blue:   "#7BB5FF",
  green:  "#6DD68A",
  pink:   "#FF8EC4",
};

function getAnnotationStyles(color: HighlightColor, theme: ReadingTheme) {
  return {
    fill:             HIGHLIGHT_FILL[color],
    "fill-opacity":   theme === "night" ? "0.45" : "0.40",
    "mix-blend-mode": theme === "night" ? "screen" : "multiply",
  };
}

export interface ToolbarState {
  pendingCfi: string | null;
  pendingText: string;
  x: number;
  y: number;
}

export interface DeleteTarget {
  cfi: string;
  x: number;
  y: number;
}

// epub.js Contents object (partial)
interface EpubContents {
  window: Window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  range: (cfi: string) => any;
}

export function useHighlights(
  rendition: Rendition | null,
  bookHash: string | null,
  viewerRef: React.RefObject<HTMLDivElement | null>,
  theme: ReadingTheme
) {
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    pendingCfi: null,
    pendingText: "",
    x: 0,
    y: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [hasActiveSelection, setHasActiveSelection] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const highlightsRef = useRef<ReaderNote[]>([]);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Load and apply saved highlights whenever the rendition or book changes
  useEffect(() => {
    if (!rendition || !bookHash) return;

    async function loadHighlights() {
      const notes = await IndexedDBService.getNotes(bookHash!);
      const highlights = notes.filter((n) => !!n.color);
      highlightsRef.current = highlights;

      // Remove before re-adding — prevents duplicate DOM nodes when this
      // effect re-runs on a theme change (annotations.add is not idempotent
      // at the DOM level even though the internal map entry is overwritten)
      for (const h of highlights) {
        try { rendition!.annotations.remove(h.cfi, "highlight"); } catch {}
      }
      for (const h of highlights) {
        const cls = `hl-${h.color}`;
        const styles = getAnnotationStyles(h.color!, themeRef.current);
        try {
          rendition!.annotations.add(
            "highlight",
            h.cfi,
            { id: h.id },
            undefined,
            cls,
            styles
          );
        } catch {
          // CFI may be invalid if book version changed — skip silently
        }
      }
    }

    void loadHighlights();
  }, [rendition, bookHash, theme]);

  // Wire selection and markClicked events
  useEffect(() => {
    if (!rendition) return;

    function handleSelected(cfiRange: string, contents: EpubContents) {
      const sel = contents.window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const text = sel.toString().trim();
      if (!text || text.length < 3) return;

      setHasActiveSelection(true);

      const range = sel.getRangeAt(0);
      const selRect = range.getBoundingClientRect();
      const iframe = viewerRef.current?.querySelector("iframe");

      if (!iframe) {
        setToolbarState({
          pendingCfi: cfiRange,
          pendingText: text,
          x: window.innerWidth / 2,
          y: 120,
        });
        return;
      }

      const iframeRect = iframe.getBoundingClientRect();
      const outerX = iframeRect.left + selRect.left + selRect.width / 2;
      const outerY = iframeRect.top + selRect.top;

      setToolbarState({
        pendingCfi: cfiRange,
        pendingText: text,
        x: outerX,
        y: outerY,
      });
    }

    function handleMarkClicked(
      cfiRange: string,
      _data: unknown,
      contents: EpubContents
    ) {
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      try {
        const range = contents.range(cfiRange);
        const rect = range.getBoundingClientRect();
        const iframe = viewerRef.current?.querySelector("iframe");
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          x = iframeRect.left + rect.left + rect.width / 2;
          y = iframeRect.top + rect.top;
        }
      } catch {
        // fallback to center if range lookup fails
      }

      setDeleteTarget({ cfi: cfiRange, x, y });
    }

    rendition.on("selected", handleSelected);
    rendition.on("markClicked", handleMarkClicked);

    return () => {
      rendition.off("selected", handleSelected);
      rendition.off("markClicked", handleMarkClicked);
    };
  }, [rendition, viewerRef]);

  const dismissToolbar = useCallback(() => {
    setToolbarState({ pendingCfi: null, pendingText: "", x: 0, y: 0 });
    setDeleteTarget(null);
    setHasActiveSelection(false);
    const iframe = viewerRef.current?.querySelector(
      "iframe"
    ) as HTMLIFrameElement | null;
    iframe?.contentWindow?.getSelection()?.removeAllRanges();
  }, [viewerRef]);

  const openShare = useCallback(() => setShareOpen(true), []);

  const closeShare = useCallback(() => {
    setShareOpen(false);
    dismissToolbar();
  }, [dismissToolbar]);

  const saveHighlight = useCallback(
    async (color: HighlightColor) => {
      if (!rendition || !bookHash || !toolbarState.pendingCfi) return;

      const cfi = toolbarState.pendingCfi;
      const text = toolbarState.pendingText;
      const id = `${bookHash}-${Date.now()}`;
      const cls = `hl-${color}`;
      const styles = getAnnotationStyles(color, theme);

      rendition.annotations.add("highlight", cfi, { id }, undefined, cls, styles);

      const note: ReaderNote = {
        id,
        bookHash,
        cfi,
        text: "",
        highlightedText: text,
        color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await IndexedDBService.saveNote(note);
      highlightsRef.current = [...highlightsRef.current, note];
      dismissToolbar();
    },
    [rendition, bookHash, toolbarState, theme, dismissToolbar]
  );

  const deleteHighlight = useCallback(async () => {
    if (!rendition || !deleteTarget) return;

    const { cfi } = deleteTarget;
    rendition.annotations.remove(cfi, "highlight");

    const note = highlightsRef.current.find((n) => n.cfi === cfi);
    if (note) {
      await IndexedDBService.deleteNote(note.id);
      highlightsRef.current = highlightsRef.current.filter(
        (n) => n.cfi !== cfi
      );
    }

    setDeleteTarget(null);
  }, [rendition, deleteTarget]);

  return {
    toolbarState,
    deleteTarget,
    hasActiveSelection,
    shareOpen,
    saveHighlight,
    deleteHighlight,
    dismissToolbar,
    openShare,
    closeShare,
  };
}
