import type { Chronicle, Reply } from "@/types/social";
import { ChronicleCard } from "./ChronicleCard";
import type { ReportReason } from "./ReportDialog";

interface FeedTimelineProps {
  chronicles: Chronicle[];
  replies: Record<string, Reply[]>;
  currentUserId: string;
  emptyMessage?: string;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
  onReply: (chronicleId: string, text: string) => void;
  onAvatarClick: (userId: string) => void;
  onBookmark: (id: string) => void;
  onDelete: (id: string) => void;
  onReport?: (id: string, reason: ReportReason) => void;
  onRepliesToggle?: (chronicleId: string, expanded: boolean) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function FeedTimeline({
  chronicles,
  replies,
  currentUserId,
  emptyMessage,
  onLike,
  onRepost,
  onReply,
  onAvatarClick,
  onBookmark,
  onDelete,
  onReport,
  onRepliesToggle,
  hasMore,
  loadingMore,
  onLoadMore,
}: FeedTimelineProps) {
  if (chronicles.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <p className="text-muted-foreground text-center">
          {emptyMessage || "No chronicles yet."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {chronicles.map((chronicle) => (
        <ChronicleCard
          key={chronicle.id}
          chronicle={chronicle}
          replies={replies[chronicle.id] || []}
          currentUserId={currentUserId}
          onLike={onLike}
          onRepost={onRepost}
          onReply={onReply}
          onAvatarClick={onAvatarClick}
          onBookmark={onBookmark}
          onDelete={onDelete}
          onReport={onReport}
          onRepliesToggle={onRepliesToggle}
        />
      ))}
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 rounded-full text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
