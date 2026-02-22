import type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
  BookSettings,
  ReaderNote,
  ReaderBookmark,
} from "@/types/book";

export const DB_NAME = "shelves-db";
export const DB_VERSION = 5;

export const STORES = {
  BOOKS: "books",
  METADATA: "metadata",
  PROGRESS: "progress",
  LOCATIONS: "locations",
  NOTES: "notes",
  BOOKMARKS: "bookmarks",
  SETTINGS: "settings",
} as const;

export type {
  BookMetadata,
  StoredBook,
  BookProgress,
  BookLocations,
  BookSettings,
  ReaderNote,
  ReaderBookmark,
};
