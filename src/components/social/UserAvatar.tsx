import { cn } from "@/lib/utils";
import type { AriaAttributes } from "react";

interface UserAvatarProps extends AriaAttributes {
  displayName: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  displayName,
  size = "default",
  onClick,
  className,
  "aria-label": ariaLabel,
  ...ariaProps
}: UserAvatarProps) {
  const avatarClasses = cn(
    "shrink-0 rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center ring-1 ring-border/50",
    size === "sm" && "w-8 h-8 text-xs",
    size === "default" && "w-10 h-10 text-sm",
    size === "lg" && "w-16 h-16 text-lg",
    onClick && "cursor-pointer hover:ring-accent/50 transition-all",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || `Open ${displayName} profile`}
        {...ariaProps}
        className={avatarClasses}
      >
        {getInitials(displayName)}
      </button>
    );
  }

  return (
    <div
      {...ariaProps}
      className={avatarClasses}
    >
      {getInitials(displayName)}
    </div>
  );
}
