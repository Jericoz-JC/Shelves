import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialComposeButtonProps {
  onClick: () => void;
  translateYPx?: number;
  anchorBottomPx?: number;
}

export function SocialComposeButton({
  onClick,
  translateYPx = 0,
  anchorBottomPx = 0,
}: SocialComposeButtonProps) {
  return (
    <div
      className="fixed right-4 z-40 will-change-transform md:hidden"
      style={{
        bottom: `calc(5rem + ${anchorBottomPx}px)`,
        transform: `translate3d(0, ${translateYPx}px, 0)`,
      }}
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
