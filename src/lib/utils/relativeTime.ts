const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const isFuture = diff < 0;
  const absoluteDiff = Math.abs(diff);

  const seconds = Math.floor(absoluteDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (isFuture) {
    if (seconds < 60) return "soon";
    if (minutes < 60) return `in ${minutes}m`;
    if (hours < 24) return `in ${hours}h`;
    if (days < 7) return `in ${days}d`;

    const date = new Date(timestamp);
    return `on ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  }

  if (seconds < 60) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
