export interface BookMetadata {
  fileHash: string;
  title: string;
  author: string;
  coverUrl: string | null;
  fileSizeBytes: number;
  addedAt: number;
  lastOpenedAt: number | null;
}

export interface BookProgress {
  bookHash: string;
  currentCFI: string | null;
  percentage: number;
  lastReadAt: number;
  chapter: string | null;
}

export interface BookLocations {
  bookHash: string;
  locations: string;
  createdAt: number;
}

export interface BookSettings {
  bookHash: string;
  disableBottomScrubber: boolean;
  updatedAt: number;
}

export interface ReaderNote {
  id: string;
  bookHash: string;
  cfi: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  percentage?: number | null;
  color?: "yellow" | "blue" | "green" | "pink";
  highlightedText?: string; // the raw selected text
}

export interface StoredBook {
  fileHash: string;
  data: ArrayBuffer;
}
