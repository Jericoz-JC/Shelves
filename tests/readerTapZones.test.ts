import { describe, expect, it } from "vitest";
import { iframeClickToViewportX, resolveTapZone } from "@/lib/reader/tapZones";
import { computeTooltipPlacement } from "@/lib/reader/tooltipPlacement";

describe("resolveTapZone", () => {
  it("maps the left 30% to previous page", () => {
    expect(resolveTapZone(0, 1000)).toBe("prev");
    expect(resolveTapZone(299, 1000)).toBe("prev");
  });

  it("maps the middle 40% to chrome toggle", () => {
    expect(resolveTapZone(300, 1000)).toBe("toggle");
    expect(resolveTapZone(500, 1000)).toBe("toggle");
    expect(resolveTapZone(700, 1000)).toBe("toggle");
  });

  it("maps the right 30% to next page", () => {
    expect(resolveTapZone(701, 1000)).toBe("next");
    expect(resolveTapZone(999, 1000)).toBe("next");
  });

  it("falls back to toggle for a degenerate viewer width", () => {
    expect(resolveTapZone(100, 0)).toBe("toggle");
  });
});

describe("iframeClickToViewportX", () => {
  it("offsets click x by the iframe strip position", () => {
    // Page 3 of a paginated strip: iframe rect.left is -2 page widths.
    expect(iframeClickToViewportX(850, -800)).toBe(50);
    expect(iframeClickToViewportX(120, 0)).toBe(120);
  });
});

describe("computeTooltipPlacement", () => {
  it("places the pill below the selection when there is room", () => {
    const placement = computeTooltipPlacement(200, 220, 800);
    expect(placement.caret).toBe("up");
    expect(placement.top).toBeGreaterThan(220);
  });

  it("flips above the selection near the viewport bottom", () => {
    const placement = computeTooltipPlacement(740, 760, 800);
    expect(placement.caret).toBe("down");
    expect(placement.top).toBeLessThan(740);
  });

  it("never crosses the top safe area when flipped", () => {
    const placement = computeTooltipPlacement(10, 790, 800);
    expect(placement.top).toBeGreaterThanOrEqual(60);
  });
});
