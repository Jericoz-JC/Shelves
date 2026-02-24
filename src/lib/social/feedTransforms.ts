import type { Chronicle, Reply } from "@/types/social";
import type { ChronicleDocLike } from "./mapChronicles";
import { mapChronicleDocToFeedChronicle } from "./mapChronicles";

export interface ReactionState {
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
}

export interface AuthorRecord {
  clerkId: string;
  name?: string;
  handle?: string;
  avatarUrl?: string;
}

export interface ReplyDocLike {
  _id: string;
  parentChronicleId?: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export function enrichFeedChronicle(params: {
  doc: ChronicleDocLike;
  reactionState?: ReactionState;
  author?: AuthorRecord;
  fallbackAuthorName?: string;
  fallbackAuthorHandle?: string;
}): Chronicle {
  const base = mapChronicleDocToFeedChronicle(params.doc);
  const reactionState = params.reactionState;
  return {
    ...base,
    isLiked: reactionState?.isLiked ?? base.isLiked,
    isReposted: reactionState?.isReposted ?? base.isReposted,
    isBookmarked: reactionState?.isBookmarked ?? base.isBookmarked,
    authorDisplayName: params.author?.name ?? params.fallbackAuthorName,
    authorHandle: params.author?.handle ?? params.fallbackAuthorHandle,
    authorAvatarUrl: params.author?.avatarUrl,
  };
}

export function mapReplyDocs(replies: ReplyDocLike[]): Reply[] {
  return replies
    .filter(
      (reply): reply is ReplyDocLike & { parentChronicleId: string } =>
        typeof reply.parentChronicleId === "string" && reply.parentChronicleId.trim().length > 0
    )
    .map((reply) => ({
      id: reply._id,
      chronicleId: reply.parentChronicleId,
      authorId: reply.authorId,
      text: reply.text,
      createdAt: reply.createdAt,
    }));
}

export function mergeReplyMaps(
  serverReplies: Record<string, Reply[]>,
  localReplies: Record<string, Reply[]>
): Record<string, Reply[]> {
  const allKeys = new Set([...Object.keys(serverReplies), ...Object.keys(localReplies)]);
  const merged: Record<string, Reply[]> = {};

  for (const key of allKeys) {
    const dedupe = new Set<string>();
    const combined = [...(serverReplies[key] ?? []), ...(localReplies[key] ?? [])];
    merged[key] = combined.filter((reply) => {
      if (!reply.id || dedupe.has(reply.id)) return false;
      dedupe.add(reply.id);
      return true;
    });
  }

  return merged;
}
