/**
 * Server-side content limits for Chronicles. The UI enforces the same caps,
 * but direct API calls must not be able to bypass them.
 */

export const CHRONICLE_TEXT_MAX = 500;
export const HIGHLIGHT_TEXT_MAX = 2000;
export const BOOK_TITLE_MAX = 300;

export class ContentLimitError extends Error {
  constructor(field: string, max: number, actual: number) {
    super(`${field} exceeds the maximum length of ${max} characters (got ${actual}).`);
    this.name = "ContentLimitError";
  }
}

export function assertWithinLimit(
  field: string,
  value: string | undefined,
  max: number
): void {
  if (value !== undefined && value.length > max) {
    throw new ContentLimitError(field, max, value.length);
  }
}

export function assertChronicleContent(args: {
  text: string;
  highlightText?: string;
  bookTitle?: string;
}): void {
  assertWithinLimit("text", args.text, CHRONICLE_TEXT_MAX);
  assertWithinLimit("highlightText", args.highlightText, HIGHLIGHT_TEXT_MAX);
  assertWithinLimit("bookTitle", args.bookTitle, BOOK_TITLE_MAX);
}
