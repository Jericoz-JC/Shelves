import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEpub } from "@/hooks/useEpub";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { ReaderControls } from "@/components/reader/ReaderControls";
import { ReaderNavigation } from "@/components/reader/ReaderNavigation";
import { ReaderProgress } from "@/components/reader/ReaderProgress";
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

  // Reading preferences (stored in state for now, Convex later)
  const [theme, setTheme] = useState<ReadingTheme>("paper");
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);

  const { rendition, loading, error, viewerRef, goNext, goPrev } = useEpub(
    arrayBuffer,
    { theme, fontSize, fontFamily }
  );

  const { progress } = useReadingProgress({
    bookHash: bookId ?? null,
    rendition,
  });

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

  // Toggle controls on center tap
  const handleCenterTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
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

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Top bar — visible on toggle */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300 ${
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
          <ReaderControls
            theme={theme}
            fontSize={fontSize}
            fontFamily={fontFamily}
            onThemeChange={setTheme}
            onFontSizeChange={setFontSize}
            onFontFamilyChange={setFontFamily}
          />
        </div>
      </header>

      {/* ePub viewer */}
      <div className="flex-1 relative" data-reading-theme={theme}>
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

        <div
          ref={viewerRef}
          className="w-full h-full reader-container"
        />

        <ReaderNavigation onPrev={goPrev} onNext={goNext} />

        {/* Center tap zone to toggle controls */}
        <button
          onClick={handleCenterTap}
          className="absolute top-0 left-1/3 w-1/3 h-full z-10"
          aria-label="Toggle controls"
        />
      </div>

      {/* Bottom progress */}
      <footer
        className={`bg-background/80 backdrop-blur-md border-t border-border/50 transition-all duration-300 ${
          showControls
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <ReaderProgress percentage={progress?.percentage ?? 0} />
      </footer>
    </div>
  );
}
