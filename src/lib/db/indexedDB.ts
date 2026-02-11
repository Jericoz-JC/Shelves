import { openDB, type IDBPDatabase } from "idb";
import {
  DB_NAME,
  DB_VERSION,
  STORES,
  type BookMetadata,
  type StoredBook,
  type BookProgress,
  type BookLocations,
  type BookSettings,
  type ReaderNote,
} from "./schema";

function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.BOOKS)) {
        db.createObjectStore(STORES.BOOKS, { keyPath: "fileHash" });
      }
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: "fileHash" });
      }
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        db.createObjectStore(STORES.PROGRESS, { keyPath: "bookHash" });
      }
      if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
        db.createObjectStore(STORES.LOCATIONS, { keyPath: "bookHash" });
      }
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        const store = db.createObjectStore(STORES.NOTES, { keyPath: "id" });
        store.createIndex("by_book", "bookHash");
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "bookHash" });
      }
    },
  });
}

export const IndexedDBService = {
  async storeBook(
    fileHash: string,
    data: ArrayBuffer,
    metadata: BookMetadata
  ): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORES.BOOKS, STORES.METADATA], "readwrite");
    await Promise.all([
      tx.objectStore(STORES.BOOKS).put({ fileHash, data } as StoredBook),
      tx.objectStore(STORES.METADATA).put(metadata),
      tx.done,
    ]);
  },

  async getBook(fileHash: string): Promise<StoredBook | undefined> {
    const db = await getDB();
    return db.get(STORES.BOOKS, fileHash) as Promise<StoredBook | undefined>;
  },

  async getAllMetadata(): Promise<BookMetadata[]> {
    const db = await getDB();
    return db.getAll(STORES.METADATA) as Promise<BookMetadata[]>;
  },

  async deleteBook(fileHash: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(
      [
        STORES.BOOKS,
        STORES.METADATA,
        STORES.PROGRESS,
        STORES.LOCATIONS,
        STORES.NOTES,
        STORES.SETTINGS,
      ],
      "readwrite"
    );
    await Promise.all([
      tx.objectStore(STORES.BOOKS).delete(fileHash),
      tx.objectStore(STORES.METADATA).delete(fileHash),
      tx.objectStore(STORES.PROGRESS).delete(fileHash),
      tx.objectStore(STORES.LOCATIONS).delete(fileHash),
      tx.objectStore(STORES.SETTINGS).delete(fileHash),
    ]);
    const notesStore = tx.objectStore(STORES.NOTES);
    if (notesStore.indexNames.contains("by_book")) {
      const keys = await notesStore.index("by_book").getAllKeys(fileHash);
      await Promise.all(keys.map((key) => notesStore.delete(key)));
    }
    await tx.done;
  },

  async saveProgress(progress: BookProgress): Promise<void> {
    const db = await getDB();
    await db.put(STORES.PROGRESS, progress);
  },

  async getProgress(bookHash: string): Promise<BookProgress | undefined> {
    const db = await getDB();
    return db.get(STORES.PROGRESS, bookHash) as Promise<
      BookProgress | undefined
    >;
  },

  async saveLocations(bookHash: string, locations: string): Promise<void> {
    const db = await getDB();
    const payload: BookLocations = {
      bookHash,
      locations,
      createdAt: Date.now(),
    };
    await db.put(STORES.LOCATIONS, payload);
  },

  async getLocations(bookHash: string): Promise<string | undefined> {
    const db = await getDB();
    const record = (await db.get(STORES.LOCATIONS, bookHash)) as
      | BookLocations
      | undefined;
    return record?.locations;
  },

  async getBookSettings(bookHash: string): Promise<BookSettings | undefined> {
    const db = await getDB();
    return db.get(STORES.SETTINGS, bookHash) as Promise<
      BookSettings | undefined
    >;
  },

  async saveBookSettings(settings: BookSettings): Promise<void> {
    const db = await getDB();
    await db.put(STORES.SETTINGS, settings);
  },

  async getNotes(bookHash: string): Promise<ReaderNote[]> {
    const db = await getDB();
    const store = db.transaction(STORES.NOTES).objectStore(STORES.NOTES);
    if (store.indexNames.contains("by_book")) {
      return (await store.index("by_book").getAll(bookHash)) as ReaderNote[];
    }
    return (await store.getAll()) as ReaderNote[];
  },

  async saveNote(note: ReaderNote): Promise<void> {
    const db = await getDB();
    await db.put(STORES.NOTES, note);
  },

  async deleteNote(noteId: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORES.NOTES, noteId);
  },
};
