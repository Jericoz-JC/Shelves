export const LEGACY_CURRENT_USER_ID = "me";

export function resolveCurrentUserId(userId: string | null | undefined): string {
  return userId ?? LEGACY_CURRENT_USER_ID;
}
