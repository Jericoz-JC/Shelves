import { describe, expect, it } from "vitest";
import { dedupeFolloweeIds, isSelfFollow } from "../convex/lib/follows";

describe("follow helpers", () => {
  it("detects self-follow attempts deterministically", () => {
    expect(isSelfFollow("user_1", "user_1")).toBe(true);
    expect(isSelfFollow("user_1", "user_2")).toBe(false);
  });

  it("deduplicates followee ids while preserving insertion order", () => {
    expect(dedupeFolloweeIds(["u2", "u1", "u2", "u3", "u1"])).toEqual([
      "u2",
      "u1",
      "u3",
    ]);
  });
});
