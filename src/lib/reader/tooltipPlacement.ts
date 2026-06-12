export interface TooltipPlacement {
  top: number;
  caret: "up" | "down";
}

const PILL_HEIGHT = 48;
const ANCHOR_GAP = 14;
const VIEWPORT_MARGIN = 16;
const TOP_SAFE_AREA = 60;

/**
 * Place the highlight pill below the selected text so it never fights the
 * native selection menu, which mobile browsers draw above the selection and
 * which cannot be suppressed. Flips above only when the selection sits too
 * close to the bottom of the viewport.
 */
export function computeTooltipPlacement(
  anchorTop: number,
  anchorBottom: number,
  viewportHeight: number
): TooltipPlacement {
  const below = anchorBottom + ANCHOR_GAP;
  if (below + PILL_HEIGHT <= viewportHeight - VIEWPORT_MARGIN) {
    return { top: below, caret: "up" };
  }
  return {
    top: Math.max(anchorTop - PILL_HEIGHT - ANCHOR_GAP + 6, TOP_SAFE_AREA),
    caret: "down",
  };
}
