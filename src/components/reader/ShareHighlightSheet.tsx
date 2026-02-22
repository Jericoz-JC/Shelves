import { useEffect, useState } from "react";
import type { NewChronicleDraft } from "@/hooks/useChronicles";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const MAX_CHARS = 500;

interface ShareHighlightSheetProps {
  open: boolean;
  highlightText: string;
  bookTitle: string | null;
  bookHash: string | null;
  onPost: (draft: NewChronicleDraft) => void;
  onDismiss: () => void;
}

export function ShareHighlightSheet({
  open,
  highlightText,
  bookTitle,
  bookHash,
  onPost,
  onDismiss,
}: ShareHighlightSheetProps) {
  const [comment, setComment] = useState("");
  const [spoilerTag, setSpoilerTag] = useState(false);

  // Reset fields each time the sheet opens
  useEffect(() => {
    if (open) {
      setComment("");
      setSpoilerTag(false);
    }
  }, [open]);

  const charCount = comment.length;
  const overLimit = charCount > MAX_CHARS;
  const canPost = !overLimit && highlightText.trim().length > 0;

  const handleSubmit = () => {
    if (!canPost) return;
    onPost({
      text: comment.trim(),
      highlightText: highlightText.trim(),
      bookTitle: bookTitle ?? undefined,
      bookHash: bookHash ?? undefined,
      spoilerTag: spoilerTag || undefined,
    });
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()} direction="bottom">
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Share to Chronicles</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 flex flex-col gap-3 overflow-y-auto">
          {/* Quoted passage */}
          <div className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
            <div className="flex">
              <div className="w-1 shrink-0 bg-accent/60 rounded-l-lg" />
              <div className="px-3 py-2.5 flex-1 min-w-0">
                <p className="text-[13px] leading-relaxed text-foreground/80 italic line-clamp-5">
                  &ldquo;{highlightText}&rdquo;
                </p>
                {bookTitle && (
                  <p className="mt-1.5 text-[11px] font-medium text-muted-foreground truncate">
                    &mdash; {bookTitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comment textarea */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your thoughts… (optional)"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Spoiler toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={spoilerTag}
              onChange={(e) => setSpoilerTag(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
            />
            <span className="text-[13px] text-muted-foreground">
              Mark as spoiler
            </span>
          </label>
        </div>

        <DrawerFooter className="flex-row items-center justify-between pt-3">
          <span
            className={`text-[12px] font-medium tabular-nums ${
              overLimit
                ? "text-destructive"
                : charCount > MAX_CHARS * 0.8
                ? "text-amber-500"
                : "text-muted-foreground"
            }`}
          >
            {charCount}/{MAX_CHARS}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDismiss}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canPost}>
              Chronicle
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
