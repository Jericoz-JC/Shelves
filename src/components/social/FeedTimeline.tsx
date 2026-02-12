import type { Chronicle, Reply } from "@/types/social";
import { ChronicleCard } from "./ChronicleCard";

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
        />
      ))}
    </div>
  );
}
