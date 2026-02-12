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
          "flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <item.icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function SocialBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur md:hidden"
      aria-label="Mobile social navigation"
    >
      <div className="mx-auto grid max-w-xl grid-cols-6 items-end">
        {socialBottomPrimaryNav.slice(0, 2).map((item) => (
          <BottomNavItem key={item.id} item={item} />
        ))}

        <div className="flex justify-center" />

        {socialBottomPrimaryNav.slice(2).map((item) => (
          <BottomNavItem key={item.id} item={item} />
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label="More navigation items"
            >
              <Ellipsis className="h-5 w-5" />
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
