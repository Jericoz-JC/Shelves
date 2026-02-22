import { useState, useEffect } from "react";
import type { Chronicle, Reply } from "@/types/social";
import { mockChronicles } from "@/data/mockFeed";
import { mockReplies } from "@/data/mockReplies";

const CHRONICLES_KEY = "shelves-chronicles";
const REPLIES_KEY = "shelves-replies";
const SEEDED_KEY = "shelves-chronicles-seeded";

const CURRENT_USER_ID = "me";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface NewChronicleDraft {
  text: string;
  highlightText?: string;
  bookTitle?: string;
  bookHash?: string;
  spoilerTag?: boolean;
}

export interface ChroniclesHook {
  chronicles: Chronicle[];
  replies: Record<string, Reply[]>;
  addChronicle: (draft: NewChronicleDraft) => void;
  likeChronicle: (id: string) => void;
  repostChronicle: (id: string) => void;
  bookmarkChronicle: (id: string) => void;
  deleteChronicle: (id: string) => void;
  addReply: (chronicleId: string, text: string) => Reply;
}

function loadChronicles(): Chronicle[] {
  try {
    const raw = localStorage.getItem(CHRONICLES_KEY);
    if (raw) return JSON.parse(raw) as Chronicle[];
  } catch {
    // ignore parse errors
  }
  return [];
}

function loadReplies(): Record<string, Reply[]> {
  try {
    const raw = localStorage.getItem(REPLIES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, Reply[]>;
  } catch {
    // ignore parse errors
  }
  return {};
}

function seedReplies(): Record<string, Reply[]> {
  const map: Record<string, Reply[]> = {};
  for (const reply of mockReplies) {
    if (!map[reply.chronicleId]) map[reply.chronicleId] = [];
    map[reply.chronicleId].push(reply);
  }
  return map;
}

export function useChronicles(): ChroniclesHook {
  const [chronicles, setChronicles] = useState<Chronicle[]>(() => {
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(CHRONICLES_KEY, JSON.stringify(mockChronicles));
      const repliesMap = seedReplies();
      localStorage.setItem(REPLIES_KEY, JSON.stringify(repliesMap));
      localStorage.setItem(SEEDED_KEY, "true");
      return mockChronicles;
    }
    return loadChronicles();
  });

  const [replies, setReplies] = useState<Record<string, Reply[]>>(() =>
    loadReplies()
  );

  useEffect(() => {
    localStorage.setItem(CHRONICLES_KEY, JSON.stringify(chronicles));
  }, [chronicles]);

  useEffect(() => {
    localStorage.setItem(REPLIES_KEY, JSON.stringify(replies));
  }, [replies]);

  const addChronicle = (draft: NewChronicleDraft) => {
    const newChronicle: Chronicle = {
      id: generateId(),
      authorId: CURRENT_USER_ID,
      text: draft.text,
      highlightText: draft.highlightText,
      bookTitle: draft.bookTitle,
      bookHash: draft.bookHash,
      spoilerTag: draft.spoilerTag,
      createdAt: Date.now(),
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
    };
    setChronicles((prev) => [newChronicle, ...prev]);
  };

  const likeChronicle = (id: string) => {
    setChronicles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      )
    );
  };

  const repostChronicle = (id: string) => {
    setChronicles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              isReposted: !p.isReposted,
              repostCount: p.isReposted ? p.repostCount - 1 : p.repostCount + 1,
            }
          : p
      )
    );
  };

  const bookmarkChronicle = (id: string) => {
    setChronicles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
  };

  const deleteChronicle = (id: string) => {
    setChronicles((prev) => prev.filter((p) => p.id !== id));
    setReplies((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addReply = (chronicleId: string, text: string): Reply => {
    const newReply: Reply = {
      id: generateId(),
      chronicleId,
      authorId: CURRENT_USER_ID,
      text,
      createdAt: Date.now(),
    };
    setReplies((prev) => ({
      ...prev,
      [chronicleId]: [newReply, ...(prev[chronicleId] ?? [])],
    }));
    setChronicles((prev) =>
      prev.map((p) =>
        p.id === chronicleId ? { ...p, replyCount: p.replyCount + 1 } : p
      )
    );
    return newReply;
  };

  return {
    chronicles,
    replies,
    addChronicle,
    likeChronicle,
    repostChronicle,
    bookmarkChronicle,
    deleteChronicle,
    addReply,
  };
}
