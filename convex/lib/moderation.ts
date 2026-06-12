/**
 * Rudimentary content filter (issue #23, phase 1).
 *
 * Scope: user-authored text (posts, replies, profile fields). Book quotes
 * (highlightText) are deliberately exempt — published prose legitimately
 * contains profanity.
 *
 * Matching is word-boundary based after normalization (lowercasing, common
 * leetspeak substitutions, separator stripping) to limit false positives;
 * a small set of severe terms is also checked as substrings of the collapsed
 * text to catch spacing evasions. LLM-assisted scoring is phase 2.
 */

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

// Word-boundary matches after normalization.
const BLOCKED_WORDS = new Set([
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "bastard",
  "douchebag",
  "wanker",
]);

// Severe slurs: matched as substrings of the collapsed text so separator
// tricks ("n i g g e r") cannot evade them.
const BLOCKED_SUBSTRINGS = [
  "nigger",
  "nigga",
  "faggot",
  "kike",
  "spic",
  "chink",
  "wetback",
  "tranny",
  "retard",
];

export class ModerationError extends Error {
  constructor(field: string) {
    super(`${field} contains language that is not allowed on Shelves.`);
    this.name = "ModerationError";
  }
}

export function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0134570@$!]/g, (ch) => LEET_MAP[ch] ?? ch);
}

/** Returns the first blocked term found, or null when the text is clean. */
export function findBlockedTerm(text: string): string | null {
  const normalized = normalizeForModeration(text);

  const tokens = normalized.split(/[^a-z]+/);
  for (const token of tokens) {
    if (token && BLOCKED_WORDS.has(token)) return token;
  }

  const collapsed = normalized.replace(/[^a-z]/g, "");
  for (const term of BLOCKED_SUBSTRINGS) {
    if (collapsed.includes(term)) return term;
  }

  return null;
}

export function assertCleanContent(field: string, text: string | undefined): void {
  if (text === undefined) return;
  if (findBlockedTerm(text) !== null) {
    throw new ModerationError(field);
  }
}
