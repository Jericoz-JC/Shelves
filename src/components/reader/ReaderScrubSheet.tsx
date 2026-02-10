import { MoveHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ReaderTimeline } from "@/components/reader/ReaderTimeline";
import type { ReadingTheme } from "@/lib/theme/readingThemes";

interface ReaderScrubSheetProps {
  theme: ReadingTheme;
  percentage: number;
  locationsReady: boolean;
  onScrub: (percentage: number) => void;
}

export function ReaderScrubSheet({
  theme,
  percentage,
  locationsReady,
  onScrub,
}: ReaderScrubSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="reading-surface-button h-10 w-10 rounded-full"
        >
          <MoveHorizontal className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="reading-surface border-b border-[color:var(--reading-border)] px-6 pb-6 pt-5"
        data-reading-theme={theme}
      >
        <SheetHeader className="p-0">
          <SheetTitle className="font-display text-xl tracking-tight">
            Scrub
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <ReaderTimeline
            percentage={percentage}
            markers={[]}
            onScrub={onScrub}
            disabled={!locationsReady}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
