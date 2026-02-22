import { useQuery, useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { api } from "../../convex/_generated/api";
import { getTempUserId } from "@/lib/utils/tempUserId";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";

export function useConvexChronicles(): ChroniclesHook {
  const userId = getTempUserId();

  const rawChronicles = useQuery(api.chronicles.list, { limit: 50 }) ?? [];

  const createMutation   = useMutation(api.chronicles.create);
  const likeMutation     = useMutation(api.chronicles.like);
  const repostMutation   = useMutation(api.chronicles.repost);
  const bookmarkMutation = useMutation(api.chronicles.bookmark);
  const removeMutation   = useMutation(api.chronicles.remove);
  const replyMutation    = useMutation(api.chronicles.addReply);

  const chronicles = rawChronicles.map((doc) => ({
    id: doc._id as string,
    authorId: doc.authorId,
    text: doc.text,
    createdAt: doc.createdAt,
    likeCount: doc.likeCount,
    replyCount: doc.replyCount,
    repostCount: doc.repostCount,
    // Per-user states require separate queries — wired in Phase 4.5
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
    highlightText: doc.highlightText,
    bookTitle: doc.bookTitle,
    bookHash: doc.bookRef,
    spoilerTag: doc.spoilerTag,
  }));

  return {
    chronicles,
    replies: {},

    addChronicle: (draft: NewChronicleDraft) => {
      void createMutation({
        userId,
        text: draft.text,
        highlightText: draft.highlightText,
        bookTitle: draft.bookTitle,
        bookRef: draft.bookHash,
        spoilerTag: draft.spoilerTag,
      });
    },

    likeChronicle: (id: string) => {
      void likeMutation({ chronicleId: id as GenericId<"chronicles">, userId });
    },

    repostChronicle: (id: string) => {
      void repostMutation({ chronicleId: id as GenericId<"chronicles">, userId });
    },

    bookmarkChronicle: (id: string) => {
      void bookmarkMutation({ chronicleId: id as GenericId<"chronicles">, userId });
    },

    deleteChronicle: (id: string) => {
      void removeMutation({ chronicleId: id as GenericId<"chronicles">, userId });
    },

    addReply: (chronicleId: string, text: string): Reply => {
      void replyMutation({
        parentChronicleId: chronicleId as GenericId<"chronicles">,
        text,
        userId,
      });
      return {
        id: crypto.randomUUID(),
        chronicleId,
        authorId: userId,
        text,
        createdAt: Date.now(),
      };
    },
  };
}
