import { type RefObject } from "react";
import { NavLink } from "react-router-dom";
import { Ellipsis } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  socialBottomMoreNav,
  socialBottomPrimaryNav,
  type SocialNavItem,
} from "./socialNav";

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
  navOffset?: number;
  navRef?: RefObject<HTMLElement | null>;
}

export function SocialBottomNav({ navOffset = 0, navRef }: SocialBottomNavProps) {
  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur will-change-transform md:hidden"
      aria-label="Mobile social navigation"
      style={{ transform: `translateY(${navOffset}px)` }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
        {socialBottomPrimaryNav.map((item) => (
          <BottomNavItem key={item.id} item={item} />
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="More navigation items"
            >
              <Ellipsis className="h-[22px] w-[22px]" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-6">
            <SheetHeader className="px-4">
              <SheetTitle>More</SheetTitle>
              <SheetDescription>Quick access to additional sections</SheetDescription>
            </SheetHeader>
            <div className="px-2">
              {socialBottomMoreNav.map((item) => (
                <SheetClose key={item.id} asChild>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
