import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseScrollDirectionResult {
  offset: number;
  navRef: RefObject<HTMLElement | null>;
}

export function useScrollDirection(): UseScrollDirectionResult {
  const navRef = useRef<HTMLElement | null>(null);
  const offsetRef = useRef(0);
  const prevScrollY = useRef(0);
  const ticking = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapRaf = useRef<number | null>(null);

  // We store a setter callback so we can force re-render only when offset changes meaningfully
  const forceUpdate = useForceUpdate();

  const getNavHeight = useCallback(() => {
    if (!navRef.current) return 60; // sensible default
    return navRef.current.getBoundingClientRect().height;
  }, []);

  useEffect(() => {
    function snapToNearest() {
      const navHeight = getNavHeight();
      const current = offsetRef.current;
      if (current <= 0 || current >= navHeight) return;

      const target = current < navHeight / 2 ? 0 : navHeight;
      const startOffset = current;
      const startTime = performance.now();
      const duration = 150;

      function animate(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // ease-out quad
        const eased = t * (2 - t);
        offsetRef.current = startOffset + (target - startOffset) * eased;
        forceUpdate();

        if (t < 1) {
          snapRaf.current = requestAnimationFrame(animate);
        } else {
          offsetRef.current = target;
          forceUpdate();
          snapRaf.current = null;
        }
      }

      if (snapRaf.current !== null) {
        cancelAnimationFrame(snapRaf.current);
      }
      snapRaf.current = requestAnimationFrame(animate);
    }

    function scheduleSnap() {
      if (idleTimer.current !== null) {
        clearTimeout(idleTimer.current);
      }
      idleTimer.current = setTimeout(() => {
        snapToNearest();
        idleTimer.current = null;
      }, 100);
    }

    function update() {
      const currentY = window.scrollY;
      const delta = currentY - prevScrollY.current;
      prevScrollY.current = currentY;

      // Cancel any ongoing snap when user scrolls again
      if (snapRaf.current !== null) {
        cancelAnimationFrame(snapRaf.current);
        snapRaf.current = null;
      }

      if (currentY <= 0) {
        offsetRef.current = 0;
      } else {
        const navHeight = getNavHeight();
        offsetRef.current = Math.min(Math.max(offsetRef.current + delta, 0), navHeight);
      }

      forceUpdate();
      scheduleSnap();
      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    }

    prevScrollY.current = window.scrollY;

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
      if (snapRaf.current !== null) cancelAnimationFrame(snapRaf.current);
    };
  }, [getNavHeight, forceUpdate]);

  return { offset: offsetRef.current, navRef };
}

/** Minimal force-update hook that returns a stable callback */
function useForceUpdate(): () => void {
  const ref = useRef(0);
  const [, setState] = useState(0);
  return useCallback(() => {
    ref.current += 1;
    setState(ref.current);
  }, []);
}
