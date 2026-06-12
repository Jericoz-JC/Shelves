export type TapZone = "prev" | "toggle" | "next";

const EDGE_ZONE_FRACTION = 0.3;

/**
 * Map a tap's x position (in outer viewport pixels, relative to the viewer's
 * left edge) to a reader action zone: left 30% = previous page, right 30% =
 * next page, middle 40% = toggle the reading chrome.
 */
export function resolveTapZone(visibleX: number, viewerWidth: number): TapZone {
  if (viewerWidth <= 0) return "toggle";
  const fraction = visibleX / viewerWidth;
  if (fraction < EDGE_ZONE_FRACTION) return "prev";
  if (fraction > 1 - EDGE_ZONE_FRACTION) return "next";
  return "toggle";
}

/**
 * Convert a click's clientX inside an epub.js section iframe to the outer
 * viewport x position. Paginated sections render as a wide multi-column strip,
 * so the iframe's bounding rect left edge is negative once the reader has
 * scrolled — adding clientX yields the on-screen position.
 */
export function iframeClickToViewportX(
  clientX: number,
  iframeRectLeft: number
): number {
  return iframeRectLeft + clientX;
}
