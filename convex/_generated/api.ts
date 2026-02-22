/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * This stub provides types for the build; the real file is produced by the Convex CLI.
 * @module
 */

import { anyApi } from "convex/server";
import type { FunctionReference } from "convex/server";

type ChronicleDoc = {
  _id: string;
  _creationTime: number;
  authorId: string;
  text: string;
  bookRef?: string;
  highlightText?: string;
  bookTitle?: string;
  parentChronicleId?: string;
  spoilerTag?: boolean;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  createdAt: number;
};

type QRef<Args extends Record<string, unknown>, Ret> = FunctionReference<
  "query",
  "public",
  Args,
  Ret
>;
type MRef<Args extends Record<string, unknown>> = FunctionReference<
  "mutation",
  "public",
  Args,
  void
>;

export const api = anyApi as unknown as {
  chronicles: {
    list: QRef<{ limit?: number }, ChronicleDoc[]>;
    listReplies: QRef<{ parentId: string; limit?: number }, ChronicleDoc[]>;
    create: MRef<{
      userId: string;
      text: string;
      highlightText?: string;
      bookTitle?: string;
      bookRef?: string;
      spoilerTag?: boolean;
    }>;
    like: MRef<{ chronicleId: string; userId: string }>;
    repost: MRef<{ chronicleId: string; userId: string }>;
    bookmark: MRef<{ chronicleId: string; userId: string }>;
    remove: MRef<{ chronicleId: string; userId: string }>;
    addReply: MRef<{
      parentChronicleId: string;
      text: string;
      userId: string;
    }>;
  };
  books: {
    createBook: MRef<{
      fileHash: string;
      title: string;
      author?: string;
      coverImageUrl?: string;
      fileSizeBytes?: number;
    }>;
  };
  readingProgress: {
    updateProgress: MRef<{
      userId: string;
      bookHash: string;
      currentCFI?: string;
      percentage: number;
      lastReadAt: number;
      chapter?: string;
    }>;
  };
  userPreferences: {
    updatePreferences: MRef<{
      userId: string;
      theme: string;
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
    }>;
  };
};

export const internal = anyApi as any;
