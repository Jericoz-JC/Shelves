import { Progress } from "@/components/ui/progress";

interface ReaderProgressProps {
  percentage: number;
  chapterTitle?: string | null;
  chapterIndex?: number;
  totalChapters?: number;
  chaptersRemaining?: number;
  chapterProgress?: number | null;
  etaMinutes?: number | null;
}

export function ReaderProgress({
  percentage,
  chapterTitle,
  chapterIndex,
  totalChapters,
  chaptersRemaining,
  chapterProgress,
  etaMinutes,
}: ReaderProgressProps) {
  const safePercentage = Number.isFinite(percentage) ? percentage : 0;
  const displayPercent = Math.round(safePercentage * 100);
  const displayChapter =
    typeof chapterIndex === "number" && totalChapters
      ? `Chapter ${chapterIndex + 1} / ${totalChapters}`
      : "Chapter —";
  const displayEta =
    typeof etaMinutes === "number" && Number.isFinite(etaMinutes)
      ? `~${Math.max(1, Math.round(etaMinutes))} min`
      : "—";

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            Now reading
          </p>
          <p className="font-display text-base text-[color:var(--reading-text)]">
            {chapterTitle ?? "Untitled chapter"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            Remaining
          </p>
          <p className="text-sm text-[color:var(--reading-text)]">
            {chaptersRemaining ?? 0} chapters
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Progress value={displayPercent} className="reading-progress h-1 flex-1" />
        <span className="text-xs tabular-nums text-[color:var(--reading-text)] opacity-60 min-w-[3ch] text-right">
          {displayPercent}%
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{displayChapter}</span>
        <span>{displayEta} left</span>
      </div>

      {chapterProgress != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Chapter progress</span>
            <span>{Math.round(chapterProgress * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[color:var(--reading-border)]">
            <div
              className="h-1.5 rounded-full bg-[color:var(--reading-accent)]"
              style={{ width: `${Math.round(chapterProgress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
