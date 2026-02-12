import { type RefObject } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { socialBottomPrimaryNav, type SocialNavItem } from "./socialNav";

function BottomNavItem({ item }: { item: SocialNavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <item.icon className="h-[22px] w-[22px]" />
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SocialBottomNavProps {
  translateYPx?: number;
  anchorBottomPx?: number;
  navRef?: RefObject<HTMLElement | null>;
}

export function SocialBottomNav({
  translateYPx = 0,
  anchorBottomPx = 0,
  navRef,
}: SocialBottomNavProps) {
  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 z-30 border-t border-border bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur will-change-transform md:hidden"
      aria-label="Mobile social navigation"
      style={{
        bottom: `${anchorBottomPx}px`,
        transform: `translate3d(0, ${translateYPx}px, 0)`,
      }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
        {socialBottomPrimaryNav.map((item) => (
          <BottomNavItem key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}
