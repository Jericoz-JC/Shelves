import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/social/UserAvatar";
import type { SuggestedReader } from "@/data/mockDiscovery";

interface SuggestedReadersProps {
  readers: SuggestedReader[];
}

export function SuggestedReaders({ readers }: SuggestedReadersProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Suggested Readers</h2>
      <div className="mt-3 space-y-3">
        {readers.map((reader) => {
          return (
            <article key={reader.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-secondary/50">
              <UserAvatar
                displayName={reader.displayName}
                avatarUrl={reader.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{reader.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{reader.handle}</p>
                <p className="truncate text-xs text-muted-foreground">{reader.reason}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full">
                Follow
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
