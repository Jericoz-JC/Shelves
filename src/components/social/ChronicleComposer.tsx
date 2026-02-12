import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

const MAX_CHARS = 500;

interface ChronicleComposerProps {
  onPost: (text: string) => void;
  onAvatarClick?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function ChronicleComposer({
  onPost,
  onAvatarClick,
  className,
  autoFocus = false,
}: ChronicleComposerProps) {
  const [text, setText] = useState("");

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;

  const handlePost = () => {
    const trimmed = text.trim();
    if (!trimmed || overLimit) return;
    onPost(trimmed);
    setText("");
  };

  return (
    <div className={cn("flex gap-3 px-4 py-3 border-b border-border", className)}>
      <UserAvatar displayName="You" size="sm" onClick={onAvatarClick} />
      <div className="flex-1 flex flex-col gap-2">
        <textarea
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What are you reading?"
          rows={2}
          className="bg-transparent border-none resize-none focus:outline-none text-lg placeholder:text-muted-foreground w-full"
        />
        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "text-[13px]",
              remaining > 50
                ? "text-muted-foreground"
                : remaining > 0
                  ? "text-yellow-500"
                  : "text-red-500 font-semibold"
            )}
          >
            {remaining}
          </span>
          <Button
            onClick={handlePost}
            disabled={!text.trim() || overLimit}
            className="bg-accent text-accent-foreground rounded-full px-5 h-9 font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Chronicle
          </Button>
        </div>
      </div>
    </div>
  );
}
