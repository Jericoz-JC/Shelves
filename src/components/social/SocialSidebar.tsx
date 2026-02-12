import { Link, NavLink } from "react-router-dom";
import { Feather, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  socialPrimaryNav,
  socialSecondaryNav,
  type SocialNavItem,
} from "./socialNav";
import { cn } from "@/lib/utils";

interface SocialSidebarProps {
  counts: Partial<Record<string, number>>;
  onComposeClick: () => void;
}

function SidebarItem({
  item,
  count,
}: {
  item: SocialNavItem;
  count?: number;
}) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors md:justify-center md:px-0 lg:justify-start lg:px-3",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
        )
      }
      aria-label={item.label}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      <span className="font-medium md:hidden lg:inline">{item.label}</span>
      {typeof count === "number" && (
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground md:hidden lg:inline-block">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export function SocialSidebar({ counts, onComposeClick }: SocialSidebarProps) {
  return (
    <nav
      className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen md:py-5 md:pr-2 lg:pr-4"
      aria-label="Social navigation"
    >
      <div className="flex h-full flex-col">
        <Link
          to="/feed"
          className="mb-6 flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
          aria-label="Shelves home"
        >
          <Feather className="h-6 w-6" />
        </Link>

        <div className="space-y-1">
          {socialPrimaryNav.map((item) => (
            <SidebarItem key={item.id} item={item} count={counts[item.id]} />
          ))}
        </div>

        <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
          {socialSecondaryNav.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </div>

        <Button
          onClick={onComposeClick}
          className="mt-5 h-11 rounded-full bg-accent text-accent-foreground font-semibold hover:bg-accent/90 md:px-0 lg:px-4"
          aria-label="Compose chronicle"
        >
          <PenSquare className="h-5 w-5 lg:hidden" />
          <span className="hidden lg:inline">Chronicle</span>
        </Button>
      </div>
    </nav>
  );
}
