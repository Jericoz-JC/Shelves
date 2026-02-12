const now = Date.now();

export function hoursAgo(hours: number): number {
  return now - hours * 60 * 60 * 1000;
}

export function minutesAgo(minutes: number): number {
  return now - minutes * 60 * 1000;
}
