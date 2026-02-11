import type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
  BookSettings,
  ReaderNote,
} from "@/types/book";

export const DB_NAME = "shelves-db";
export const DB_VERSION = 4;

export const STORES = {
  BOOKS: "books",
  METADATA: "metadata",
  PROGRESS: "progress",
  LOCATIONS: "locations",
  NOTES: "notes",
  SETTINGS: "settings",
} as const;

export type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
  BookSettings,
  ReaderNote,
};
