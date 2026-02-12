import { useState, useEffect } from "react";
import { MessageCircle, Repeat2, Heart, Share, Check, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChronicleActionsProps {
  replyCount: number;
  repostCount: number;
  likeCount: number;
  isLiked: boolean;
  isReposted: boolean;
  text: string;
  isBookmarked: boolean;
  onLike: () => void;
  onRepost: () => void;
  onReplyToggle: () => void;
  onBookmark: () => void;
}

export function ChronicleActions({
  replyCount,
  repostCount,
  likeCount,
  isLiked,
  isReposted,
  text,
  isBookmarked,
  onLike,
  onRepost,
  onReplyToggle,
  onBookmark,
}: ChronicleActionsProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleShare = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <div className="flex justify-between max-w-md mt-3">
      {/* Reply */}
      <button
        onClick={onReplyToggle}
        className="group/action flex items-center gap-1.5 text-muted-foreground hover:text-accent/70 transition-colors"
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover/action:bg-accent/10 transition-colors">
          <MessageCircle className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[13px]">{replyCount > 0 ? replyCount : ""}</span>
      </button>

      {/* Repost */}
      <button
        onClick={onRepost}
        className={cn(
          "group/action flex items-center gap-1.5 transition-colors",
          isReposted
            ? "text-green-500"
            : "text-muted-foreground hover:text-green-500/70"
        )}
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover/action:bg-green-500/10 transition-colors">
          <Repeat2
            className={cn(
              "h-[18px] w-[18px] transition-transform",
              isReposted && "scale-110"
            )}
          />
        </span>
        <span className="text-[13px]">{repostCount > 0 ? repostCount : ""}</span>
      </button>

      {/* Like */}
      <button
        onClick={onLike}
        className={cn(
          "group/action flex items-center gap-1.5 transition-colors",
          isLiked
            ? "text-red-400"
            : "text-muted-foreground hover:text-red-400/70"
        )}
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover/action:bg-red-400/10 transition-colors">
          <Heart
            className={cn(
              "h-[18px] w-[18px] transition-transform",
              isLiked && "scale-110 fill-current"
            )}
          />
        </span>
        <span className="text-[13px]">{likeCount > 0 ? likeCount : ""}</span>
      </button>

      {/* Bookmark */}
      <button
        onClick={onBookmark}
        className={cn(
          "group/action flex items-center gap-1.5 transition-colors",
          isBookmarked
            ? "text-accent"
            : "text-muted-foreground hover:text-accent/70"
        )}
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover/action:bg-accent/10 transition-colors">
          <Bookmark
            className={cn(
              "h-[18px] w-[18px] transition-transform",
              isBookmarked && "scale-110 fill-current"
            )}
          />
        </span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className={cn(
          "group/action flex items-center gap-1.5 transition-colors",
          copied
            ? "text-green-500"
            : "text-muted-foreground hover:text-accent/70"
        )}
      >
        <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover/action:bg-accent/10 transition-colors">
          {copied ? (
            <Check className="h-[18px] w-[18px]" />
          ) : (
            <Share className="h-[18px] w-[18px]" />
          )}
        </span>
      </button>
    </div>
  );
}
