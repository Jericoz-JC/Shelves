import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireAuthenticatedUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity.subject;
}
