import type { MockBook } from "@/types/social";
import type { BookMetadata } from "@/types/book";

interface ProfileBookGridProps {
  books: MockBook[] | BookMetadata[];
  isCurrentUser: boolean;
}

function isMockBook(book: MockBook | BookMetadata): book is MockBook {
  return "color" in book;
}

export function ProfileBookGrid({ books, isCurrentUser }: ProfileBookGridProps) {
  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {isCurrentUser ? "No books yet" : "No shared books yet"}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {books.map((book) => {
        const key = isMockBook(book) ? book.id : book.fileHash;
        const title = book.title;
        const author = book.author;

        return (
          <div key={key} className="flex flex-col gap-1.5">
            {isMockBook(book) ? (
              <div
                className="aspect-[2/3] rounded-md flex items-end p-2"
                style={{ backgroundColor: book.color }}
              >
                <span className="text-[10px] text-white/80 font-medium leading-tight line-clamp-2">
                  {title}
                </span>
              </div>
            ) : book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={title}
                className="aspect-[2/3] rounded-md object-cover"
              />
            ) : (
              <div className="aspect-[2/3] rounded-md bg-accent/20 flex items-end p-2">
                <span className="text-[10px] text-accent font-medium leading-tight line-clamp-2">
                  {title}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate">{title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{author}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
