import { useCallback, useMemo, useState } from "react";
import { List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Book } from "epubjs";
import type { ChapterItem } from "@/hooks/useChapters";

interface ReaderChapterSheetProps {
  book: Book | null;
  chapters: ChapterItem[];
  onNavigate: (target: string) => void;
}

function normalizeHref(href: string) {
  return href.split("#")[0];
}

function stripText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function ReaderChapterSheet({
  book,
  chapters,
  onNavigate,
}: ReaderChapterSheetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const [activePreview, setActivePreview] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((ch) => ch.label.toLowerCase().includes(q));
  }, [chapters, query]);

  const loadPreview = useCallback(
    async (chapter: ChapterItem) => {
      if (!book) return;
      if (previewCache[chapter.href]) return;

      const href = normalizeHref(chapter.href);
      const section = book.spine.get(href);
      if (!section) return;

      try {
        const contents = await section.load(book.load.bind(book));
        const doc =
          (contents as { document?: Document })?.document ??
          (contents as Document);
        const rawText = doc?.body?.textContent ?? doc?.textContent ?? "";
        const text = stripText(rawText);
        const snippet = text.slice(0, 260);
        setPreviewCache((prev) => ({ ...prev, [chapter.href]: snippet }));
      } finally {
        section.unload();
      }
    },
    [book, previewCache]
  );

  const handleChapterClick = async (chapter: ChapterItem) => {
    if (activePreview !== chapter.href) {
      setActivePreview(chapter.href);
      await loadPreview(chapter);
      return;
    }
    onNavigate(chapter.href);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="reading-surface-button h-10 w-10 rounded-full"
        >
          <List className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="reading-surface border-b border-[color:var(--reading-border)] px-6 pb-6 pt-5"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="font-display text-xl tracking-tight">
            Chapters
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[color:var(--reading-border)] bg-[color:var(--reading-surface-muted)] px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chapters"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ScrollArea className="mt-4 h-[60vh] pr-3">
          <div className="space-y-3">
            {filtered.map((chapter) => {
              const preview = previewCache[chapter.href];
              const isActive = activePreview === chapter.href;
              return (
                <button
                  key={chapter.id}
                  onClick={() => void handleChapterClick(chapter)}
                  onMouseEnter={() => {
                    setActivePreview(chapter.href);
                    void loadPreview(chapter);
                  }}
                  onFocus={() => {
                    setActivePreview(chapter.href);
                    void loadPreview(chapter);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[color:var(--reading-accent)] bg-[color:var(--reading-surface-muted)]"
                      : "border-[color:var(--reading-border)] hover:bg-[color:var(--reading-surface-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base">{chapter.label}</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      {isActive ? "Tap again" : "Preview"}
                    </span>
                  </div>
                  {preview ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {preview}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isActive ? "Loading preview…" : "Tap to preview"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
