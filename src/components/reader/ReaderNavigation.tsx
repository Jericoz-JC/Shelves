import type { MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReaderNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  onAddNote?: (side: "left" | "right") => void;
}

const EDGE_NOTE_PX = 24;

export function ReaderNavigation({ onPrev, onNext, onAddNote }: ReaderNavigationProps) {
  const handlePrevClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (onAddNote) {
      const rect = event.currentTarget.getBoundingClientRect();
      const offset = event.clientX - rect.left;
      if (offset <= EDGE_NOTE_PX) {
        onAddNote("left");
        return;
      }
    }
    onPrev();
  };

  const handleNextClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (onAddNote) {
      const rect = event.currentTarget.getBoundingClientRect();
      const offset = rect.right - event.clientX;
      if (offset <= EDGE_NOTE_PX) {
        onAddNote("right");
        return;
      }
    }
    onNext();
  };

  return (
    <>
      {/* Left tap zone */}
      <button
        onClick={handlePrevClick}
        className="absolute left-0 top-0 w-[15%] h-full z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        aria-label="Previous page"
      >
        <div className="bg-background/60 backdrop-blur-sm rounded-full p-2 shadow-sm">
          <ChevronLeft className="h-5 w-5 text-foreground/60" />
        </div>
      </button>

      {/* Right tap zone */}
      <button
        onClick={handleNextClick}
        className="absolute right-0 top-0 w-[15%] h-full z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        aria-label="Next page"
      >
        <div className="bg-background/60 backdrop-blur-sm rounded-full p-2 shadow-sm">
          <ChevronRight className="h-5 w-5 text-foreground/60" />
        </div>
      </button>
    </>
  );
}
