/**
 * useConvexChronicles — Phase 4 scaffold.
 *
 * Satisfies the same ChroniclesHook interface as useChronicles (localStorage).
 * Swap the import in Feed.tsx and Reader.tsx when Phase 4 auth wiring begins:
 *
 *   - import { useChronicles } from "@/hooks/useChronicles";
 *   + import { useConvexChronicles as useChronicles } from "@/hooks/useConvexChronicles";
 */

import type { Reply } from "@/types/social";
import type { ChroniclesHook, NewChronicleDraft } from "./useChronicles";

export function useConvexChronicles(): ChroniclesHook {
  const warn = (method: string) =>
    console.warn(`[useConvexChronicles] ${method}: Phase 4 pending.`);

  return {
    chronicles: [],
    replies: {},

    addChronicle: (_draft: NewChronicleDraft) => warn("addChronicle"),
    likeChronicle: (_id: string) => warn("likeChronicle"),
    repostChronicle: (_id: string) => warn("repostChronicle"),
    bookmarkChronicle: (_id: string) => warn("bookmarkChronicle"),
    deleteChronicle: (_id: string) => warn("deleteChronicle"),

    addReply: (_chronicleId: string, _text: string): Reply => {
      warn("addReply");
      // Placeholder — replace with real Convex mutation result in Phase 4
      return {
        id: crypto.randomUUID(),
        chronicleId: _chronicleId,
        authorId: "me",
        text: _text,
        createdAt: Date.now(),
      };
    },
  };
}
