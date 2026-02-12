import { useState } from "react";
import { Search } from "lucide-react";
import type { ReadingClub, SuggestedReader, TrendingBook } from "@/data/mockDiscovery";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadingClubs } from "./widgets/ReadingClubs";
import { SuggestedReaders } from "./widgets/SuggestedReaders";
import { TrendingBooks } from "./widgets/TrendingBooks";

interface FeedRightRailProps {
  trending: TrendingBook[];
  clubs: ReadingClub[];
  suggested: SuggestedReader[];
  loading?: boolean;
}

export function FeedRightRail({
  trending,
  clubs,
  suggested,
  loading = false,
}: FeedRightRailProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) {
    return (
      <aside
        className="hidden xl:block xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:py-5 xl:pl-4"
        aria-busy="true"
        aria-label="Loading discovery widgets"
      >
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <Skeleton className="h-6 w-36" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <Skeleton className="h-6 w-44" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:block xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:py-5 xl:pl-4">
      <div className="space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search readers, books, chronicles"
            aria-describedby="feed-search-help"
            className="h-11 w-full rounded-full border border-border/60 bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
          />
        </label>
        {/* TODO: Wire this input to real search once Convex-backed querying is implemented. */}
        <p id="feed-search-help" className="text-xs text-muted-foreground px-1">
          Search results are coming soon.
        </p>
        <TrendingBooks books={trending} />
        <ReadingClubs clubs={clubs} />
        <SuggestedReaders readers={suggested} />
      </div>
    </aside>
  );
}
