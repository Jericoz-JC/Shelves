import { Link } from "react-router-dom";
import { BookUpload } from "@/components/library/BookUpload";
import { BookCard } from "@/components/library/BookCard";
import { useLibrary } from "@/hooks/useIndexedDB";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, ScrollText } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";

export default function Library() {
  const { books, loading, refresh, deleteBook } = useLibrary();

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Shelves
          </h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="default">
              <Link to="/feed">
                <ScrollText className="mr-2 h-4 w-4" />
                <span>Chronicles</span>
              </Link>
            </Button>
            <BookUpload onUploadComplete={refresh} />
          </div>
        </div>
      </header>

      {/* Library Grid */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[2/3] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="font-display text-xl font-medium mb-2">
              Your shelf is empty
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Upload an ePub file to start reading. Your books are stored
              locally on this device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {books.map((book, index) => (
              <BookCard
                key={book.fileHash}
                book={book}
                index={index}
                onDelete={() => deleteBook(book.fileHash)}
              />
            ))}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
