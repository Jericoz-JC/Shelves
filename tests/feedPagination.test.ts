import { describe, expect, it } from "vitest";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  isAfterCursor,
  selectFeedPage,
} from "../convex/lib/feedPagination";

const doc = (createdAt: number, creationTime = createdAt, extra = {}) => ({
  createdAt,
  _creationTime: creationTime,
  ...extra,
});

describe("feed cursor encoding", () => {
  it("round-trips a cursor", () => {
    const cursor = { t: 1700000000000, ct: 1700000000000.5 };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });

  it("returns null for malformed input", () => {
    expect(decodeFeedCursor(null)).toBeNull();
    expect(decodeFeedCursor("")).toBeNull();
    expect(decodeFeedCursor("not json")).toBeNull();
    expect(decodeFeedCursor('{"t":"nope"}')).toBeNull();
  });
});

describe("isAfterCursor", () => {
  const cursor = { t: 1000, ct: 1000.5 };

  it("accepts strictly older documents", () => {
    expect(isAfterCursor(doc(999), cursor)).toBe(true);
  });

  it("rejects newer documents and the cursor document itself", () => {
    expect(isAfterCursor(doc(1001), cursor)).toBe(false);
    expect(isAfterCursor(doc(1000, 1000.5), cursor)).toBe(false);
  });

  it("breaks same-millisecond ties on _creationTime", () => {
    expect(isAfterCursor(doc(1000, 1000.2), cursor)).toBe(true);
    expect(isAfterCursor(doc(1000, 1000.9), cursor)).toBe(false);
  });
});

describe("selectFeedPage", () => {
  const docsDesc = [doc(50), doc(40), doc(30), doc(20), doc(10)];

  it("fills a page and points the cursor at the last returned item", () => {
    const page = selectFeedPage(docsDesc, () => true, 3, false);
    expect(page.items.map((d) => d.createdAt)).toEqual([50, 40, 30]);
    expect(page.isDone).toBe(false);
    expect(decodeFeedCursor(page.continueCursor)).toEqual({ t: 30, ct: 30 });
  });

  it("resuming from the cursor yields the next disjoint page (no dupes, no gaps)", () => {
    const first = selectFeedPage(docsDesc, () => true, 3, false);
    const cursor = decodeFeedCursor(first.continueCursor)!;
    const remaining = docsDesc.filter((d) => isAfterCursor(d, cursor));
    const second = selectFeedPage(remaining, () => true, 3, true);
    expect(second.items.map((d) => d.createdAt)).toEqual([20, 10]);
    expect(second.isDone).toBe(true);
    const seen = [...first.items, ...second.items].map((d) => d.createdAt);
    expect(new Set(seen).size).toBe(docsDesc.length);
  });

  it("returns a short page with a resume cursor when the scan window caps out", () => {
    const page = selectFeedPage(docsDesc, (d) => d.createdAt === 10, 3, false);
    expect(page.items.map((d) => d.createdAt)).toEqual([10]);
    expect(page.isDone).toBe(false);
    expect(decodeFeedCursor(page.continueCursor)).toEqual({ t: 10, ct: 10 });
  });

  it("marks done when the scan exhausted the index", () => {
    const page = selectFeedPage(docsDesc, (d) => d.createdAt > 30, 10, true);
    expect(page.items.map((d) => d.createdAt)).toEqual([50, 40]);
    expect(page.isDone).toBe(true);
    expect(page.continueCursor).toBeNull();
  });

  it("handles an empty scan window", () => {
    const page = selectFeedPage([], () => true, 5, true);
    expect(page.items).toEqual([]);
    expect(page.isDone).toBe(true);
  });

  it("keeps same-millisecond documents across a page boundary", () => {
    const tied = [doc(100, 100.9), doc(100, 100.5), doc(100, 100.1)];
    const first = selectFeedPage(tied, () => true, 2, false);
    const cursor = decodeFeedCursor(first.continueCursor)!;
    const remaining = tied.filter((d) => isAfterCursor(d, cursor));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]._creationTime).toBe(100.1);
  });
});
