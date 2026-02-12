import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { Chronicle, Reply } from "@/types/social";
import { getUserById } from "@/data/mockFeed";
import { relativeTime } from "@/lib/utils/relativeTime";
import { UserAvatar } from "./UserAvatar";
import { ChronicleActions } from "./ChronicleActions";
import { ChronicleReplies } from "./ChronicleReplies";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChronicleCardProps {
  chronicle: Chronicle;
  replies: Reply[];
  isBookmarked: boolean;
  onLike: (id: string) => void;
  onRepost: (id: string) => void;
  onReply: (chronicleId: string, text: string) => void;
  onAvatarClick: (userId: string) => void;
  onBookmark: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ChronicleCard({
  chronicle,
  replies,
  isBookmarked,
  onLike,
  onRepost,
  onReply,
  onAvatarClick,
  onBookmark,
  onDelete,
}: ChronicleCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const user = getUserById(chronicle.authorId);
  if (!user) return null;

  const isOwn = chronicle.authorId === "me";

  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors">
        <UserAvatar
          displayName={user.displayName}
          onClick={() => onAvatarClick(user.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-semibold truncate">
              {user.displayName}
            </span>
            <span className="text-[13px] text-muted-foreground truncate">
              @{user.handle}
            </span>
            <span className="text-[13px] text-muted-foreground">&middot;</span>
            <span className="text-[13px] text-muted-foreground shrink-0">
              {relativeTime(chronicle.createdAt)}
            </span>
            {isOwn && onDelete && (
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete chronicle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <p className="text-[15px] leading-relaxed mt-1">{chronicle.text}</p>
          <ChronicleActions
            replyCount={chronicle.replyCount}
            repostCount={chronicle.repostCount}
            likeCount={chronicle.likeCount}
            isLiked={chronicle.isLiked}
            isReposted={chronicle.isReposted}
            text={chronicle.text}
            isBookmarked={isBookmarked}
            onLike={() => onLike(chronicle.id)}
            onRepost={() => onRepost(chronicle.id)}
            onReplyToggle={() => setShowReplies((s) => !s)}
            onBookmark={() => onBookmark(chronicle.id)}
          />
        </div>
      </div>

      {/* Animated reply expand/collapse */}
      <div
        className="grid transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: showReplies ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ChronicleReplies
            replies={replies}
            onReply={(text) => onReply(chronicle.id, text)}
            onAvatarClick={onAvatarClick}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chronicle?</DialogTitle>
            <DialogDescription>
              This can't be undone and it will be removed from your profile and the timeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(chronicle.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
