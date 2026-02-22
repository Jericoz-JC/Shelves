import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ReadingTheme } from "@/lib/theme/readingThemes";
import type { ReaderBookmark } from "@/types/book";

interface ReaderBookmarkSheetProps {
  theme: ReadingTheme;
  bookmarks: ReaderBookmark[];
  loading: boolean;
  canAddCurrentBookmark: boolean;
  onAddCurrentBookmark: () => void;
  onNavigate: (target: string) => void;
  onDelete: (bookmarkId: string) => void;
}

function formatBookmarkPercentage(percentage: number | null) {
  if (percentage === null) return null;
  const safePercentage = Math.min(Math.max(percentage, 0), 1);
  return `${Math.round(safePercentage * 100)}%`;
}

export function ReaderBookmarkSheet({
  theme,
  bookmarks,
  loading,
  canAddCurrentBookmark,
  onAddCurrentBookmark,
  onNavigate,
  onDelete,
}: ReaderBookmarkSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="reading-surface-button h-10 w-10 rounded-full"
          aria-label="Open bookmarks"
        >
          <Bookmark className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="reading-surface border-b border-[color:var(--reading-border)] px-6 pb-6 pt-5"
        data-reading-theme={theme}
      >
        <SheetHeader className="p-0">
          <SheetTitle className="font-display text-xl tracking-tight">
            Bookmarks
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--reading-border)] bg-[color:var(--reading-surface-muted)] px-3 py-3">
          <div>
            <p className="text-sm font-medium text-[color:var(--reading-text)]">Current location</p>
            <p className="text-xs text-[color:var(--reading-text)]/60">
              Save where you are to return later.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddCurrentBookmark}
            disabled={!canAddCurrentBookmark}
            className="shrink-0"
          >
            <BookmarkPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        <ScrollArea className="mt-4 h-[60vh] pr-3">
          {loading ? (
            <p className="text-sm text-[color:var(--reading-text)]/60">Loading bookmarks…</p>
          ) : bookmarks.length === 0 ? (
            <p className="text-sm text-[color:var(--reading-text)]/60">
              No bookmarks yet. Add one from your current location.
            </p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bookmark, index) => {
                const percentage = formatBookmarkPercentage(bookmark.percentage);
                const bookmarkLabel = bookmark.chapter ?? `Bookmark ${bookmarks.length - index}`;
                const ariaLabel = percentage
                  ? `Go to bookmark: ${bookmarkLabel}, ${percentage} progress`
                  : `Go to bookmark: ${bookmarkLabel}`;
                return (
                  <article
                    key={bookmark.id}
                    className="flex items-center gap-2 rounded-2xl border border-[color:var(--reading-border)] bg-[color:var(--reading-surface)] px-3 py-2"
                  >
                    <button
                      type="button"
                      aria-label={ariaLabel}
                      onClick={() => onNavigate(bookmark.cfi)}
                      className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition hover:bg-[color:var(--reading-surface-muted)]"
                    >
                      <p className="truncate text-sm font-medium text-[color:var(--reading-text)]">
                        {bookmarkLabel}
                      </p>
                      <p className="text-xs text-[color:var(--reading-text)]/60">
                        {percentage ? `Progress ${percentage}` : "Saved location"}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(bookmark.id)}
                      aria-label="Delete bookmark"
                      className="h-8 w-8 shrink-0 text-[color:var(--reading-text)]/70 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
