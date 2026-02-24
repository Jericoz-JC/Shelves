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

export type FeedType = "forYou" | "following";

const FEED_LIMIT = 50;
const RANKING_REFRESH_MS = 60_000;
const EMPTY_CHRONICLES: ChronicleDocLike[] = [];
const EMPTY_AUTHORS: AuthorRecord[] = [];

const chroniclesApi = (api as unknown as { chronicles: Record<string, unknown> }).chronicles as {
  listForYou: unknown;
  listFollowing: unknown;
  listRepliesBatch: unknown;
  userReactionStates: unknown;
  create: unknown;
  like: unknown;
  repost: unknown;
  bookmark: unknown;
  remove: unknown;
  addReply: unknown;
};

const usersApi = (api as unknown as { users: Record<string, unknown> }).users as {
  getMe: unknown;
  getBatch: unknown;
};

export function useConvexChronicles(feedType: FeedType = "forYou"): ChroniclesHook {
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

  const rawChroniclesResult = useQuery(
    (feedType === "following"
      ? chroniclesApi.listFollowing
      : chroniclesApi.listForYou) as never,
    (feedType === "following"
      ? { limit: FEED_LIMIT }
      : { limit: FEED_LIMIT, nowBucketMs }) as never
  ) as ChronicleDocLike[] | undefined;
  const rawChronicles = rawChroniclesResult ?? EMPTY_CHRONICLES;

  const chronicleIds = useMemo(
    () => rawChronicles.map((chronicle) => chronicle._id as Id<"chronicles">),
    [rawChronicles]
  );

  const reactionStates = useQuery(
    chroniclesApi.userReactionStates as never,
    chronicleIds.length > 0 ? ({ chronicleIds } as never) : "skip"
  ) as Record<string, ReactionState> | undefined;

  const authorIds = useMemo(
    () => [...new Set(rawChronicles.map((chronicle) => chronicle.authorId))],
    [rawChronicles]
  );

  const authorsResult = useQuery(
    usersApi.getBatch as never,
    authorIds.length > 0 ? ({ clerkIds: authorIds } as never) : "skip"
  ) as AuthorRecord[] | undefined;
  const authors = authorsResult ?? EMPTY_AUTHORS;

  const me = useQuery(usersApi.getMe as never, isAuthenticated ? ({} as never) : "skip") as
    | (AuthorRecord & { handle?: string })
    | null
    | undefined;

  const replyDocMap = useQuery(
    chroniclesApi.listRepliesBatch as never,
    chronicleIds.length > 0
      ? ({ parentIds: chronicleIds, limitPerParent: 30 } as never)
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
    usersApi.getBatch as never,
    replyAuthorIds.length > 0 ? ({ clerkIds: replyAuthorIds } as never) : "skip"
  ) as AuthorRecord[] | undefined;
  const replyAuthors = replyAuthorsResult ?? EMPTY_AUTHORS;

  const createMutation = useMutation(chroniclesApi.create as never);
  const likeMutation = useMutation(chroniclesApi.like as never);
  const repostMutation = useMutation(chroniclesApi.repost as never);
  const bookmarkMutation = useMutation(chroniclesApi.bookmark as never);
  const removeMutation = useMutation(chroniclesApi.remove as never);
  const replyMutation = useMutation(chroniclesApi.addReply as never);

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
