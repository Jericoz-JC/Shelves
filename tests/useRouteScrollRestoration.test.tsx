import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouteScrollRestoration } from "@/hooks/useRouteScrollRestoration";

function HookHarness({ routeKey }: { routeKey: string }) {
  useRouteScrollRestoration(routeKey);
  return <div>route:{routeKey}</div>;
}

describe("useRouteScrollRestoration", () => {
  it("restores the previous scroll position when returning to a route", () => {
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    const originalScrollTo = window.scrollTo;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    let scrollY = 0;
    const scrollTo = vi.fn();

    try {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        get: () => scrollY,
      });

      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        writable: true,
        value: scrollTo,
      });

      Object.defineProperty(window, "requestAnimationFrame", {
        configurable: true,
        writable: true,
        value: (callback: FrameRequestCallback) => {
          callback(16);
          return 1;
        },
      });

      Object.defineProperty(window, "cancelAnimationFrame", {
        configurable: true,
        writable: true,
        value: vi.fn(),
      });

      const { rerender } = render(<HookHarness routeKey="/feed" />);
      expect(scrollTo).toHaveBeenLastCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      scrollY = 420;
      rerender(<HookHarness routeKey="/feed/likes" />);
      expect(scrollTo).toHaveBeenLastCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });

      scrollY = 110;
      rerender(<HookHarness routeKey="/feed" />);
      expect(scrollTo).toHaveBeenLastCalledWith({
        top: 420,
        left: 0,
        behavior: "auto",
      });
    } finally {
      if (originalScrollY) {
        Object.defineProperty(window, "scrollY", originalScrollY);
      } else {
        // @ts-expect-error cleanup for test global override
        delete window.scrollY;
      }

      Object.defineProperty(window, "scrollTo", {
        configurable: true,
        writable: true,
        value: originalScrollTo,
      });

      Object.defineProperty(window, "requestAnimationFrame", {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });

      Object.defineProperty(window, "cancelAnimationFrame", {
        configurable: true,
        writable: true,
        value: originalCancelAnimationFrame,
      });
    }
  });
});
