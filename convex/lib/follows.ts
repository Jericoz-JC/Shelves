export function isSelfFollow(followerId: string, followeeId: string): boolean {
  return followerId === followeeId;
}

export function dedupeFolloweeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
