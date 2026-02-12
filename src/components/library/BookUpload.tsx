import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadEpubFromFile } from "@/lib/epub/epubLoader";
import { extractMetadata, toBookMetadata } from "@/lib/epub/epubParser";
import { hashFile } from "@/lib/utils/fileHash";
import { IndexedDBService } from "@/lib/db/indexedDB";

interface BookUploadProps {
  onUploadComplete: () => void;
}

export function BookUpload({ onUploadComplete }: BookUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    let book: Awaited<ReturnType<typeof loadEpubFromFile>>["book"] | null = null;
    try {
      const loaded = await loadEpubFromFile(file);
      book = loaded.book;
      const arrayBuffer = loaded.arrayBuffer;
      const fileHash = await hashFile(arrayBuffer);
      const epubMeta = await extractMetadata(book);
      const metadata = toBookMetadata(epubMeta, fileHash, file.size);

      await IndexedDBService.storeBook(fileHash, arrayBuffer, metadata);
      onUploadComplete();
    } catch (err) {
      console.error("Failed to upload book:", err);
    } finally {
      if (book) {
        book.destroy();
      }
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        size="default"
        className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {uploading ? (
          <>
            <Upload className="h-4 w-4 animate-pulse" />
            Importing...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add Book
          </>
        )}
      </Button>
    </>
  );
}
