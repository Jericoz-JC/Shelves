import type { Reply, MockBook } from "@/types/social";
import { hoursAgo, minutesAgo } from "./mockTime";

export const mockReplies: Reply[] = [
  // Replies to c1 (Elena's Remains of the Day post)
  {
    id: "r1",
    chronicleId: "c1",
    authorId: "u2",
    text: "Totally agree! Ishiguro's subtlety is unmatched. Have you read 'Never Let Me Go'?",
    createdAt: hoursAgo(1),
  },
  {
    id: "r2",
    chronicleId: "c1",
    authorId: "u3",
    text: "Added to my TBR list! I've been meaning to read more Ishiguro.",
    createdAt: minutesAgo(45),
  },
  {
    id: "r3",
    chronicleId: "c1",
    authorId: "u5",
    text: "The bench scene is devastating. I had to put the book down for a moment.",
    createdAt: minutesAgo(30),
  },

  // Replies to c2 (James's audiobooks take)
  {
    id: "r4",
    chronicleId: "c2",
    authorId: "u1",
    text: "100%! A good narrator can elevate a book to another level.",
    createdAt: hoursAgo(4),
  },
  {
    id: "r5",
    chronicleId: "c2",
    authorId: "u4",
    text: "Hot take indeed. But I'm with you on this one.",
    createdAt: hoursAgo(3),
  },

  // Replies to c3 (Priya's Pachinko)
  {
    id: "r6",
    chronicleId: "c3",
    authorId: "u1",
    text: "Pachinko is phenomenal. You're in for a ride!",
    createdAt: hoursAgo(5),
  },
  {
    id: "r7",
    chronicleId: "c3",
    authorId: "u4",
    text: "One of my all-time favorites. The generational scope is breathtaking.",
    createdAt: hoursAgo(4),
  },

  // Replies to c4 (Oliver's Wilde quote)
  {
    id: "r8",
    chronicleId: "c4",
    authorId: "u5",
    text: "Oscar Wilde was truly ahead of his time. Every quote is a gem.",
    createdAt: hoursAgo(7),
  },
  {
    id: "r9",
    chronicleId: "c4",
    authorId: "u3",
    text: "This one and 'Be yourself; everyone else is already taken.' are my favorites.",
    createdAt: hoursAgo(6),
  },

  // Replies to c5 (Sofia's DNF opinion)
  {
    id: "r10",
    chronicleId: "c5",
    authorId: "u2",
    text: "Took me years to learn this. Life-changing once you do.",
    createdAt: hoursAgo(9),
  },
  {
    id: "r11",
    chronicleId: "c5",
    authorId: "u1",
    text: "I used to force myself through every book. Not anymore!",
    createdAt: hoursAgo(8),
  },
  {
    id: "r12",
    chronicleId: "c5",
    authorId: "u3",
    text: "Unless it's for a book club. Then you suffer together.",
    createdAt: hoursAgo(7),
  },
];

export const mockUserBooks: Record<string, MockBook[]> = {
  u1: [
    { id: "b1", title: "The Remains of the Day", author: "Kazuo Ishiguro", color: "#6B4C3B" },
    { id: "b2", title: "Normal People", author: "Sally Rooney", color: "#2D6A4F" },
    { id: "b3", title: "Beloved", author: "Toni Morrison", color: "#7B2D26" },
    { id: "b4", title: "Atonement", author: "Ian McEwan", color: "#4A5568" },
  ],
  u2: [
    { id: "b5", title: "Project Hail Mary", author: "Andy Weir", color: "#1A365D" },
    { id: "b6", title: "Dune", author: "Frank Herbert", color: "#C6953B" },
    { id: "b7", title: "Neuromancer", author: "William Gibson", color: "#2C5282" },
  ],
  u3: [
    { id: "b8", title: "Pachinko", author: "Min Jin Lee", color: "#9B2C2C" },
    { id: "b9", title: "The Secret History", author: "Donna Tartt", color: "#2D3748" },
    { id: "b10", title: "Shōgun", author: "James Clavell", color: "#744210" },
    { id: "b11", title: "Wolf Hall", author: "Hilary Mantel", color: "#553C9A" },
  ],
  u4: [
    { id: "b12", title: "The Picture of Dorian Gray", author: "Oscar Wilde", color: "#4A5568" },
    { id: "b13", title: "1984", author: "George Orwell", color: "#1A202C" },
    { id: "b14", title: "Brave New World", author: "Aldous Huxley", color: "#2B6CB0" },
  ],
  u5: [
    { id: "b15", title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", color: "#1A202C" },
    { id: "b16", title: "My Year of Rest and Relaxation", author: "Ottessa Moshfegh", color: "#E2E8F0" },
    { id: "b17", title: "Convenience Store Woman", author: "Sayaka Murata", color: "#68D391" },
    { id: "b18", title: "Anxious People", author: "Fredrik Backman", color: "#F6AD55" },
  ],
};

export function getRepliesForChronicle(chronicleId: string): Reply[] {
  return mockReplies.filter((r) => r.chronicleId === chronicleId);
}
