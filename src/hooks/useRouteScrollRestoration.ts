import { useEffect, useRef } from "react";

export function useRouteScrollRestoration(routeKey: string) {
  const positionsRef = useRef<Record<string, number>>({});
  const previousRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const positions = positionsRef.current;

    const previousRoute = previousRouteRef.current;
    if (previousRoute) {
      positions[previousRoute] = window.scrollY;
    }

    const targetTop = positions[routeKey] ?? 0;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
    });

    previousRouteRef.current = routeKey;

    return () => {
      window.cancelAnimationFrame(frame);
      positions[routeKey] = window.scrollY;
    };
  }, [routeKey]);
}
