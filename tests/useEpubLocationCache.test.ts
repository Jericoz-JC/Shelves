import { describe, expect, it } from "vitest";
import { isLocationCacheCompatible } from "../src/hooks/useEpub";

describe("useEpub location cache compatibility", () => {
  it("rejects legacy cache records without metadata", () => {
    expect(isLocationCacheCompatible(undefined, 128)).toBe(false);
    expect(
      isLocationCacheCompatible({
        locationVersion: undefined,
        locationBreak: undefined,
      }, 128)
    ).toBe(false);
  });

  it("rejects cache generated with a different break size", () => {
    expect(
      isLocationCacheCompatible({
        locationVersion: 2,
        locationBreak: 256,
      }, 128)
    ).toBe(false);
  });

  it("accepts only matching cache version and break", () => {
    expect(
      isLocationCacheCompatible({
        locationVersion: 2,
        locationBreak: 128,
      }, 128)
    ).toBe(true);
  });
});
