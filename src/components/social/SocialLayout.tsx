import type { ReactNode, RefObject } from "react";
import { SocialBottomNav } from "./SocialBottomNav";
import { SocialSidebar } from "./SocialSidebar";

interface SocialLayoutProps {
  children: ReactNode;
  rightRail?: ReactNode;
  navCounts: Partial<Record<string, number>>;
  onComposeClick: () => void;
  navTranslateYPx?: number;
  navAnchorBottomPx?: number;
  navRef?: RefObject<HTMLElement | null>;
}

export function SocialLayout({
  children,
  rightRail,
  navCounts,
  onComposeClick,
  navTranslateYPx,
  navAnchorBottomPx,
  navRef,
}: SocialLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 px-3 md:grid-cols-[72px_minmax(0,1fr)] md:gap-2 md:px-4 lg:grid-cols-[250px_minmax(0,680px)] xl:grid-cols-[250px_minmax(0,680px)_320px]">
        <SocialSidebar counts={navCounts} onComposeClick={onComposeClick} />

        <main className="min-w-0 border-x border-border/60 bg-background pb-24 lg:pb-8">
          {children}
        </main>

        {rightRail}
      </div>

      <SocialBottomNav
        translateYPx={navTranslateYPx}
        anchorBottomPx={navAnchorBottomPx}
        navRef={navRef}
      />
    </div>
  );
}
