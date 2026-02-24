import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UserAvatar } from "./UserAvatar";

const DEBOUNCE_MS = 300;
const LISTBOX_ID = "user-search-results";

type UserSearchResult = {
  clerkId: string;
  name?: string;
  handle?: string;
  avatarUrl?: string;
};

export function UserSearch() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const trimmedDebouncedQuery = debouncedQuery.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setShowDropdown(trimmedDebouncedQuery.length > 0);
  }, [trimmedDebouncedQuery]);

  useEffect(() => {
    const handlePointerStart = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handlePointerStart);
    document.addEventListener("touchstart", handlePointerStart, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerStart);
      document.removeEventListener("touchstart", handlePointerStart);
    };
  }, []);

  const results = (useQuery(
    api.users.search,
    trimmedDebouncedQuery
      ? { query: trimmedDebouncedQuery, limit: 8 }
      : "skip"
  ) ?? []) as UserSearchResult[];

  const hasResults = results.length > 0;
  const emptyMessage =
    !trimmedDebouncedQuery || hasResults
      ? ""
      : `No readers found for "${trimmedDebouncedQuery}".`;

  return (
    <div ref={containerRef} className="relative">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShowDropdown(false);
            }
          }}
          placeholder="Search reader handles"
          aria-label="Search reader handles"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={LISTBOX_ID}
          className="h-11 w-full rounded-full border border-border/60 bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
        />
      </label>

      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {hasResults ? (
            <ul id={LISTBOX_ID} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {results.map((user) => (
                <li key={user.clerkId}>
                  <button
                    id={`user-option-${user.clerkId}`}
                    role="option"
                    type="button"
                    onClick={() => {
                      navigate(`/feed/profile/${user.clerkId}`);
                      setQuery("");
                      setDebouncedQuery("");
                      setShowDropdown(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/40"
                  >
                    <UserAvatar
                      displayName={user.name ?? "Reader"}
                      avatarUrl={user.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.name ?? "Reader"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.handle ?? "reader"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
