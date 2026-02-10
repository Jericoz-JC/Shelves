import type { BookMetadata, StoredBook, BookProgress } from "@/types/book";

export const DB_NAME = "shelves-db";
export const DB_VERSION = 1;

export const STORES = {
  BOOKS: "books",
  METADATA: "metadata",
  PROGRESS: "progress",
} as const;

export type { BookMetadata, StoredBook, BookProgress };
