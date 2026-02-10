import ePub from "epubjs";
import type { Book } from "epubjs";

export function loadEpubFromArrayBuffer(arrayBuffer: ArrayBuffer): Book {
  return ePub(arrayBuffer);
}

export async function loadEpubFromFile(file: File): Promise<{ book: Book; arrayBuffer: ArrayBuffer }> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  return { book, arrayBuffer };
}
