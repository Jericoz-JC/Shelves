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

export interface StoredBook {
  fileHash: string;
  data: ArrayBuffer;
}
