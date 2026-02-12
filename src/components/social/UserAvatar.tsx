import { cn } from "@/lib/utils";

interface UserAvatarProps {
  displayName: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  onClick?: () => void;
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ displayName, size = "default", onClick, className }: UserAvatarProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center ring-1 ring-border/50",
        size === "sm" && "w-8 h-8 text-xs",
        size === "default" && "w-10 h-10 text-sm",
        size === "lg" && "w-16 h-16 text-lg",
        onClick && "cursor-pointer hover:ring-accent/50 transition-all",
        className
      )}
    >
      {getInitials(displayName)}
    </div>
  );
}
