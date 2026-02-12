import { useState } from "react";
import { UserCheck, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowToggleButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  className?: string;
}

export function FollowToggleButton({
  isFollowing,
  onToggle,
  className,
}: FollowToggleButtonProps) {
  const [hover, setHover] = useState(false);
  const label = isFollowing ? (hover ? "Unfollow" : "Following") : "Follow";

  const Icon = isFollowing ? (hover ? UserMinus : UserCheck) : UserPlus;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={cn(
        "min-w-[112px] rounded-full px-4 transition-all duration-200 active:scale-[0.98]",
        isFollowing &&
          "border-border/80 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-500",
        !isFollowing && "hover:brightness-95",
        className
      )}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={isFollowing}
      aria-label={label}
    >
      <span key={label} className="inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 animate-in fade-in-0 zoom-in-95 duration-150" />
        <span className="animate-in fade-in-0 zoom-in-95 duration-150">{label}</span>
      </span>
    </Button>
  );
}
