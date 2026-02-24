import { useMemo } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const EMPTY_FOLLOWING_IDS: string[] = [];

const followsApi = (api as unknown as { follows: Record<string, unknown> }).follows as {
  follow: unknown;
  unfollow: unknown;
  listFollowing: unknown;
};

export function useConvexFollows() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { openSignIn } = useClerk();

  const followMutation = useMutation(followsApi.follow as never);
  const unfollowMutation = useMutation(followsApi.unfollow as never);
  const followingIds =
    ((useQuery(
      followsApi.listFollowing as never,
      isAuthenticated ? {} : "skip"
    ) as string[] | undefined) ?? EMPTY_FOLLOWING_IDS);

  const followedIds = useMemo(() => new Set(followingIds), [followingIds]);

  const ensureAuthenticated = (): boolean => {
    if (isAuthenticated) return true;
    if (!isLoading) void openSignIn();
    return false;
  };

  const toggleFollow = (followeeId: string) => {
    if (!ensureAuthenticated()) return;

    if (followedIds.has(followeeId)) {
      void unfollowMutation({ followeeId }).catch((err) => {
        console.error("[useConvexFollows] Failed to unfollow user:", err);
      });
      return;
    }

    void followMutation({ followeeId }).catch((err) => {
      console.error("[useConvexFollows] Failed to follow user:", err);
    });
  };

  return {
    followedIds,
    toggleFollow,
  };
}
