import type { TrendingBook } from "@/data/mockDiscovery";

interface TrendingBooksProps {
  books: TrendingBook[];
}

export function TrendingBooks({ books }: TrendingBooksProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Trending Books</h2>
      <div className="mt-3 space-y-3">
        {books.map((book) => (
          <article key={book.id} className="rounded-xl px-2 py-1.5 hover:bg-secondary/50">
            <p className="text-sm font-semibold">{book.title}</p>
            <p className="text-xs text-muted-foreground">{book.author}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {book.chronicles} chronicles today
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
