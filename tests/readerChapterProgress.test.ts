import { describe, expect, it } from "vitest";
import type { Book } from "epubjs";
import {
  buildChapterItems,
  type ChapterItem,
  type SpineChapterSource,
  type TocItem,
} from "@/hooks/useChapters";
import {
  computeChapterProgressValue,
  isLocationsMapReady,
  resolveChapterIndexFromSpine,
} from "@/hooks/useChapterProgress";

interface TestSection {
  index: number;
  href: string;
  cfiBase: string;
}

function createResolver(sections: TestSection[]) {
  const byIndex = new Map<number, TestSection>();
  const byHref = new Map<string, TestSection>();

  sections.forEach((section) => {
    byIndex.set(section.index, section);
    byHref.set(section.href, section);
    byHref.set(section.href.split("#")[0], section);
  });

  return (value: string | number) => {
    if (typeof value === "number") {
      return byIndex.get(value) ?? null;
    }
    return byHref.get(value) ?? null;
  };
}

describe("reader chapter progress logic", () => {
  it("builds one chapter per spine index and keeps the first toc label per section", () => {
    const toc: TocItem[] = [
      {
        href: "Text/ch1.xhtml",
        label: "Chapter One",
        subitems: [{ href: "Text/ch1.xhtml#part-a", label: "Part A" }],
      },
      { href: "Text/ch2.xhtml", label: "Chapter Two" },
    ];

    const spine: SpineChapterSource[] = [
      { index: 0, href: "Text/ch1.xhtml", cfiBase: "/6/2[ch1]!" },
      { index: 1, href: "Text/ch2.xhtml", cfiBase: "/6/4[ch2]!" },
      { index: 1, href: "Text/ch2.xhtml", cfiBase: "/6/4[ch2]!" },
    ];

    const chapters = buildChapterItems(
      toc,
      spine,
      createResolver([
        { index: 0, href: "Text/ch1.xhtml", cfiBase: "/6/2[ch1]!" },
        { index: 1, href: "Text/ch2.xhtml", cfiBase: "/6/4[ch2]!" },
      ])
    );

    expect(chapters).toHaveLength(2);
    expect(chapters[0].label).toBe("Chapter One");
    expect(chapters[1].label).toBe("Chapter Two");
    expect(chapters.map((chapter) => chapter.spineIndex)).toEqual([0, 1]);
  });

  it("falls back to section labels when toc label is missing", () => {
    const toc: TocItem[] = [{ href: "Text/ch2.xhtml", label: "Chapter Two" }];
    const spine: SpineChapterSource[] = [
      { index: 0, href: "Text/ch1.xhtml", cfiBase: "/6/2[ch1]!" },
      { index: 1, href: "Text/ch2.xhtml", cfiBase: "/6/4[ch2]!" },
    ];

    const chapters = buildChapterItems(
      toc,
      spine,
      createResolver([
        { index: 0, href: "Text/ch1.xhtml", cfiBase: "/6/2[ch1]!" },
        { index: 1, href: "Text/ch2.xhtml", cfiBase: "/6/4[ch2]!" },
      ])
    );

    expect(chapters[0].label).toBe("Section 1");
    expect(chapters[1].label).toBe("Chapter Two");
  });

  it("resolves chapter index by exact spine match and nearest previous fallback", () => {
    const chapters: ChapterItem[] = [
      { id: "1", label: "A", href: "a.xhtml", spineIndex: 1, cfiBase: "/6/2[a]!" },
      { id: "2", label: "B", href: "b.xhtml", spineIndex: 4, cfiBase: "/6/4[b]!" },
      { id: "3", label: "C", href: "c.xhtml", spineIndex: 8, cfiBase: "/6/6[c]!" },
    ];

    expect(resolveChapterIndexFromSpine(4, chapters)).toBe(1);
    expect(resolveChapterIndexFromSpine(6, chapters)).toBe(1);
    expect(resolveChapterIndexFromSpine(0, chapters)).toBe(-1);
  });

  it("computes bounded chapter progress and rejects invalid boundaries", () => {
    expect(computeChapterProgressValue(0.5, 0.4, 0.6)).toBeCloseTo(0.5);
    expect(computeChapterProgressValue(0.3, 0.4, 0.6)).toBe(0);
    expect(computeChapterProgressValue(0.8, 0.4, 0.6)).toBe(1);
    expect(computeChapterProgressValue(0.4, 0.7, 0.6)).toBeNull();
  });

  it("reports locations readiness only when indexed locations are available", () => {
    const readyBook = {
      locations: {
        length: () => 42,
      },
    };
    const emptyBook = {
      locations: {
        length: () => 0,
      },
    };
    const throwingBook = {
      locations: {
        length: () => {
          throw new Error("boom");
        },
      },
    };

    expect(isLocationsMapReady(readyBook as unknown as Book)).toBe(true);
    expect(isLocationsMapReady(emptyBook as unknown as Book)).toBe(false);
    expect(isLocationsMapReady(throwingBook as unknown as Book)).toBe(false);
    expect(isLocationsMapReady(null)).toBe(false);
  });
});
