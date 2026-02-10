import { Progress } from "@/components/ui/progress";

interface ReaderProgressProps {
  percentage: number;
}

export function ReaderProgress({ percentage }: ReaderProgressProps) {
  const safePercentage = Number.isFinite(percentage) ? percentage : 0;
  const displayPercent = Math.round(safePercentage * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Progress value={displayPercent} className="reading-progress h-1 flex-1" />
      <span className="text-xs tabular-nums text-[color:var(--reading-text)] opacity-60 min-w-[3ch] text-right">
        {displayPercent}%
      </span>
    </div>
  );
}
