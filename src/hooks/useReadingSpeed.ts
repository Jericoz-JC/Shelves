import { useEffect, useRef, useState } from "react";
import type { Rendition } from "epubjs";

interface SpeedSample {
  time: number;
  percentage: number;
}

const SPEED_WINDOW_MS = 10 * 60 * 1000;

export function useReadingSpeed(rendition: Rendition | null) {
  const [speed, setSpeed] = useState<number | null>(null);
  const samplesRef = useRef<SpeedSample[]>([]);

  useEffect(() => {
    if (!rendition) return;

    const onRelocated = (location: { start: { percentage: number } }) => {
      const percentage = location.start.percentage;
      if (!Number.isFinite(percentage)) return;

      const now = Date.now();
      const samples = samplesRef.current;
      samples.push({ time: now, percentage });

      const cutoff = now - SPEED_WINDOW_MS;
      while (samples.length > 0 && samples[0].time < cutoff) {
        samples.shift();
      }

      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const deltaPercent = last.percentage - first.percentage;
        const deltaMinutes = (last.time - first.time) / 60000;
        if (deltaMinutes > 0 && deltaPercent > 0) {
          setSpeed(deltaPercent / deltaMinutes);
        } else {
          setSpeed(null);
        }
      }
    };

    rendition.on("relocated", onRelocated);
    return () => {
      rendition.off("relocated", onRelocated);
      samplesRef.current = [];
    };
  }, [rendition]);

  return speed;
}
