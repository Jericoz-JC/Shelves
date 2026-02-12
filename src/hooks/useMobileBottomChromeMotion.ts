import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseMobileBottomChromeMotionOptions {
  peekPx?: number;
  disabled?: boolean;
}

interface UseMobileBottomChromeMotionResult {
  navRef: RefObject<HTMLElement | null>;
  offsetPx: number;
  composeTranslatePx: number;
  anchorBottomPx: number;
  isHidden: boolean;
}

const DEFAULT_NAV_HEIGHT_PX = 60;
const VELOCITY_EMA_FACTOR = 0.25;
const IDLE_SETTLE_DELAY_MS = 90;

interface MotionProfile {
  tauSlowMs: number;
  tauFastMs: number;
  velocityRefPxPerMs: number;
  maxLagPx: number;
}

const TOUCH_MOTION_PROFILE: MotionProfile = {
  tauSlowMs: 110,
  tauFastMs: 45,
  velocityRefPxPerMs: 1.4,
  maxLagPx: 10,
};

const DESKTOP_MOTION_PROFILE: MotionProfile = {
  tauSlowMs: 150,
  tauFastMs: 65,
  velocityRefPxPerMs: 2.6,
  maxLagPx: 16,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeTrackedOffset(
  currentOffsetPx: number,
  deltaY: number,
  maxHidePx: number,
  currentScrollY: number
): number {
  if (currentScrollY <= 0) return 0;
  return clamp(currentOffsetPx + deltaY, 0, maxHidePx);
}

export function computeAdaptiveLerpFactor(
  velocityPxPerMs: number,
  deltaTimeMs: number,
  profile: MotionProfile
): number {
  const speedRatio = clamp(
    Math.abs(velocityPxPerMs) / profile.velocityRefPxPerMs,
    0,
    1
  );
  const tauMs =
    profile.tauSlowMs + (profile.tauFastMs - profile.tauSlowMs) * speedRatio;
  return 1 - Math.exp(-deltaTimeMs / Math.max(tauMs, 1));
}

export function computeViewportBottomAnchor(
  layoutViewportHeight: number,
  visualViewportHeight: number,
  visualViewportOffsetTop: number
): number {
  return Math.max(
    0,
    layoutViewportHeight - (visualViewportHeight + visualViewportOffsetTop)
  );
}

function useIsCoarsePointer(): boolean {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isCoarsePointer;
}

export function useMobileBottomChromeMotion(
  options: UseMobileBottomChromeMotionOptions = {}
): UseMobileBottomChromeMotionResult {
  const {
    peekPx = 0,
    disabled = false,
  } = options;

  const navRef = useRef<HTMLElement | null>(null);
  const [offsetPx, setOffsetPx] = useState(0);
  const [maxHidePx, setMaxHidePx] = useState(DEFAULT_NAV_HEIGHT_PX);
  const [anchorBottomPx, setAnchorBottomPx] = useState(0);

  const targetOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const prevScrollY = useRef(0);
  const prevScrollTs = useRef(0);
  const filteredVelocity = useRef(0);
  const lastInputTs = useRef(0);
  const ticking = useRef(false);
  const smoothingRaf = useRef<number | null>(null);
  const smoothingPrevTs = useRef(0);
  const measureRaf = useRef<number | null>(null);
  const isCoarsePointer = useIsCoarsePointer();
  const motionProfile = isCoarsePointer
    ? TOUCH_MOTION_PROFILE
    : DESKTOP_MOTION_PROFILE;

  const getMaxHidePx = useCallback(() => {
    const navHeight = navRef.current?.getBoundingClientRect().height ?? DEFAULT_NAV_HEIGHT_PX;
    return Math.max(0, navHeight - peekPx);
  }, [peekPx]);

  const commitOffset = useCallback(
    (nextOffsetPx: number) => {
      const clamped = clamp(nextOffsetPx, 0, maxHidePx);
      offsetRef.current = clamped;
      setOffsetPx((previous) => (Math.abs(previous - clamped) < 0.01 ? previous : clamped));
    },
    [maxHidePx]
  );

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const measure = () => {
      const nextMaxHidePx = getMaxHidePx();
      setMaxHidePx((current) =>
        Math.abs(current - nextMaxHidePx) < 0.01 ? current : nextMaxHidePx
      );
      targetOffsetRef.current = clamp(targetOffsetRef.current, 0, nextMaxHidePx);
      offsetRef.current = clamp(offsetRef.current, 0, nextMaxHidePx);
      setOffsetPx((previous) =>
        Math.abs(previous - offsetRef.current) < 0.01 ? previous : offsetRef.current
      );
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (measureRaf.current !== null) {
          cancelAnimationFrame(measureRaf.current);
        }
        measureRaf.current = requestAnimationFrame(() => {
          measure();
          measureRaf.current = null;
        });
      });
      observer.observe(navElement);
      return () => {
        observer.disconnect();
        if (measureRaf.current !== null) cancelAnimationFrame(measureRaf.current);
      };
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [getMaxHidePx]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    function readAnchorBottomPx(): number {
      if (typeof window === "undefined") return 0;
      const visualViewport = window.visualViewport;
      if (!visualViewport) return 0;

      const fromInnerHeight = computeViewportBottomAnchor(
        window.innerHeight,
        visualViewport.height,
        visualViewport.offsetTop
      );
      const docHeight = document.documentElement?.clientHeight ?? window.innerHeight;
      const fromDocumentHeight = computeViewportBottomAnchor(
        docHeight,
        visualViewport.height,
        visualViewport.offsetTop
      );
      return Math.max(fromInnerHeight, fromDocumentHeight);
    }

    let anchorRaf: number | null = null;
    const updateAnchor = () => {
      const nextAnchorBottomPx = readAnchorBottomPx();
      setAnchorBottomPx((current) =>
        Math.abs(current - nextAnchorBottomPx) < 0.5 ? current : nextAnchorBottomPx
      );
      anchorRaf = null;
    };

    const scheduleAnchorUpdate = () => {
      if (anchorRaf !== null) cancelAnimationFrame(anchorRaf);
      anchorRaf = requestAnimationFrame(updateAnchor);
    };

    scheduleAnchorUpdate();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener("resize", scheduleAnchorUpdate);
      visualViewport.addEventListener("scroll", scheduleAnchorUpdate);
    }
    window.addEventListener("resize", scheduleAnchorUpdate);
    window.addEventListener("orientationchange", scheduleAnchorUpdate);

    return () => {
      if (anchorRaf !== null) cancelAnimationFrame(anchorRaf);
      if (visualViewport) {
        visualViewport.removeEventListener("resize", scheduleAnchorUpdate);
        visualViewport.removeEventListener("scroll", scheduleAnchorUpdate);
      }
      window.removeEventListener("resize", scheduleAnchorUpdate);
      window.removeEventListener("orientationchange", scheduleAnchorUpdate);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      if (smoothingRaf.current !== null) {
        cancelAnimationFrame(smoothingRaf.current);
        smoothingRaf.current = null;
      }
      targetOffsetRef.current = 0;
      offsetRef.current = 0;
      filteredVelocity.current = 0;
      return;
    }

    const stopSmoothingLoop = () => {
      if (smoothingRaf.current === null) return;
      cancelAnimationFrame(smoothingRaf.current);
      smoothingRaf.current = null;
    };

    const startSmoothingLoop = () => {
      if (smoothingRaf.current !== null) return;

      smoothingPrevTs.current = performance.now();

      const animate = (now: number) => {
        const deltaTimeMs = Math.max(now - smoothingPrevTs.current, 1);
        smoothingPrevTs.current = now;

        const targetOffset = targetOffsetRef.current;
        const currentOffset = offsetRef.current;
        const alpha = computeAdaptiveLerpFactor(
          filteredVelocity.current,
          deltaTimeMs,
          motionProfile
        );
        let nextOffset = currentOffset + (targetOffset - currentOffset) * alpha;

        const lagPx = targetOffset - nextOffset;
        if (Math.abs(lagPx) > motionProfile.maxLagPx) {
          nextOffset = targetOffset - Math.sign(lagPx) * motionProfile.maxLagPx;
        }

        commitOffset(nextOffset);

        const settled = Math.abs(targetOffset - offsetRef.current) < 0.15;
        const idleForMs = now - lastInputTs.current;
        if (settled && idleForMs > IDLE_SETTLE_DELAY_MS) {
          smoothingRaf.current = null;
          return;
        }

        smoothingRaf.current = requestAnimationFrame(animate);
      };

      smoothingRaf.current = requestAnimationFrame(animate);
    };

    const updateFromScroll = () => {
      const currentY = window.scrollY;
      const deltaY = currentY - prevScrollY.current;
      const now = performance.now();
      const deltaTimeMs = Math.max(now - prevScrollTs.current, 1);
      const instantaneousVelocity = deltaY / deltaTimeMs;
      filteredVelocity.current =
        filteredVelocity.current * (1 - VELOCITY_EMA_FACTOR) +
        instantaneousVelocity * VELOCITY_EMA_FACTOR;

      prevScrollY.current = currentY;
      prevScrollTs.current = now;
      lastInputTs.current = now;
      targetOffsetRef.current = computeTrackedOffset(
        targetOffsetRef.current,
        deltaY,
        maxHidePx,
        currentY
      );
      startSmoothingLoop();
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(updateFromScroll);
    };

    prevScrollY.current = window.scrollY;
    prevScrollTs.current = performance.now();
    lastInputTs.current = prevScrollTs.current;

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      stopSmoothingLoop();
      ticking.current = false;
    };
  }, [commitOffset, disabled, maxHidePx, motionProfile]);

  const effectiveOffsetPx = disabled ? 0 : offsetPx;
  const effectiveAnchorBottomPx = disabled ? 0 : anchorBottomPx;

  return {
    navRef,
    offsetPx: effectiveOffsetPx,
    composeTranslatePx: effectiveOffsetPx,
    anchorBottomPx: effectiveAnchorBottomPx,
    isHidden: !disabled && maxHidePx > 0 && effectiveOffsetPx >= maxHidePx - 0.5,
  };
}
