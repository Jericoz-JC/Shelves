import { describe, expect, it } from "vitest";
import {
  buildHandleCandidates,
  buildUserSearchText,
  deriveHandleSeed,
  isValidHandle,
  normalizeHandleInput,
  sanitizeHandleCandidate,
} from "../convex/lib/userHandles";

describe("user handle helpers", () => {
  it("normalizes and sanitizes handle input", () => {
    expect(normalizeHandleInput("  @@Reader.Name  ")).toBe("reader.name");
    expect(sanitizeHandleCandidate("  @@Reader.Name  ")).toBe("reader_name");
  });

  it("validates handle format and length", () => {
    expect(isValidHandle("reader_12")).toBe(true);
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("reader-name")).toBe(false);
  });

  it("derives a deterministic seed from profile fields", () => {
    const seed = deriveHandleSeed({
      name: "Elena Marquez",
      email: "elena@example.com",
      clerkId: "user_2abc123",
    });
    expect(seed).toBe("elena_marquez");
  });

  it("builds deterministic candidate suffixes", () => {
    expect(buildHandleCandidates("reader").slice(0, 4)).toEqual([
      "reader",
      "reader_2",
      "reader_3",
      "reader_4",
    ]);
  });

  it("falls back to a valid first candidate when seed is too short", () => {
    expect(buildHandleCandidates("ab").slice(0, 3)).toEqual([
      "reader",
      "reader_2",
      "reader_3",
    ]);
  });

  it("avoids double underscores in suffixed candidates after truncation", () => {
    const [first, second] = buildHandleCandidates("aaaaaaaaaaaaaaaaaaaaa_bbb", 3);
    expect(first).toBe("aaaaaaaaaaaaaaaaaaaaa_bb");
    expect(second).toBe("aaaaaaaaaaaaaaaaaaaaa_2");
    expect(second.includes("__")).toBe(false);
  });

  it("builds lowercased searchable text payload", () => {
    const searchText = buildUserSearchText({
      name: "Elena Marquez",
      handle: "elena_reads",
    });
    expect(searchText).toBe("elena marquez elena_reads");
  });
});
