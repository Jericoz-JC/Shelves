import { openDB, type IDBPDatabase } from "idb";
import {
  DB_NAME,
  DB_VERSION,
  STORES,
  type BookMetadata,
  type StoredBook,
  type BookProgress,
  type BookLocations,
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
      [STORES.BOOKS, STORES.METADATA, STORES.PROGRESS, STORES.LOCATIONS],
      "readwrite"
    );
    await Promise.all([
      tx.objectStore(STORES.BOOKS).delete(fileHash),
      tx.objectStore(STORES.METADATA).delete(fileHash),
      tx.objectStore(STORES.PROGRESS).delete(fileHash),
      tx.objectStore(STORES.LOCATIONS).delete(fileHash),
      tx.done,
    ]);
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
};
