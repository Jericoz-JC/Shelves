import { useState } from "react";
import type { Reply } from "@/types/social";
import { getUserById } from "@/data/mockFeed";
import { relativeTime } from "@/lib/utils/relativeTime";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";

interface ChronicleRepliesProps {
  replies: Reply[];
  onReply: (text: string) => void;
  onAvatarClick?: (userId: string) => void;
}

export function ChronicleReplies({ replies, onReply, onAvatarClick }: ChronicleRepliesProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setText("");
  };

  return (
    <div className="bg-secondary/20 border-t border-border/30 pl-12 pr-4 py-2">
      {replies.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No replies yet — be the first!
        </p>
      )}
      {replies.map((reply) => {
        const user = getUserById(reply.authorId);
        if (!user) {
          if (import.meta.env.DEV) {
            // Helps identify orphaned mock/live reply records during development.
            console.warn(`Missing user for reply ${reply.id} (${reply.authorId})`);
          }
          return null;
        }
        return (
          <div key={reply.id} className="flex gap-2 py-2">
            <UserAvatar
              displayName={user.displayName}
              size="sm"
              onClick={onAvatarClick ? () => onAvatarClick(user.id) : undefined}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-semibold truncate">
                  {user.displayName}
                </span>
                <span className="text-[12px] text-muted-foreground">&middot;</span>
                <span className="text-[12px] text-muted-foreground shrink-0">
                  {relativeTime(reply.createdAt)}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed mt-0.5">{reply.text}</p>
            </div>
          </div>
        );
      })}

      {/* Mini reply composer */}
      <div className="flex gap-2 py-2 mt-1 border-t border-border/20">
        <UserAvatar displayName="You" size="sm" />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Reply..."
            className="flex-1 bg-secondary/50 border border-border/50 rounded-full px-3 py-1.5 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
          <Button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="bg-accent text-accent-foreground rounded-full px-4 h-8 text-[13px] font-semibold hover:bg-accent/90 disabled:opacity-50"
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
