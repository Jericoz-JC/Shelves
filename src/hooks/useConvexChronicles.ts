import { useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
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

const PAGE_SIZE = 20;
const EMPTY_AUTHORS: AuthorRecord[] = [];
const MAX_EXPANDED_PARENTS = 25;

interface FeedPageDoc extends ChronicleDocLike {
  authorId: string;
  author: AuthorRecord | null;
  viewer: ReactionState | null;
}

const AUTH_REQUIRED_FEEDS: ReadonlySet<FeedType> = new Set([
  "following",
  "bookmarks",
  "likes",
  "reposts",
]);

export function useConvexChronicles(
  feedType: FeedType = "forYou",
  options?: UseConvexChroniclesOptions
): ChroniclesHook {
  const { userId } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { openSignIn } = useClerk();
  const currentUserId = resolveCurrentUserId(userId);

  const [localReplies, setLocalReplies] = useState<Record<string, Reply[]>>({});
  // Reply docs are fetched lazily, only for chronicles the user has expanded.
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Frozen per mount: the ranking time bucket. Engagement counts still update
  // live; the decay reference refreshes on remount or feed switch. A ticking
  // value here would reset the whole pagination stack every minute.
  const [nowBucketMs] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);

  const skipFeed =
    (AUTH_REQUIRED_FEEDS.has(feedType) && !isAuthenticated) ||
    (feedType === "author" && !options?.authorId);

  const {
    results: pageDocs,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(
    api.chronicles.feedPage,
    skipFeed
      ? "skip"
      : {
          feed: feedType,
          authorId: feedType === "author" ? options?.authorId ?? undefined : undefined,
          nowBucketMs: feedType === "forYou" ? nowBucketMs : undefined,
        },
    { initialNumItems: PAGE_SIZE }
  );
  // usePaginatedQuery always returns an array (empty while loading/skipped).
  const rawChronicles = pageDocs as FeedPageDoc[];

  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip") as
    | (AuthorRecord & { handle?: string })
    | null
    | undefined;

  // Lazy replies: only chronicles the user expanded, capped well below the
  // server batch limit. Visible chronicle ids gate against stale expansions.
  const visibleIds = useMemo(
    () => new Set(rawChronicles.map((chronicle) => chronicle._id)),
    [rawChronicles]
  );
  const expandedVisibleIds = useMemo(
    () =>
      expandedIds
        .filter((id) => visibleIds.has(id))
        .slice(-MAX_EXPANDED_PARENTS) as Id<"chronicles">[],
    [expandedIds, visibleIds]
  );

  const replyDocMap = useQuery(
    api.chronicles.listRepliesBatch,
    expandedVisibleIds.length > 0
      ? { parentIds: expandedVisibleIds, limitPerParent: 30 }
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

  const replyAuthorById = useMemo(
    () => new Map(replyAuthors.map((author) => [author.clerkId, author])),
    [replyAuthors]
  );

  const chronicles = useMemo(
    () =>
      rawChronicles.map((doc) =>
        enrichFeedChronicle({
          doc,
          reactionState: doc.viewer ?? undefined,
          author: doc.author ?? undefined,
          fallbackAuthorName: doc.authorId === currentUserId ? me?.name ?? "You" : "Reader",
          fallbackAuthorHandle: doc.authorId === currentUserId ? me?.handle ?? "you" : "reader",
        })
      ),
    [currentUserId, me?.handle, me?.name, rawChronicles]
  );

  const serverReplies = useMemo(() => {
    if (!replyDocMap) return {};
    return Object.fromEntries(
      Object.entries(replyDocMap).map(([parentId, replies]) => [
        parentId,
        mapReplyDocs(replies).map((reply) => {
          const author = replyAuthorById.get(reply.authorId);
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
  }, [currentUserId, me?.handle, me?.name, replyAuthorById, replyDocMap]);

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

    loadMore: (numItems: number) => loadMore(numItems || PAGE_SIZE),
    canLoadMore: feedStatus === "CanLoadMore",
    isLoadingMore: feedStatus === "LoadingMore",

    setRepliesExpanded: (chronicleId: string, expanded: boolean) => {
      setExpandedIds((prev) => {
        const without = prev.filter((id) => id !== chronicleId);
        return expanded ? [...without, chronicleId] : without;
      });
    },

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
