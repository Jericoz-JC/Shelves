import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";

export function useConvexChronicles(): ChroniclesHook {
  const { userId } = useAuth();
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

  return {
    chronicles,
    replies: localReplies,

    addChronicle: (draft: NewChronicleDraft) => {
      void createMutation({
        text: draft.text,
        highlightText: draft.highlightText,
        bookTitle: draft.bookTitle,
        bookRef: draft.bookHash,
        spoilerTag: draft.spoilerTag,
      });
    },

    likeChronicle: (id: string) => {
      void likeMutation({ chronicleId: id as Id<"chronicles"> });
    },

    repostChronicle: (id: string) => {
      void repostMutation({ chronicleId: id as Id<"chronicles"> });
    },

    bookmarkChronicle: (id: string) => {
      void bookmarkMutation({ chronicleId: id as Id<"chronicles"> });
    },

    deleteChronicle: (id: string) => {
      void removeMutation({ chronicleId: id as Id<"chronicles"> });
    },

    addReply: (chronicleId: string, text: string): Reply => {
      void replyMutation({ parentChronicleId: chronicleId as Id<"chronicles">, text });

      // The returned id is optimistic and won't match the Convex document id.
      const newReply: Reply = {
        id: crypto.randomUUID(),
        chronicleId,
        authorId: "me",
        text,
        createdAt: Date.now(),
      };

      setLocalReplies((prev) => ({
        ...prev,
        [chronicleId]: [newReply, ...(prev[chronicleId] ?? [])],
      }));

      return newReply;
    },
  };
}
