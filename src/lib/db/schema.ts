import type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
  ReaderNote,
} from "@/types/book";

export const DB_NAME = "shelves-db";
export const DB_VERSION = 3;

export const STORES = {
  BOOKS: "books",
  METADATA: "metadata",
  PROGRESS: "progress",
  LOCATIONS: "locations",
  NOTES: "notes",
} as const;

export type { BookMetadata, StoredBook, BookProgress, BookLocations, ReaderNote };
