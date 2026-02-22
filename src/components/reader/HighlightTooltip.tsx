import type { HighlightColor, ToolbarState, DeleteTarget } from "@/hooks/useHighlights";

const COLORS: { key: HighlightColor; bg: string; ring: string }[] = [
  { key: "yellow", bg: "bg-yellow-300", ring: "ring-yellow-400" },
  { key: "blue", bg: "bg-blue-400", ring: "ring-blue-500" },
  { key: "green", bg: "bg-green-400", ring: "ring-green-500" },
  { key: "pink", bg: "bg-pink-400", ring: "ring-pink-500" },
];

interface HighlightTooltipProps {
  toolbarState: ToolbarState;
  deleteTarget: DeleteTarget | null;
  onSelectColor: (color: HighlightColor) => void;
  onDelete: () => void;
  onDismiss: () => void;
  onShare: () => void;
}

export function HighlightTooltip({
  toolbarState,
  deleteTarget,
  onSelectColor,
  onDelete,
  onDismiss,
  onShare,
}: HighlightTooltipProps) {
  const isDeleteMode = deleteTarget !== null;
  const rawX = isDeleteMode ? deleteTarget.x : toolbarState.x;
  const rawY = isDeleteMode ? deleteTarget.y : toolbarState.y;

  // Clamp so the pill never goes off-screen
  const top = Math.max(rawY - 56, 60);
  const left = Math.min(Math.max(rawX, 80), window.innerWidth - 80);

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{ top, left, transform: "translateX(-50%)" }}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pill */}
      <div className="flex items-center gap-1 bg-neutral-900/95 rounded-full px-3 py-2 shadow-2xl backdrop-blur-sm ring-1 ring-white/10">
        {isDeleteMode ? (
          <>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full text-red-400 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onDelete}
              aria-label="Delete highlight"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/50 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        ) : (
          <>
            {COLORS.map(({ key, bg, ring }) => (
              <button
                key={key}
                className={`w-7 h-7 rounded-full ${bg} ring-2 ${ring} ring-offset-1 ring-offset-neutral-900 hover:scale-110 active:scale-95 transition-transform`}
                onClick={() => onSelectColor(key)}
                aria-label={`Highlight ${key}`}
              />
            ))}
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onShare}
              aria-label="Share to Chronicles"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/50 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Down-pointing caret */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0"
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid rgba(23,23,23,0.95)",
        }}
      />
    </div>
  );
}
