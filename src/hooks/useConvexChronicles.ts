import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";
import { mapChronicleDocToFeedChronicle } from "@/lib/social/mapChronicles";

export function useConvexChronicles(): ChroniclesHook {
  const { isAuthenticated, isLoading } = useConvexAuth();
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

  const chronicles = rawChronicles.map(mapChronicleDocToFeedChronicle);

  const ensureAuthenticatedForWrite = () => {
    if (isAuthenticated) return true;
    // Don't prompt sign-in while the Convex JWT is still propagating.
    if (!isLoading) void openSignIn();
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
      if (!ensureAuthenticatedForWrite()) {
        return { id: "", chronicleId, authorId: "me", text, createdAt: 0 };
      }

      const newReply = buildOptimisticReply(chronicleId, text);

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
