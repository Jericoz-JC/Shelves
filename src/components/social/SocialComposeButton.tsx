import { PenSquare } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

interface SocialComposeButtonProps {
  onClick: () => void;
  navVisible?: boolean;
}

export function SocialComposeButton({ onClick, navVisible = true }: SocialComposeButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed bottom-20 right-4 z-40 md:hidden"
      animate={{ y: navVisible ? 0 : 60 }}
      transition={{
        type: "tween",
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: [0.25, 0.1, 0.25, 1],
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
    </motion.div>
  );
}
