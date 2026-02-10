import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEpub } from "@/hooks/useEpub";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReadingSpeed } from "@/hooks/useReadingSpeed";
import { useChapters } from "@/hooks/useChapters";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import { useNotes } from "@/hooks/useNotes";
import { ReaderControls } from "@/components/reader/ReaderControls";
import { ReaderChapterSheet } from "@/components/reader/ReaderChapterSheet";
import { ReaderNavigation } from "@/components/reader/ReaderNavigation";
import { ReaderProgress } from "@/components/reader/ReaderProgress";
import { ReaderTimeline } from "@/components/reader/ReaderTimeline";
import { ReaderNotesLayer } from "@/components/reader/ReaderNotesLayer";
import { IndexedDBService } from "@/lib/db/indexedDB";
import {
  type ReadingTheme,
  FONT_SIZE_DEFAULT,
  FONT_FAMILIES,
} from "@/lib/theme/readingThemes";

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{
    cfi: string;
    side: "left" | "right";
    percentage: number | null;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    start: { cfi: string; percentage: number };
  } | null>(null);

  // Reading preferences (stored in state for now, Convex later)
  const [theme, setTheme] = useState<ReadingTheme>("paper");
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].value);

  const { book, rendition, loading, indexing, error, viewerRef, goNext, goPrev, goToLocation } =
    useEpub(arrayBuffer, {
      bookHash: bookId ?? undefined,
      theme,
      fontSize,
      fontFamily,
    });

  const { progress } = useReadingProgress({
    bookHash: bookId ?? null,
    rendition,
  });

  const readingSpeed = useReadingSpeed(rendition);
  const chapters = useChapters(book);
  const chapterProgress = useChapterProgress(book, rendition, chapters);
  const { notes, addNote, deleteNote } = useNotes(bookId ?? null);

  // Load book from IndexedDB
  useEffect(() => {
    if (!bookId) return;

    IndexedDBService.getBook(bookId).then((stored) => {
      if (stored) {
        setArrayBuffer(stored.data);
      } else {
        setLoadError("Book not found in local storage.");
      }
    });
  }, [bookId]);

  useEffect(() => {
    if (!rendition) return;
    const onRelocated = (location: { start: { cfi: string; percentage: number } }) => {
      setCurrentLocation(location);
    };
    rendition.on("relocated", onRelocated);
    return () => {
      rendition.off("relocated", onRelocated);
    };
  }, [rendition]);

  // Toggle controls on center tap
  const handleCenterTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const handleAddNote = useCallback(
    (side: "left" | "right") => {
      const cfi = currentLocation?.start?.cfi;
      if (!cfi) return;
      const percentage = Number.isFinite(currentLocation?.start?.percentage)
        ? currentLocation?.start?.percentage
        : null;
      setNoteDraft({ cfi, side, percentage });
      setNoteText("");
    },
    [currentLocation]
  );

  const handleSaveNote = useCallback(async () => {
    if (!noteDraft || !bookId) return;
    const trimmed = noteText.trim();
    if (!trimmed) return;
    await addNote({
      bookHash: bookId,
      cfi: noteDraft.cfi,
      text: trimmed,
      percentage: noteDraft.percentage,
    });
    setNoteDraft(null);
    setNoteText("");
  }, [addNote, bookId, noteDraft, noteText]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        if (e.key === " ") e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setShowControls(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  if (loadError || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-destructive">{loadError || error}</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Back to Library
        </Button>
      </div>
    );
  }

  const etaMinutes =
    readingSpeed && progress?.percentage !== undefined
      ? (1 - progress.percentage) / readingSpeed
      : null;

  const locations = book?.locations;
  const locationsReady =
    !!locations &&
    typeof locations.length === "function" &&
    locations.length() > 0;

  const noteMarkers = notes
    .map((note) => {
      let percentage = note.percentage ?? null;
      if (percentage === null && book?.locations) {
        const computed = book.locations.percentageFromCfi(note.cfi);
        if (computed !== null) percentage = computed;
      }
      if (percentage === null) return null;
      return {
        id: note.id,
        percentage: Math.min(Math.max(percentage, 0), 1),
        text: note.text,
      };
    })
    .filter((marker): marker is { id: string; percentage: number; text: string } => Boolean(marker));

  return (
    <div className="h-dvh flex flex-col overflow-hidden" data-reading-theme={theme}>
      {/* Top bar - visible on toggle */}
      <header
        className={`reading-surface absolute top-0 left-0 right-0 z-30 backdrop-blur-md border-b transition-all duration-300 ${
          showControls
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate("/library")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ReaderChapterSheet
              book={book}
              chapters={chapters}
              onNavigate={(target) => rendition?.display(target)}
            />
            <ReaderControls
              theme={theme}
              fontSize={fontSize}
              fontFamily={fontFamily}
              onThemeChange={setTheme}
              onFontSizeChange={setFontSize}
              onFontFamilyChange={setFontFamily}
            />
          </div>
        </div>
      </header>

      {/* ePub viewer */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-background">
            <div className="space-y-4 w-64">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/6" />
            </div>
          </div>
        )}

        {indexing && !loading && (
          <div className="reading-surface absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-foreground/70 shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Indexing
          </div>
        )}

        <div
          ref={viewerRef}
          className="w-full h-full reader-container"
        />

        <ReaderNotesLayer markers={noteMarkers} onDelete={deleteNote} />

        <ReaderNavigation onPrev={goPrev} onNext={goNext} onAddNote={handleAddNote} />

        {/* Center tap zone to toggle controls */}
        <button
          onClick={handleCenterTap}
          className="absolute top-0 left-[40%] w-[20%] h-full z-10"
          aria-label="Toggle controls"
        />

        {noteDraft && (
          <div
            className={`reading-surface absolute bottom-24 z-30 w-72 rounded-2xl border border-[color:var(--reading-border)] p-4 shadow-lg ${
              noteDraft.side === "left" ? "left-6" : "right-6"
            }`}
          >
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Margin note
            </p>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Leave a quick note…"
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-[color:var(--reading-border)] bg-transparent p-2 text-sm outline-none focus:border-[color:var(--reading-accent)]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNoteDraft(null)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={() => void handleSaveNote()}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom progress */}
      <footer
        className={`reading-surface backdrop-blur-md border-t transition-all duration-300 ${
          showControls
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <ReaderProgress
          percentage={progress?.percentage ?? 0}
          chapterTitle={chapterProgress.currentChapter?.label ?? null}
          chapterIndex={chapterProgress.chapterIndex}
          totalChapters={chapterProgress.totalChapters}
          chaptersRemaining={chapterProgress.chaptersRemaining}
          chapterProgress={chapterProgress.chapterProgress}
          etaMinutes={etaMinutes}
        />
        <ReaderTimeline
          percentage={progress?.percentage ?? 0}
          markers={noteMarkers}
          onScrub={(percent) => {
            if (!locationsReady || !locations) return;
            const cfi = locations.cfiFromPercentage(percent);
            if (cfi) {
              goToLocation(cfi);
            }
          }}
          disabled={!locationsReady}
        />
      </footer>
    </div>
  );
}
