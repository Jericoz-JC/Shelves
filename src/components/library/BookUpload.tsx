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
    try {
      const { book, arrayBuffer } = await loadEpubFromFile(file);
      const fileHash = await hashFile(arrayBuffer);
      const epubMeta = await extractMetadata(book);
      const metadata = toBookMetadata(epubMeta, fileHash, file.size);

      await IndexedDBService.storeBook(fileHash, arrayBuffer, metadata);
      book.destroy();
      onUploadComplete();
    } catch (err) {
      console.error("Failed to upload book:", err);
    } finally {
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
        size="lg"
        className="gap-2"
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
