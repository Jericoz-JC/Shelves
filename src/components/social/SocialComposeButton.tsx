import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialComposeButtonProps {
  onClick: () => void;
}

export function SocialComposeButton({ onClick }: SocialComposeButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      size="icon-lg"
      className="fixed bottom-20 right-4 z-40 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 md:hidden"
      aria-label="Compose chronicle"
    >
      <PenSquare className="h-5 w-5" />
    </Button>
  );
}
