import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface NoteMarker {
  id: string;
  percentage: number;
  text: string;
}

interface ReaderNotesLayerProps {
  markers: NoteMarker[];
  onDelete?: (id: string) => void;
}

export function ReaderNotesLayer({ markers, onDelete }: ReaderNotesLayerProps) {
  return (
    <div className="absolute inset-y-0 right-3 z-20 pointer-events-none">
      <div className="relative h-full w-4">
        {markers.map((note) => (
          <Popover key={note.id}>
            <PopoverTrigger asChild>
              <button
                className="pointer-events-auto absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[color:var(--reading-accent)] shadow-sm ring-2 ring-[color:var(--reading-surface)]"
                style={{ top: `${note.percentage * 100}%`, right: 0 }}
                aria-label="Open note"
              />
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="center"
              className="reading-surface w-64 border border-[color:var(--reading-border)] text-sm"
            >
              <div className="space-y-3">
                <p className="text-[color:var(--reading-text)]">{note.text}</p>
                {onDelete && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs uppercase tracking-[0.2em]"
                      onClick={() => onDelete(note.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
