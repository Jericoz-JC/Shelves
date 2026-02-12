import { describe, expect, it } from "vitest";
import {
  clampToEndpoint,
  clamp,
  computeAdaptiveLerpFactor,
  computeTrackedOffset,
  computeViewportBottomAnchor,
  shouldUnlockFromHidden,
} from "@/hooks/useMobileBottomChromeMotion";

describe("useMobileBottomChromeMotion helpers", () => {
  it("clamps numeric values to bounds", () => {
    expect(clamp(-10, 0, 20)).toBe(0);
    expect(clamp(5, 0, 20)).toBe(5);
    expect(clamp(30, 0, 20)).toBe(20);
  });

  it("tracks offset one-to-one from scroll deltas", () => {
    expect(computeTrackedOffset(0, 12, 56, 140)).toBe(12);
    expect(computeTrackedOffset(12, 20, 56, 200)).toBe(32);
    expect(computeTrackedOffset(32, -10, 56, 180)).toBe(22);
  });

  it("clamps tracked offset to bounds and shows fully at top", () => {
    expect(computeTrackedOffset(40, 20, 56, 260)).toBe(56);
    expect(computeTrackedOffset(8, -20, 56, 120)).toBe(0);
    expect(computeTrackedOffset(30, 15, 56, 0)).toBe(0);
  });

  it("adapts smoothing factor based on velocity", () => {
    const profile = {
      tauSlowMs: 150,
      tauFastMs: 65,
      velocityRefPxPerMs: 2.6,
      maxLagPx: 16,
    };
    const deltaTimeMs = 16;
    const slowAlpha = computeAdaptiveLerpFactor(0.1, deltaTimeMs, profile);
    const fastAlpha = computeAdaptiveLerpFactor(3.0, deltaTimeMs, profile);

    expect(slowAlpha).toBeGreaterThan(0);
    expect(fastAlpha).toBeLessThanOrEqual(1);
    expect(fastAlpha).toBeGreaterThan(slowAlpha);
  });

  it("ignores tiny upward jitter while hidden, unlocks after deadzone", () => {
    expect(shouldUnlockFromHidden(-1, 2)).toBe(false);
    expect(shouldUnlockFromHidden(-2, 2)).toBe(true);
    expect(shouldUnlockFromHidden(-6, 2)).toBe(true);
  });

  it("clamps near-endpoint offsets to exact bounds", () => {
    expect(clampToEndpoint(55.7, 56, 0.5)).toBe(56);
    expect(clampToEndpoint(0.3, 56, 0.5)).toBe(0);
    expect(clampToEndpoint(20, 56, 0.5)).toBe(20);
  });

  it("computes browser-ui bottom anchor from layout and visual viewport", () => {
    expect(computeViewportBottomAnchor(800, 780, 0)).toBe(20);
    expect(computeViewportBottomAnchor(800, 760, 10)).toBe(30);
    expect(computeViewportBottomAnchor(800, 800, 0)).toBe(0);
    expect(computeViewportBottomAnchor(800, 820, 0)).toBe(0);
  });
});
