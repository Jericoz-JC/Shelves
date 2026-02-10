import { Settings, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  type ReadingTheme,
  READING_THEMES,
  FONT_FAMILIES,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "@/lib/theme/readingThemes";

interface ReaderControlsProps {
  theme: ReadingTheme;
  fontSize: number;
  fontFamily: string;
  onThemeChange: (theme: ReadingTheme) => void;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
}

export function ReaderControls({
  theme,
  fontSize,
  fontFamily,
  onThemeChange,
  onFontSizeChange,
  onFontFamilyChange,
}: ReaderControlsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-md ring-1 ring-border/50"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-background/95 px-6 pb-10 pt-6 shadow-[0_-20px_60px_rgba(0,0,0,0.12)]"
      >
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-border/80" />
        <SheetHeader className="flex-row items-center justify-between p-0">
          <SheetTitle className="font-display text-xl tracking-tight">
            Reading
          </SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Done
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="mt-6 space-y-7">
          {/* Theme Selection */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Theme
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(READING_THEMES) as ReadingTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all ${
                    theme === t
                      ? "border-accent/70 bg-accent/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                      : "border-border/60 bg-secondary/40 hover:bg-secondary/70"
                  }`}
                >
                  <div
                    className="h-12 w-full rounded-xl border border-black/5 shadow-inner"
                    style={{
                      backgroundColor: READING_THEMES[t].background,
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {READING_THEMES[t].label}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: READING_THEMES[t].accent }}
                    >
                      Aa
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1 w-full rounded-full"
                    style={{ backgroundColor: READING_THEMES[t].accent }}
                  />
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Font Size */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Font Size
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-border/70"
                onClick={() =>
                  onFontSizeChange(Math.max(FONT_SIZE_MIN, fontSize - 1))
                }
                disabled={fontSize <= FONT_SIZE_MIN}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-display">{fontSize}</span>
                <span className="text-sm text-muted-foreground ml-1">px</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-border/70"
                onClick={() =>
                  onFontSizeChange(Math.min(FONT_SIZE_MAX, fontSize + 1))
                }
                disabled={fontSize >= FONT_SIZE_MAX}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Font Family */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Typeface
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => onFontFamilyChange(f.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    fontFamily === f.value
                      ? "border-accent/70 bg-accent/10 shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                      : "border-border/60 bg-secondary/40 hover:bg-secondary/70"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Typeface
                  </span>
                  <span className="block text-lg" style={{ fontFamily: f.value }}>
                    {f.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground" style={{ fontFamily: f.value }}>
                    The quick brown fox
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
