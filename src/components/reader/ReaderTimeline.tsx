import { useRef, useState } from "react";

interface TimelineMarker {
  id: string;
  percentage: number;
  title?: string;
}

interface ReaderTimelineProps {
  percentage: number;
  markers: TimelineMarker[];
  onScrub: (percentage: number) => void;
  disabled?: boolean;
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function ReaderTimeline({
  percentage,
  markers,
  onScrub,
  disabled = false,
}: ReaderTimelineProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const scrubToEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percent = clamp((event.clientX - rect.left) / rect.width);
    onScrub(percent);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    scrubToEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !dragging) return;
    scrubToEvent(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setDragging(false);
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  };

  const safePercentage = Number.isFinite(percentage) ? percentage : 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        ref={barRef}
        className={`relative h-3 w-full rounded-full reading-progress ${
          disabled ? "opacity-50" : "cursor-pointer"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-l-full rounded-r-sm bg-[color:var(--reading-accent)]"
          style={{ width: `${safePercentage * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--reading-accent)] shadow-sm"
          style={{ left: `${safePercentage * 100}%` }}
        />
        {markers.map((marker) => (
          <div
            key={marker.id}
            title={marker.title}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--reading-text)]/60"
            style={{ left: `${marker.percentage * 100}%` }}
          />
        ))}
      </div>
      {disabled && (
        <p className="mt-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          Indexing locations…
        </p>
      )}
    </div>
  );
}
