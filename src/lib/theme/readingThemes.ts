export type ReadingTheme = "paper" | "night" | "focus" | "sepia";

export interface ThemeConfig {
  name: string;
  background: string;
  text: string;
  accent: string;
  label: string;
  selectionBg: string;
}

export const READING_THEMES: Record<ReadingTheme, ThemeConfig> = {
  paper: {
    name: "paper",
    background: "#FBF7F1",
    text: "#2A241C",
    accent: "#C07A3D",
    label: "Paper",
    selectionBg: "rgba(192, 122, 61, 0.25)",
  },
  night: {
    name: "night",
    background: "#171614",
    text: "#EAE3DA",
    accent: "#C99B63",
    label: "Night",
    selectionBg: "rgba(201, 155, 99, 0.30)",
  },
  focus: {
    name: "focus",
    background: "#F3F1EA",
    text: "#3A332B",
    accent: "#5C8062",
    label: "Focus",
    selectionBg: "rgba(92, 128, 98, 0.25)",
  },
  sepia: {
    name: "sepia",
    background: "#F2E6D1",
    text: "#5A4330",
    accent: "#8B6A2B",
    label: "Sepia",
    selectionBg: "rgba(139, 106, 43, 0.25)",
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
      "-webkit-tap-highlight-color": "transparent",
      "user-select": "text",
      "-webkit-user-select": "text",
    },
    "::selection": {
      "background-color": config.selectionBg,
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
