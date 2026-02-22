import { useEffect, useMemo, useState } from "react";
import type { Book } from "epubjs";

export interface ChapterItem {
  id: string;
  label: string;
  href: string;
  spineIndex: number;
  cfiBase?: string;
}

export interface TocItem {
  id?: string;
  href?: string;
  label?: string;
  subitems?: TocItem[];
}

export interface SpineChapterSource {
  index: number;
  cfiBase: string;
  href?: string;
}

interface ResolvedSection {
  index: number;
  cfiBase?: string;
  href?: string;
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

function resolveSection(
  target: string | number,
  resolver: (value: string | number) => ResolvedSection | null
) {
  if (typeof target === "number") {
    return resolver(target);
  }

  const raw = target;
  const normalized = normalizeHref(target);
  let decoded = normalized;
  try {
    decoded = normalizeHref(decodeURI(target));
  } catch {
    decoded = normalized;
  }
  const encoded = normalizeHref(encodeURI(decoded));

  return (
    resolver(raw) ??
    resolver(normalized) ??
    resolver(decoded) ??
    resolver(encoded) ??
    null
  );
}

export function buildChapterItems(
  tocItems: TocItem[],
  spineItems: SpineChapterSource[],
  resolver: (value: string | number) => ResolvedSection | null
): ChapterItem[] {
  const labelsBySpineIndex = new Map<number, string>();
  const flattened = flattenToc(tocItems);

  flattened.forEach((tocItem) => {
    if (!tocItem.href || labelsBySpineIndex.size === spineItems.length) return;
    const section = resolveSection(tocItem.href, resolver);
    const label = tocItem.label?.trim();
    if (!section || !label || labelsBySpineIndex.has(section.index)) return;
    labelsBySpineIndex.set(section.index, label);
  });

  const uniqueBySpineIndex = new Map<number, SpineChapterSource>();
  spineItems.forEach((spineItem) => {
    if (!uniqueBySpineIndex.has(spineItem.index)) {
      uniqueBySpineIndex.set(spineItem.index, spineItem);
    }
  });

  return [...uniqueBySpineIndex.values()]
    .sort((a, b) => a.index - b.index)
    .map((spineItem) => {
      const sectionByIndex = resolveSection(spineItem.index, resolver);
      const sectionByHref = spineItem.href
        ? resolveSection(spineItem.href, resolver)
        : null;
      const href = sectionByIndex?.href ?? sectionByHref?.href ?? spineItem.href;
      if (!href) return null;

      const spineIndex = spineItem.index;
      const cfiBase = sectionByIndex?.cfiBase ?? spineItem.cfiBase;
      const label = labelsBySpineIndex.get(spineIndex) ?? `Section ${spineIndex + 1}`;
      const id = `${spineIndex}:${normalizeHref(href)}`;

      return {
        id,
        label,
        href,
        spineIndex,
        cfiBase,
      } as ChapterItem;
    })
    .filter((item): item is ChapterItem => Boolean(item));
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

    Promise.all([book.loaded.navigation, book.loaded.spine])
      .then(([navigation, spine]) => {
        if (cancelled) return;

        const tocItems = navigation?.toc ?? [];
        const mapped = buildChapterItems(
          tocItems,
          spine as SpineChapterSource[],
          (value) => {
            const section = book.spine.get(value as string | number);
            if (!section) return null;
            return {
              index: section.index,
              cfiBase: section.cfiBase,
              href: section.href,
            };
          }
        );
        setChapters(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          setChapters([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book]);

  return useMemo(() => chapters, [chapters]);
}
