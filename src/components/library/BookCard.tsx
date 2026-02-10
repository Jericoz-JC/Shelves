import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import type { BookMetadata } from "@/types/book";

interface BookCardProps {
  book: BookMetadata;
  index: number;
}

export function BookCard({ book, index }: BookCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/read/${book.fileHash}`)}
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
  );
}
