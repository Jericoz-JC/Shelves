import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getTempUserId } from "@/lib/utils/tempUserId";
import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";

export function useConvexChronicles(): ChroniclesHook {
  // Memoize for component lifetime — getTempUserId reads localStorage on every call
  const userId = useMemo(() => getTempUserId(), []);

  const rawChronicles = useQuery(api.chronicles.list, { limit: 50 }) ?? [];

  // localReplies holds optimistic replies added this session.
  // TODO (Phase 4.5): subscribe to api.chronicles.listReplies per expanded chronicle
  // and merge server replies with localReplies so threads persist across sessions.
  const [localReplies, setLocalReplies] = useState<Record<string, Reply[]>>({});

  const createMutation   = useMutation(api.chronicles.create);
  const likeMutation     = useMutation(api.chronicles.like);
  const repostMutation   = useMutation(api.chronicles.repost);
  const bookmarkMutation = useMutation(api.chronicles.bookmark);
  const removeMutation   = useMutation(api.chronicles.remove);
  const replyMutation    = useMutation(api.chronicles.addReply);

  const chronicles = rawChronicles.map((doc) => ({
    id: doc._id,
    // Map the current user's UUID back to "me" so ownership checks in the UI work
    authorId: doc.authorId === userId ? "me" : doc.authorId,
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
    replies: localReplies,

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
      void likeMutation({ chronicleId: id, userId });
    },

    repostChronicle: (id: string) => {
      void repostMutation({ chronicleId: id, userId });
    },

    bookmarkChronicle: (id: string) => {
      void bookmarkMutation({ chronicleId: id, userId });
    },

    deleteChronicle: (id: string) => {
      void removeMutation({ chronicleId: id, userId });
    },

    addReply: (chronicleId: string, text: string): Reply => {
      void replyMutation({ parentChronicleId: chronicleId, text, userId });

      // The returned id is optimistic — it won't match the Convex document id.
      // Downstream components should rely on the server-refreshed list for persistence.
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
