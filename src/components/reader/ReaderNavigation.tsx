import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReaderNavigationProps {
  onPrev: () => void;
  onNext: () => void;
}

export function ReaderNavigation({ onPrev, onNext }: ReaderNavigationProps) {
  return (
    <>
      {/* Slim edge strips: desktop hover affordance only. Tap navigation is
          handled inside the iframe (useReaderTapZones) so the reading surface
          stays free for text selection. */}
      <button
        onClick={onPrev}
        className="absolute left-0 top-0 w-12 h-full z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        aria-label="Previous page"
      >
        <div className="bg-background/60 backdrop-blur-sm rounded-full p-2 shadow-sm">
          <ChevronLeft className="h-5 w-5 text-foreground/60" />
        </div>
      </button>

      <button
        onClick={onNext}
        className="absolute right-0 top-0 w-12 h-full z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        aria-label="Next page"
      >
        <div className="bg-background/60 backdrop-blur-sm rounded-full p-2 shadow-sm">
          <ChevronRight className="h-5 w-5 text-foreground/60" />
        </div>
      </button>
    </>
  );
}
