import type { Chronicle } from "@/types/social";

export interface ChronicleDocLike {
  _id: string;
  authorId: string;
  text: string;
  createdAt: number;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  highlightText?: string;
  bookTitle?: string;
  bookRef?: string;
  spoilerTag?: boolean;
  spoilerRedacted?: boolean;
}

export function mapChronicleDocToFeedChronicle(doc: ChronicleDocLike): Chronicle {
  return {
    id: doc._id,
    authorId: doc.authorId,
    text: doc.text,
    createdAt: doc.createdAt,
    likeCount: doc.likeCount,
    replyCount: doc.replyCount,
    repostCount: doc.repostCount,
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
    highlightText: doc.highlightText,
    bookTitle: doc.bookTitle,
    bookHash: doc.bookRef,
    spoilerTag: doc.spoilerTag,
    spoilerRedacted: doc.spoilerRedacted,
  };
}
