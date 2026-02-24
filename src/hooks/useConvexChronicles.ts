import { useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";
import type { ChronicleDocLike } from "@/lib/social/mapChronicles";
import {
  enrichFeedChronicle,
  mapReplyDocs,
  mergeReplyMaps,
  type AuthorRecord,
  type ReactionState,
  type ReplyDocLike,
} from "@/lib/social/feedTransforms";
import { resolveCurrentUserId } from "@/lib/social/identity";

export type FeedType =
  | "forYou"
  | "following"
  | "author"
  | "bookmarks"
  | "likes"
  | "reposts";

interface UseConvexChroniclesOptions {
  authorId?: string | null;
}

const FEED_LIMIT = 50;
const RANKING_REFRESH_MS = 60_000;
const EMPTY_CHRONICLES: ChronicleDocLike[] = [];
const EMPTY_AUTHORS: AuthorRecord[] = [];

export function useConvexChronicles(
  feedType: FeedType = "forYou",
  options?: UseConvexChroniclesOptions
): ChroniclesHook {
  const { userId } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { openSignIn } = useClerk();
  const currentUserId = resolveCurrentUserId(userId);

  const [localReplies, setLocalReplies] = useState<Record<string, Reply[]>>({});
  const [nowBucketMs, setNowBucketMs] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowBucketMs(Math.floor(Date.now() / 60_000) * 60_000);
    }, RANKING_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, []);

  const forYouChronicles = useQuery(
    api.chronicles.listForYou,
    feedType === "forYou" ? { limit: FEED_LIMIT, nowBucketMs } : "skip"
  );
  const followingChronicles = useQuery(
    api.chronicles.listFollowing,
    feedType === "following" && isAuthenticated ? { limit: FEED_LIMIT } : "skip"
  );
  const authorChronicles = useQuery(
    api.chronicles.listByAuthor,
    feedType === "author" && options?.authorId ? { authorId: options.authorId, limit: FEED_LIMIT } : "skip"
  );
  const bookmarkedChronicles = useQuery(
    api.chronicles.listBookmarked,
    feedType === "bookmarks" && isAuthenticated ? { limit: FEED_LIMIT } : "skip"
  );
  const likedChronicles = useQuery(
    api.chronicles.listLiked,
    feedType === "likes" && isAuthenticated ? { limit: FEED_LIMIT } : "skip"
  );
  const repostedChronicles = useQuery(
    api.chronicles.listReposted,
    feedType === "reposts" && isAuthenticated ? { limit: FEED_LIMIT } : "skip"
  );

  const rawChroniclesResult = useMemo(() => {
    if (feedType === "following") return followingChronicles;
    if (feedType === "author") return authorChronicles;
    if (feedType === "bookmarks") return bookmarkedChronicles;
    if (feedType === "likes") return likedChronicles;
    if (feedType === "reposts") return repostedChronicles;
    return forYouChronicles;
  }, [
    authorChronicles,
    bookmarkedChronicles,
    feedType,
    followingChronicles,
    forYouChronicles,
    likedChronicles,
    repostedChronicles,
  ]) as ChronicleDocLike[] | undefined;
  const rawChronicles = rawChroniclesResult ?? EMPTY_CHRONICLES;

  const chronicleIds = useMemo(
    () => rawChronicles.map((chronicle) => chronicle._id as Id<"chronicles">),
    [rawChronicles]
  );

  const reactionStates = useQuery(
    api.chronicles.userReactionStates,
    chronicleIds.length > 0 && isAuthenticated ? { chronicleIds } : "skip"
  ) as Record<string, ReactionState> | undefined;

  const authorIds = useMemo(
    () => [...new Set(rawChronicles.map((chronicle) => chronicle.authorId))],
    [rawChronicles]
  );

  const authorsResult = useQuery(
    api.users.getBatch,
    authorIds.length > 0 ? { clerkIds: authorIds } : "skip"
  ) as AuthorRecord[] | undefined;
  const authors = authorsResult ?? EMPTY_AUTHORS;

  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip") as
    | (AuthorRecord & { handle?: string })
    | null
    | undefined;

  const replyDocMap = useQuery(
    api.chronicles.listRepliesBatch,
    chronicleIds.length > 0
      ? { parentIds: chronicleIds, limitPerParent: 30 }
      : "skip"
  ) as Record<string, ReplyDocLike[]> | undefined;

  const replyAuthorIds = useMemo(() => {
    if (!replyDocMap) return [];
    return [
      ...new Set(
        Object.values(replyDocMap)
          .flat()
          .map((reply) => reply.authorId)
      ),
    ];
  }, [replyDocMap]);

  const replyAuthorsResult = useQuery(
    api.users.getBatch,
    replyAuthorIds.length > 0 ? { clerkIds: replyAuthorIds } : "skip"
  ) as AuthorRecord[] | undefined;
  const replyAuthors = replyAuthorsResult ?? EMPTY_AUTHORS;

  const createMutation = useMutation(api.chronicles.create);
  const likeMutation = useMutation(api.chronicles.like);
  const repostMutation = useMutation(api.chronicles.repost);
  const bookmarkMutation = useMutation(api.chronicles.bookmark);
  const removeMutation = useMutation(api.chronicles.remove);
  const replyMutation = useMutation(api.chronicles.addReply);

  const authorById = useMemo(() => {
    const allAuthors = [...authors, ...replyAuthors];
    return new Map(allAuthors.map((author) => [author.clerkId, author]));
  }, [authors, replyAuthors]);

  const chronicles = useMemo(
    () =>
      rawChronicles.map((doc) =>
        enrichFeedChronicle({
          doc,
          reactionState: reactionStates?.[doc._id],
          author: authorById.get(doc.authorId),
          fallbackAuthorName: doc.authorId === currentUserId ? me?.name ?? "You" : "Reader",
          fallbackAuthorHandle: doc.authorId === currentUserId ? me?.handle ?? "you" : "reader",
        })
      ),
    [authorById, currentUserId, me?.handle, me?.name, rawChronicles, reactionStates]
  );

  const serverReplies = useMemo(() => {
    if (!replyDocMap) return {};
    return Object.fromEntries(
      Object.entries(replyDocMap).map(([parentId, replies]) => [
        parentId,
        mapReplyDocs(replies).map((reply) => {
          const author = authorById.get(reply.authorId);
          const isCurrentUserReply = reply.authorId === currentUserId;
          return {
            ...reply,
            authorDisplayName:
              author?.name ?? (isCurrentUserReply ? me?.name ?? "You" : "Reader"),
            authorHandle:
              author?.handle ?? (isCurrentUserReply ? me?.handle ?? "you" : "reader"),
            authorAvatarUrl: author?.avatarUrl,
          };
        }),
      ])
    );
  }, [authorById, currentUserId, me?.handle, me?.name, replyDocMap]);

  const mergedReplies = useMemo(
    () => mergeReplyMaps(serverReplies, localReplies),
    [localReplies, serverReplies]
  );

  const ensureAuthenticatedForWrite = () => {
    if (isAuthenticated) return true;
    if (!isLoading) void openSignIn();
    return false;
  };

  const buildOptimisticReply = (chronicleId: string, text: string): Reply => ({
    id: crypto.randomUUID(),
    chronicleId,
    authorId: currentUserId,
    authorDisplayName: me?.name ?? "You",
    authorHandle: me?.handle ?? "you",
    authorAvatarUrl: me?.avatarUrl,
    text,
    createdAt: Date.now(),
  });

  return {
    chronicles,
    replies: mergedReplies,

    addChronicle: (draft: NewChronicleDraft) => {
      if (!ensureAuthenticatedForWrite()) return;
      void createMutation({
        text: draft.text,
        highlightText: draft.highlightText,
        bookTitle: draft.bookTitle,
        bookRef: draft.bookHash,
        spoilerTag: draft.spoilerTag,
      }).catch((err) => {
        console.error("[useConvexChronicles] Failed to create chronicle:", err);
      });
    },

    likeChronicle: (id: string) => {
      if (!ensureAuthenticatedForWrite()) return;
      void likeMutation({ chronicleId: id as Id<"chronicles"> }).catch((err) => {
        console.error("[useConvexChronicles] Failed to like chronicle:", err);
      });
    },

    repostChronicle: (id: string) => {
      if (!ensureAuthenticatedForWrite()) return;
      void repostMutation({ chronicleId: id as Id<"chronicles"> }).catch((err) => {
        console.error("[useConvexChronicles] Failed to repost chronicle:", err);
      });
    },

    bookmarkChronicle: (id: string) => {
      if (!ensureAuthenticatedForWrite()) return;
      void bookmarkMutation({ chronicleId: id as Id<"chronicles"> }).catch((err) => {
        console.error("[useConvexChronicles] Failed to bookmark chronicle:", err);
      });
    },

    deleteChronicle: (id: string) => {
      if (!ensureAuthenticatedForWrite()) return;
      void removeMutation({ chronicleId: id as Id<"chronicles"> }).catch((err) => {
        console.error("[useConvexChronicles] Failed to delete chronicle:", err);
      });
    },

    addReply: (chronicleId: string, text: string): Reply => {
      if (!ensureAuthenticatedForWrite()) {
        return { id: "", chronicleId, authorId: currentUserId, text, createdAt: 0 };
      }

      const newReply = buildOptimisticReply(chronicleId, text);
      setLocalReplies((prev) => ({
        ...prev,
        [chronicleId]: [newReply, ...(prev[chronicleId] ?? [])],
      }));

      void replyMutation({ parentChronicleId: chronicleId as Id<"chronicles">, text })
        .then(() => {
          setLocalReplies((prev) => ({
            ...prev,
            [chronicleId]: (prev[chronicleId] ?? []).filter((reply) => reply.id !== newReply.id),
          }));
        })
        .catch((err) => {
          console.error("[useConvexChronicles] Failed to add reply:", err);
          setLocalReplies((prev) => ({
            ...prev,
            [chronicleId]: (prev[chronicleId] ?? []).filter((reply) => reply.id !== newReply.id),
          }));
        });

      return newReply;
    },
  };
}
