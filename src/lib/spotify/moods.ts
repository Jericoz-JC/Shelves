export const READING_MOODS = {
  peaceful: {
    label: "Peaceful",
    emoji: "🌿",
    queries: [
      "calm ambient instrumental reading",
      "peaceful nature sounds instrumental",
      "gentle piano relaxing background",
      "serene acoustic meditation music",
    ],
  },
  dark: {
    label: "Dark",
    emoji: "🌑",
    queries: [
      "dark ambient atmospheric instrumental",
      "dark cinematic drone soundscape",
      "gothic ambient dark orchestral",
      "eerie ambient horror instrumental",
    ],
  },
  epic: {
    label: "Epic",
    emoji: "⚔️",
    queries: [
      "epic orchestral cinematic instrumental",
      "heroic battle soundtrack orchestral",
      "epic trailer music instrumental",
      "grand symphonic adventure score",
    ],
  },
  romantic: {
    label: "Romantic",
    emoji: "💕",
    queries: [
      "soft acoustic love instrumental",
      "romantic piano ballad instrumental",
      "gentle love songs acoustic guitar",
      "tender romantic strings instrumental",
    ],
  },
  tense: {
    label: "Tense",
    emoji: "😰",
    queries: [
      "suspense thriller dark instrumental",
      "tense dramatic orchestral score",
      "psychological thriller ambient music",
      "intense suspenseful cinematic soundtrack",
    ],
  },
  melancholy: {
    label: "Melancholy",
    emoji: "🌧️",
    queries: [
      "sad piano melancholy instrumental",
      "melancholic cello emotional music",
      "bittersweet ambient piano solo",
      "sorrowful strings emotional soundtrack",
    ],
  },
  whimsical: {
    label: "Whimsical",
    emoji: "✨",
    queries: [
      "whimsical fantasy playful instrumental",
      "magical fairy tale music orchestral",
      "enchanted forest fantasy soundtrack",
      "lighthearted quirky adventure music",
    ],
  },
  focus: {
    label: "Focus",
    emoji: "🎯",
    queries: [
      "lo-fi study beats instrumental",
      "deep focus ambient electronic",
      "concentration music minimal beats",
      "study chill hip hop instrumental",
    ],
  },
} as const;

export type ReadingMood = keyof typeof READING_MOODS;

export function getRandomQuery(mood: ReadingMood): string {
  const queries = READING_MOODS[mood].queries;
  return queries[Math.floor(Math.random() * queries.length)];
}
