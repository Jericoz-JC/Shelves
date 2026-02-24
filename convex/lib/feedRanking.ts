export interface RankableChronicle {
  _id: string;
  authorId: string;
  createdAt: number;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  bookRef?: string;
}

export function clampFeedLimit(limit: number | undefined, defaultValue: number, maxValue: number): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) return defaultValue;
  return Math.max(1, Math.min(limit, maxValue));
}

export function computeChronicleEngagementScore(chronicle: RankableChronicle): number {
  return (
    0.5 * chronicle.likeCount +
    13.5 * chronicle.replyCount +
    1.0 * chronicle.repostCount
  );
}

export function computeChronicleTimeDecay(createdAt: number, nowBucketMs: number): number {
  const hoursOld = Math.max(0, (nowBucketMs - createdAt) / 3_600_000);
  return Math.max(0.5, 2 ** (-hoursOld / 12));
}

export function computeBaseChronicleScore(
  chronicle: RankableChronicle,
  nowBucketMs: number
): number {
  const engagement = computeChronicleEngagementScore(chronicle);
  const timeDecay = computeChronicleTimeDecay(chronicle.createdAt, nowBucketMs);
  const bookBonus = chronicle.bookRef ? 1.3 : 1.0;
  return engagement * timeDecay * bookBonus;
}

function compareChroniclesByTimeAndId(a: RankableChronicle, b: RankableChronicle): number {
  if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
  return b._id.localeCompare(a._id);
}

export function rankForYouChronicles<T extends RankableChronicle>(
  candidates: T[],
  limit: number,
  nowBucketMs: number
): T[] {
  const sortedByBase = [...candidates].sort((a, b) => {
    const baseDiff =
      computeBaseChronicleScore(b, nowBucketMs) - computeBaseChronicleScore(a, nowBucketMs);
    if (baseDiff !== 0) return baseDiff;
    return compareChroniclesByTimeAndId(a, b);
  });

  const priorByAuthor = new Map<string, number>();
  const withDiversity = sortedByBase.map((chronicle) => {
    const priorPosts = priorByAuthor.get(chronicle.authorId) ?? 0;
    const authorDiversity = 1 / (1 + priorPosts);
    priorByAuthor.set(chronicle.authorId, priorPosts + 1);
    return {
      chronicle,
      score: computeBaseChronicleScore(chronicle, nowBucketMs) * authorDiversity,
    };
  });

  withDiversity.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareChroniclesByTimeAndId(a.chronicle, b.chronicle);
  });

  return withDiversity.slice(0, limit).map(({ chronicle }) => chronicle);
}
