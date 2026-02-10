export type ReadingTheme = "paper" | "night" | "focus" | "sepia";

export interface ThemeConfig {
  name: string;
  background: string;
  text: string;
  accent: string;
  label: string;
}

export const READING_THEMES: Record<ReadingTheme, ThemeConfig> = {
  paper: {
    name: "paper",
    background: "#FEFCF8",
    text: "#2D2D2D",
    accent: "#C17F3E",
    label: "Paper",
  },
  night: {
    name: "night",
    background: "#1A1A1A",
    text: "#E0E0E0",
    accent: "#D4A574",
    label: "Night",
  },
  focus: {
    name: "focus",
    background: "#F5F5F0",
    text: "#3A3A3A",
    accent: "#6B8F71",
    label: "Focus",
  },
  sepia: {
    name: "sepia",
    background: "#F4ECD8",
    text: "#5B4636",
    accent: "#8B6914",
    label: "Sepia",
  },
};

export function getThemeCSS(
  theme: ReadingTheme,
  fontSize: number = 18,
  fontFamily: string = "Georgia, serif"
): Record<string, Record<string, string>> {
  const config = READING_THEMES[theme];

  return {
    body: {
      background: config.background,
      color: config.text,
      "font-family": fontFamily,
      "font-size": `${fontSize}px`,
      "line-height": "1.7",
      padding: "0 1rem",
    },
    "a, a:link, a:visited": {
      color: config.accent,
    },
    "h1, h2, h3, h4, h5, h6": {
      color: config.text,
    },
    p: {
      "margin-bottom": "0.8em",
    },
    img: {
      "max-width": "100%",
    },
  };
}

export const FONT_FAMILIES = [
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "System Sans", value: "system-ui, -apple-system, sans-serif" },
] as const;

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 18;
