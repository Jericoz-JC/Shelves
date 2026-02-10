import type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
} from "@/types/book";

export const DB_NAME = "shelves-db";
export const DB_VERSION = 2;

export const STORES = {
  BOOKS: "books",
  METADATA: "metadata",
  PROGRESS: "progress",
  LOCATIONS: "locations",
} as const;

export type { BookMetadata, StoredBook, BookProgress, BookLocations };
