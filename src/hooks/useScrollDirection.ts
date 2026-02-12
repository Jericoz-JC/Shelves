import { useEffect, useRef, useState } from "react";

interface UseScrollDirectionOptions {
  threshold?: number;
}

export function useScrollDirection({ threshold = 10 }: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function update() {
      const currentY = window.scrollY;

      if (currentY <= 0) {
        setIsVisible(true);
      } else if (Math.abs(currentY - lastScrollY.current) >= threshold) {
        setIsVisible(currentY < lastScrollY.current);
        lastScrollY.current = currentY;
      }

      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isVisible;
}
