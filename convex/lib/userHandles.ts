const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 24;

function collapseUnderscores(value: string): string {
  return value.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizeHandleInput(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function sanitizeHandleCandidate(value: string): string {
  const normalized = normalizeHandleInput(value);
  const replaced = normalized.replace(/[^a-z0-9_]/g, "_");
  const collapsed = collapseUnderscores(replaced);
  return collapsed.slice(0, HANDLE_MAX_LENGTH);
}

export function isValidHandle(handle: string): boolean {
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    return false;
  }
  return /^[a-z0-9_]+$/.test(handle);
}

export function deriveHandleSeed(params: {
  name?: string;
  email?: string;
  clerkId: string;
}): string {
  const emailLocal = params.email?.split("@")[0];
  const fallback = params.clerkId.replace(/^user_/, "");
  const base = params.name ?? emailLocal ?? fallback;
  const sanitized = sanitizeHandleCandidate(base);
  if (sanitized.length >= HANDLE_MIN_LENGTH) return sanitized;
  const expanded = sanitizeHandleCandidate(`${sanitized || "reader"}_${fallback}`);
  return expanded.slice(0, HANDLE_MAX_LENGTH);
}

export function buildHandleCandidates(seed: string, maxVariants = 25): string[] {
  const sanitizedSeed = sanitizeHandleCandidate(seed);
  const safeSeed = isValidHandle(sanitizedSeed) ? sanitizedSeed : "reader";
  const candidates = [safeSeed];
  for (let i = 2; i <= maxVariants; i += 1) {
    const suffix = `_${i}`;
    const baseLength = Math.max(1, HANDLE_MAX_LENGTH - suffix.length);
    const base = safeSeed.slice(0, baseLength).replace(/_+$/g, "") || "reader";
    const next = `${base}${suffix}`;
    if (isValidHandle(next)) {
      candidates.push(next);
    }
  }
  return candidates;
}

export function buildUserSearchText(params: {
  name?: string;
  handle?: string;
}): string {
  const parts = [params.name, params.handle]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim().toLowerCase());
  return parts.join(" ");
}

export { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH };
