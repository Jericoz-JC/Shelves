import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { clamp } from "@/lib/utils/math";

interface UseMobileBottomChromeMotionOptions {
  peekPx?: number;
  disabled?: boolean;
}

interface UseMobileBottomChromeMotionResult {
  navRef: RefObject<HTMLElement | null>;
  offsetPx: number;
  composeTranslatePx: number;
  anchorBottomPx: number;
  reservedBottomPx: number;
  isHidden: boolean;
}

const DEFAULT_NAV_HEIGHT_PX = 60;
const VELOCITY_EMA_FACTOR = 0.25;
const IDLE_SETTLE_DELAY_MS = 90;
const HIDDEN_UNLOCK_DEADZONE_PX = 2;
const ENDPOINT_EPSILON_PX = 0.5;
const KEYBOARD_SHRINK_THRESHOLD_PX = 120;

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

export function shouldUnlockFromHidden(deltaY: number, deadzonePx: number): boolean {
  return deltaY <= -Math.max(deadzonePx, 0);
}

export function clampToEndpoint(
  offsetPx: number,
  maxHidePx: number,
  epsilonPx: number
): number {
  if (maxHidePx <= 0) return 0;
  if (offsetPx >= maxHidePx - epsilonPx) return maxHidePx;
  if (offsetPx <= epsilonPx) return 0;
  return offsetPx;
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

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  const blockedTypes = new Set(["button", "submit", "checkbox", "radio", "file", "range"]);
  return !blockedTypes.has(element.type);
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
  const [reservedBottomPx, setReservedBottomPx] = useState(DEFAULT_NAV_HEIGHT_PX);

  const targetOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const hiddenLockedRef = useRef(false);
  const prevScrollY = useRef(0);
  const prevScrollTs = useRef(0);
  const filteredVelocity = useRef(0);
  const lastInputTs = useRef(0);
  const viewportBaselineHeight = useRef(0);
  const viewportOrientationKey = useRef("");
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
      const clamped = clampToEndpoint(
        clamp(nextOffsetPx, 0, maxHidePx),
        maxHidePx,
        ENDPOINT_EPSILON_PX
      );
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
      const navHeightPx =
        navRef.current?.getBoundingClientRect().height ?? DEFAULT_NAV_HEIGHT_PX;
      setMaxHidePx((current) =>
        Math.abs(current - nextMaxHidePx) < 0.01 ? current : nextMaxHidePx
      );
      setReservedBottomPx((current) =>
        Math.abs(current - navHeightPx) < 0.5 ? current : navHeightPx
      );
      targetOffsetRef.current = clampToEndpoint(
        clamp(targetOffsetRef.current, 0, nextMaxHidePx),
        nextMaxHidePx,
        ENDPOINT_EPSILON_PX
      );
      offsetRef.current = clampToEndpoint(
        clamp(offsetRef.current, 0, nextMaxHidePx),
        nextMaxHidePx,
        ENDPOINT_EPSILON_PX
      );
      hiddenLockedRef.current = offsetRef.current >= nextMaxHidePx - ENDPOINT_EPSILON_PX;
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

      const orientationKey = `${
        window.innerWidth >= window.innerHeight ? "landscape" : "portrait"
      }`;
      if (viewportOrientationKey.current !== orientationKey) {
        viewportOrientationKey.current = orientationKey;
        viewportBaselineHeight.current = visualViewport.height;
      }
      if (viewportBaselineHeight.current <= 0) {
        viewportBaselineHeight.current = visualViewport.height;
      }

      const focusedEditable = isEditableElement(document.activeElement);
      const viewportShrinkPx = Math.max(
        0,
        viewportBaselineHeight.current - visualViewport.height
      );
      const keyboardLike = focusedEditable && viewportShrinkPx >= KEYBOARD_SHRINK_THRESHOLD_PX;

      if (!keyboardLike) {
        viewportBaselineHeight.current = Math.max(
          viewportBaselineHeight.current,
          visualViewport.height
        );
        return 0;
      }

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
      hiddenLockedRef.current = false;
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

      if (currentY <= 0) {
        hiddenLockedRef.current = false;
        targetOffsetRef.current = 0;
      } else if (hiddenLockedRef.current) {
        if (shouldUnlockFromHidden(deltaY, HIDDEN_UNLOCK_DEADZONE_PX)) {
          hiddenLockedRef.current = false;
          targetOffsetRef.current = computeTrackedOffset(
            targetOffsetRef.current,
            deltaY,
            maxHidePx,
            currentY
          );
        } else {
          targetOffsetRef.current = maxHidePx;
        }
      } else {
        targetOffsetRef.current = computeTrackedOffset(
          targetOffsetRef.current,
          deltaY,
          maxHidePx,
          currentY
        );
      }

      targetOffsetRef.current = clampToEndpoint(
        targetOffsetRef.current,
        maxHidePx,
        ENDPOINT_EPSILON_PX
      );
      if (targetOffsetRef.current >= maxHidePx - ENDPOINT_EPSILON_PX) {
        targetOffsetRef.current = maxHidePx;
        hiddenLockedRef.current = true;
      } else if (targetOffsetRef.current <= ENDPOINT_EPSILON_PX) {
        targetOffsetRef.current = 0;
        hiddenLockedRef.current = false;
      }

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
  const effectiveReservedBottomPx = Math.max(
    DEFAULT_NAV_HEIGHT_PX,
    disabled ? DEFAULT_NAV_HEIGHT_PX : reservedBottomPx
  );

  return {
    navRef,
    offsetPx: effectiveOffsetPx,
    composeTranslatePx: effectiveOffsetPx,
    anchorBottomPx: effectiveAnchorBottomPx,
    reservedBottomPx: effectiveReservedBottomPx,
    isHidden: !disabled && maxHidePx > 0 && effectiveOffsetPx >= maxHidePx - 0.5,
  };
}
