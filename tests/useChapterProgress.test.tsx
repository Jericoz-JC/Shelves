import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChapterProgress } from "../src/hooks/useChapterProgress";
import { FakeRendition } from "./tooling/fakeRendition";

function createBook(boundaries: Record<string, number>) {
  return {
    locations: {
      percentageFromCfi: (cfi: string) => boundaries[cfi] ?? 0,
    },
    spine: {
      spineItems: [{ cfiBase: "cfi-0" }, { cfiBase: "cfi-1" }, { cfiBase: "cfi-2" }],
    },
  };
}

describe("useChapterProgress", () => {
  it("uses rendered page precision inside chapter boundaries", () => {
    const rendition = new FakeRendition();
    const book = createBook({ "cfi-0": 0, "cfi-1": 1, "cfi-2": 1 });
    const chapters = [{
      id: "chapter-1",
      label: "Intro",
      href: "intro.xhtml",
      spineIndex: 0,
      cfiBase: "cfi-0",
    }];

    const { result } = renderHook(() =>
      useChapterProgress(book as never, rendition as never, chapters)
    );

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "same-bucket",
          index: 0,
          percentage: 0.75,
          displayed: { page: 3, total: 4 },
        },
      });
    });

    expect(result.current.chapterProgress).toBeCloseTo(0.75, 5);

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "same-bucket",
          index: 0,
          percentage: 0.75,
          displayed: { page: 4, total: 4 },
        },
      });
    });

    expect(result.current.chapterProgress).toBeCloseTo(1, 5);
  });

  it("normalizes chapter progress across chapter boundary percentages", () => {
    const rendition = new FakeRendition();
    const book = createBook({ "cfi-0": 0.2, "cfi-1": 0.8, "cfi-2": 1 });
    const chapters = [
      {
        id: "chapter-1",
        label: "Middle",
        href: "middle.xhtml",
        spineIndex: 0,
        cfiBase: "cfi-0",
      },
      {
        id: "chapter-2",
        label: "End",
        href: "end.xhtml",
        spineIndex: 1,
        cfiBase: "cfi-1",
      },
    ];

    const { result } = renderHook(() =>
      useChapterProgress(book as never, rendition as never, chapters)
    );

    act(() => {
      rendition.emitRelocated({
        start: {
          cfi: "mid-cfi",
          index: 0,
          percentage: 0.5,
          displayed: { page: 3, total: 4 },
        },
      });
    });

    expect(result.current.chapterProgress).toBeCloseTo(0.75, 5);
  });
});
