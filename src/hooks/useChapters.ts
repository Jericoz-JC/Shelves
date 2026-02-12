import { useEffect, useMemo, useState } from "react";
import type { Book } from "epubjs";

export interface ChapterItem {
  id: string;
  label: string;
  href: string;
  spineIndex: number;
  cfiBase?: string;
}

interface TocItem {
  id?: string;
  href?: string;
  label?: string;
  subitems?: TocItem[];
}

function flattenToc(items: TocItem[] = [], acc: TocItem[] = []): TocItem[] {
  items.forEach((item) => {
    acc.push(item);
    if (item.subitems?.length) {
      flattenToc(item.subitems, acc);
    }
  });
  return acc;
}

function normalizeHref(href: string | undefined) {
  if (!href) return "";
  return href.split("#")[0];
}

export function useChapters(book: Book | null) {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);

  useEffect(() => {
    if (!book) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChapters([]);
      return;
    }

    let cancelled = false;

    book.loaded.navigation.then((navigation: { toc?: TocItem[] }) => {
      if (cancelled) return;
      const tocItems = navigation?.toc ?? [];
      const flat = flattenToc(tocItems);
      const mapped = flat
        .map((item, index) => {
          const href = normalizeHref(item.href);
          if (!href) return null;
          const spineItem = book.spine.get(href);
          if (!spineItem) return null;
          return {
            id: item.id ?? `${href}-${index}`,
            label: item.label ?? "Untitled",
            href: item.href ?? href,
            spineIndex: spineItem.index,
            cfiBase: spineItem.cfiBase,
          } as ChapterItem;
        })
        .filter((item): item is ChapterItem => Boolean(item));

      mapped.sort((a, b) => a.spineIndex - b.spineIndex);
      setChapters(mapped);
    });

    return () => {
      cancelled = true;
    };
  }, [book]);

  return useMemo(() => chapters, [chapters]);
}
