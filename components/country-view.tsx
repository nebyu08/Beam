'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  keysActive?: boolean;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export default function CountryView({
  country,
  keysActive = true,
  onSelectBook,
}: CountryViewProps) {
  const books = country.books;
  const [failedCovers, setFailedCovers] = useState<Record<number, true>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!keysActive || books.length === 0) return;

    const columnCount = () => {
      const nodes = itemRefs.current.filter((node): node is HTMLButtonElement => node !== null);
      if (nodes.length < 2) return 1;
      const top = nodes[0].getBoundingClientRect().top;
      let count = 1;
      for (let index = 1; index < nodes.length; index += 1) {
        if (Math.abs(nodes[index].getBoundingClientRect().top - top) > 12) break;
        count += 1;
      }
      return count;
    };

    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (
        key !== 'ArrowDown' &&
        key !== 'ArrowUp' &&
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight' &&
        key !== 'Home' &&
        key !== 'End'
      ) {
        return;
      }

      const typing =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';
      if (typing) return;

      const current = activeIndexRef.current;
      const columns = columnCount();
      const next =
        key === 'ArrowRight'
          ? Math.min(books.length - 1, current + 1)
          : key === 'ArrowLeft'
            ? Math.max(0, current - 1)
            : key === 'ArrowDown'
              ? Math.min(books.length - 1, current + columns)
              : key === 'ArrowUp'
                ? Math.max(0, current - columns)
                : key === 'Home'
                  ? 0
                  : books.length - 1;
      if (next === current) return;

      event.preventDefault();
      activeIndexRef.current = next;
      setActiveIndex(next);
      const item = itemRefs.current[next];
      item?.focus();
      item?.scrollIntoView({ block: 'nearest' });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [books.length, keysActive]);

  return (
    <div className="absolute inset-0 z-20 bg-black text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-base text-white sm:px-10">No books for this country yet.</p>
      ) : (
        <section
          aria-label={`Books from ${country.name}. Arrow keys move across the shelf. Enter opens one.`}
          className="absolute inset-x-0 bottom-0 top-20 overflow-y-auto overscroll-contain px-5 pb-[max(4rem,env(safe-area-inset-bottom))] pt-3 sm:top-24 sm:px-8"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col">
            <header className="pb-8">
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                <span className="mr-2">{country.flag}</span>
                {country.name}
              </h1>
              {country.tagline ? (
                <p className="mt-3 max-w-prose text-pretty text-base leading-relaxed text-white/80">
                  {country.tagline}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-white/80">
                {books.length === 1 ? '1 book' : `${books.length} books`}
              </p>
            </header>

            <ol className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-y-10">
              {books.map((book, index) => {
                const coverSrc = book.cover || book.cover_url;
                const coverFailed = !coverSrc || failedCovers[book.id];
                const year = yearLabel(book.year);
                const meta = [year, book.genre].filter(Boolean).join(' · ');

                return (
                  <li key={book.id}>
                    <button
                      ref={(node) => {
                        itemRefs.current[index] = node;
                      }}
                      type="button"
                      data-book-row="true"
                      tabIndex={index === activeIndex ? 0 : -1}
                      onFocus={() => {
                        activeIndexRef.current = index;
                        setActiveIndex(index);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === ' ') event.preventDefault();
                      }}
                      onClick={() => onSelectBook?.(book)}
                      className="group block w-full scroll-mt-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      <span
                        className={`relative block overflow-hidden bg-black ${index < 12 ? 'cover-open' : ''}`}
                        style={index < 12 ? { animationDelay: `${index * 42}ms` } : undefined}
                      >
                        {coverFailed ? (
                          <span className="flex aspect-[2/3] w-full items-end bg-[#141416] p-3">
                            <span className="text-sm font-semibold leading-tight">{book.title}</span>
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt=""
                            loading={index < 8 ? 'eager' : 'lazy'}
                            decoding="async"
                            onError={() =>
                              setFailedCovers((current) =>
                                current[book.id] ? current : { ...current, [book.id]: true }
                              )
                            }
                            className="aspect-[2/3] h-auto w-full object-contain transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045] group-focus-visible:scale-[1.045] group-active:scale-[0.985] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
                          />
                        )}
                        {meta ? (
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-12 text-sm text-white opacity-0 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-opacity">
                            {meta}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 block min-h-[2.6em] text-balance text-sm font-semibold leading-snug line-clamp-2 sm:text-base">
                        {book.title}
                      </span>
                      <span className="mt-1 block truncate text-sm text-white/80">{book.author}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

export function BackToGlobeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-4 top-4 z-[70] inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6 sm:top-5"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to globe
      <kbd className="rounded-md bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700">
        Esc
      </kbd>
    </button>
  );
}
