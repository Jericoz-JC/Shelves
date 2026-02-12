import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialComposeButtonProps {
  onClick: () => void;
  navOffset?: number;
}

export function SocialComposeButton({ onClick, navOffset = 0 }: SocialComposeButtonProps) {
  return (
    <div
      className="fixed bottom-20 right-4 z-40 will-change-transform md:hidden"
      style={{ transform: `translateY(${navOffset}px)` }}
    >
      <Button
        type="button"
        onClick={onClick}
        size="icon-lg"
        className="rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90"
        aria-label="Compose chronicle"
      >
        <PenSquare className="h-5 w-5" />
      </Button>
    </div>
  );
}
