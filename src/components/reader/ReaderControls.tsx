import { Settings, Minus, Plus, Sun, Moon, Leaf, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
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

const themeIcons: Record<ReadingTheme, React.ReactNode> = {
  paper: <Sun className="h-4 w-4" />,
  night: <Moon className="h-4 w-4" />,
  focus: <Leaf className="h-4 w-4" />,
  sepia: <Coffee className="h-4 w-4" />,
};

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
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">
            Reading Settings
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Theme Selection */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Theme
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(READING_THEMES) as ReadingTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    theme === t
                      ? "border-accent bg-accent/10"
                      : "border-transparent bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: READING_THEMES[t].background,
                      color: READING_THEMES[t].text,
                      border: `1px solid ${READING_THEMES[t].text}20`,
                    }}
                  >
                    {themeIcons[t]}
                  </div>
                  <span className="text-xs font-medium">
                    {READING_THEMES[t].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Font Size */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Font Size
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() =>
                  onFontSizeChange(Math.max(FONT_SIZE_MIN, fontSize - 1))
                }
                disabled={fontSize <= FONT_SIZE_MIN}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-display">{fontSize}</span>
                <span className="text-sm text-muted-foreground ml-1">px</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
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
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Typeface
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => onFontFamilyChange(f.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    fontFamily === f.value
                      ? "border-accent bg-accent/10"
                      : "border-transparent bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <span
                    className="text-base"
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
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
