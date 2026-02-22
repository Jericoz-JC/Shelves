import { useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";

export function useConvexChronicles(): ChroniclesHook {
  const { userId } = useAuth();
  const { openSignIn } = useClerk();
  const rawChronicles = useQuery(api.chronicles.list, { limit: 50 }) ?? [];

  // localReplies holds optimistic replies added this session.
  // TODO (Phase 4.5): subscribe to api.chronicles.listReplies per expanded chronicle
  // and merge server replies with localReplies so threads persist across sessions.
  const [localReplies, setLocalReplies] = useState<Record<string, Reply[]>>({});

  const createMutation = useMutation(api.chronicles.create);
  const likeMutation = useMutation(api.chronicles.like);
  const repostMutation = useMutation(api.chronicles.repost);
  const bookmarkMutation = useMutation(api.chronicles.bookmark);
  const removeMutation = useMutation(api.chronicles.remove);
  const replyMutation = useMutation(api.chronicles.addReply);

  const chronicles = rawChronicles.map((doc) => ({
    id: doc._id,
    // Map the signed-in user's Clerk subject to "me" so existing UI ownership checks keep working.
    authorId: doc.authorId === userId ? "me" : doc.authorId,
    text: doc.text,
    createdAt: doc.createdAt,
    likeCount: doc.likeCount,
    replyCount: doc.replyCount,
    repostCount: doc.repostCount,
    // Per-user states require separate queries, wired in a future pass.
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
    highlightText: doc.highlightText,
    bookTitle: doc.bookTitle,
    bookHash: doc.bookRef,
    spoilerTag: doc.spoilerTag,
  }));

  const ensureAuthenticatedForWrite = () => {
    if (userId) return true;
    void openSignIn();
    return false;
  };

  const buildOptimisticReply = (chronicleId: string, text: string): Reply => ({
    id: crypto.randomUUID(),
    chronicleId,
    authorId: "me",
    text,
    createdAt: Date.now(),
  });

  return {
    chronicles,
    replies: localReplies,

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
      const newReply = buildOptimisticReply(chronicleId, text);
      if (!ensureAuthenticatedForWrite()) {
        return newReply;
      }

      setLocalReplies((prev) => ({
        ...prev,
        [chronicleId]: [newReply, ...(prev[chronicleId] ?? [])],
      }));

      void replyMutation({ parentChronicleId: chronicleId as Id<"chronicles">, text }).catch((err) => {
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
