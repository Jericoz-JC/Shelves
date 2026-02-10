import type { Book, Rendition, Location } from "epubjs";

export type EpubBook = Book;
export type EpubRendition = Rendition;
export type EpubLocation = Location;

export interface EpubMetadata {
  title: string;
  author: string;
  publisher?: string;
  language?: string;
  description?: string;
  coverUrl: string | null;
}
