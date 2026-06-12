import { useEffect, useRef } from "react";
import type { Rendition } from "epubjs";
import { iframeClickToViewportX, resolveTapZone } from "@/lib/reader/tapZones";

interface TapZoneHandlers {
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  /**
   * Called instead of the zone action when a tap lands while a text selection
   * or highlight toolbar is active. Returns true when the tap was consumed.
   */
  onInterceptTap?: () => boolean;
}

/**
 * Page navigation via taps on the book text itself.
 *
 * epub.js relays DOM click events from the section iframe to the rendition.
 * Handling taps there (instead of overlay buttons stacked above the iframe)
 * keeps the entire reading surface available for native text selection —
 * overlay zones swallow the pointer events selection needs.
 */
export function useReaderTapZones(
  rendition: Rendition | null,
  viewerRef: React.RefObject<HTMLDivElement | null>,
  handlers: TapZoneHandlers
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!rendition) return;

    const handleClick = (event: MouseEvent) => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      const iframe = viewer.querySelector("iframe");

      // A click that ends a drag-selection (or adjusts selection handles)
      // must never turn the page.
      const selection = iframe?.contentWindow?.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        return;
      }

      if (handlersRef.current.onInterceptTap?.()) return;

      const viewerRect = viewer.getBoundingClientRect();
      const iframeRect = iframe?.getBoundingClientRect();
      const viewportX = iframeRect
        ? iframeClickToViewportX(event.clientX, iframeRect.left)
        : viewerRect.left + event.clientX;

      const zone = resolveTapZone(viewportX - viewerRect.left, viewerRect.width);
      if (zone === "prev") handlersRef.current.onPrev();
      else if (zone === "next") handlersRef.current.onNext();
      else handlersRef.current.onToggle();
    };

    rendition.on("click", handleClick);
    return () => {
      rendition.off("click", handleClick);
    };
  }, [rendition, viewerRef]);
}
