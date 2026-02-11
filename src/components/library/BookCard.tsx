import { useRef, useState, type PointerEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookMetadata } from "@/types/book";

interface BookCardProps {
  book: BookMetadata;
  index: number;
  onDelete: () => void;
}

export function BookCard({ book, index, onDelete }: BookCardProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setDeleteOpen(true);
    }, 500);
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  const handlePointerLeave = () => {
    clearLongPressTimer();
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (longPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggeredRef.current = false;
      return;
    }
    navigate(`/read/${book.fileHash}`);
  };

  return (
    <>
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
        className="group text-left w-full"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-muted p-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
              <span className="font-display text-sm text-center text-muted-foreground/70 leading-tight line-clamp-3">
                {book.title}
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-0.5 px-0.5">
          <h3 className="font-display text-sm font-medium leading-tight line-clamp-2 group-hover:text-accent transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
        </div>
      </button>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            longPressTriggeredRef.current = false;
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book?</DialogTitle>
            <DialogDescription>
              This removes &quot;{book.title}&quot; from this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
