import type { Book } from "epubjs";
import type { EpubMetadata } from "@/types/epub";
import type { BookMetadata } from "@/types/book";

export async function extractMetadata(book: Book): Promise<EpubMetadata> {
  await book.ready;

  const metadata = book.packaging.metadata;
  let coverUrl: string | null = null;

  try {
    coverUrl = await book.coverUrl() ?? null;
  } catch {
    coverUrl = null;
  }

  return {
    title: metadata.title || "Untitled",
    author: metadata.creator || "Unknown Author",
    publisher: metadata.publisher || undefined,
    language: metadata.language || undefined,
    description: metadata.description || undefined,
    coverUrl,
  };
}

export function toBookMetadata(
  epubMeta: EpubMetadata,
  fileHash: string,
  fileSizeBytes: number
): BookMetadata {
  return {
    fileHash,
    title: epubMeta.title,
    author: epubMeta.author,
    coverUrl: epubMeta.coverUrl,
    fileSizeBytes,
    addedAt: Date.now(),
    lastOpenedAt: null,
  };
}
