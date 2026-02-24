import { useCallback, useMemo } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const EMPTY_FOLLOWING_IDS: string[] = [];

export function useConvexFollows() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { openSignIn } = useClerk();

  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const followingIds = useQuery(
    api.follows.listFollowing,
    isAuthenticated ? { limit: 500 } : "skip"
  ) ?? EMPTY_FOLLOWING_IDS;

  const followedIds = useMemo(() => new Set(followingIds), [followingIds]);

  const ensureAuthenticated = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (!isLoading) void openSignIn();
    return false;
  }, [isAuthenticated, isLoading, openSignIn]);

  const toggleFollow = useCallback((followeeId: string) => {
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
  }, [ensureAuthenticated, followedIds, followMutation, unfollowMutation]);

  return {
    followedIds,
    toggleFollow,
  };
}
