import type { ReadingClub } from "@/data/mockDiscovery";

interface ReadingClubsProps {
  clubs: ReadingClub[];
}

export function ReadingClubs({ clubs }: ReadingClubsProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Active Reading Clubs</h2>
      <div className="mt-3 space-y-3">
        {clubs.map((club) => (
          <article key={club.id} className="rounded-xl px-2 py-1.5 hover:bg-secondary/50">
            <p className="text-sm font-semibold">{club.name}</p>
            <p className="text-xs text-muted-foreground">Now reading: {club.currentBook}</p>
            <p className="mt-1 text-xs text-muted-foreground">{club.members} members</p>
          </article>
        ))}
      </div>
    </section>
  );
}
