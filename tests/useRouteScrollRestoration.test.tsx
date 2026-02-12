import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouteScrollRestoration } from "@/hooks/useRouteScrollRestoration";

function HookHarness({ routeKey }: { routeKey: string }) {
  useRouteScrollRestoration(routeKey);
  return <div>route:{routeKey}</div>;
}

describe("useRouteScrollRestoration", () => {
  it("restores the previous scroll position when returning to a route", () => {
    let scrollY = 0;
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => scrollY,
    });

    const scrollTo = vi.fn();
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
  });
});
