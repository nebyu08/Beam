'use client';

import React, { useMemo, useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft, Search, X } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  onBackToGlobe: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

function Cover({ book }: { book: GeoBook }) {
  const src = book.cover || book.cover_url;
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col justify-between bg-[#141416] p-3 text-left">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          {book.genre}
        </span>
        <span className="text-sm font-semibold leading-snug text-white line-clamp-5">
          {book.title}
        </span>
        <span className="text-[11px] text-zinc-300 line-clamp-2">{book.author}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth < 24 || image.naturalHeight < 24) setFailed(true);
      }}
      className="h-full w-full object-cover"
    />
  );
}

export default function CountryView({
  country,
  onBackToGlobe,
  onSelectBook,
}: CountryViewProps) {
  const [query, setQuery] = useState('');

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return country.books;
    return country.books.filter((book) => {
      const hay = `${book.title} ${book.author} ${book.genre} ${(book.genres || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [country.books, query]);

  const pickRandom = () => {
    const pool = visibleBooks.length > 0 ? visibleBooks : country.books;
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    onSelectBook?.(chosen);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col">
      <div className="relative h-[26vh] min-h-[108px] shrink-0">
        <button
          type="button"
          onClick={onBackToGlobe}
          className="absolute inset-0 cursor-pointer"
          aria-label={`Back to the globe from ${country.name}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>

      <section
        aria-label={`${country.name} books`}
        className="shelf-rise flex min-h-0 flex-1 flex-col border-t border-white/15 bg-[#09090b] shadow-[0_-28px_50px_-24px_rgba(0,0,0,0.9)]"
      >
        <div className="flex flex-col gap-4 px-5 pb-4 pt-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-[1.7rem] font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                <span className="mr-2 align-middle">{country.flag}</span>
                {country.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-[15px]">
                {country.tagline}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-zinc-300">
                {country.books.length} {country.books.length === 1 ? 'book' : 'books'}
              </p>
              <button
                type="button"
                onClick={pickRandom}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Surprise me
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search books from {country.name}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && query) {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuery('');
                  }
                }}
                placeholder={`Search ${country.name}`}
                className="w-full rounded-xl border border-white/15 bg-black py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-500 focus-visible:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 sm:px-8">
          {visibleBooks.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-16">
              <p className="text-base text-zinc-200">No books match that search.</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleBooks.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => onSelectBook?.(book)}
                    className="group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-zinc-900 shadow-[0_18px_28px_-16px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                      <Cover book={book} />
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/50 to-transparent" />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-snug text-white line-clamp-2">
                      {book.title}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-zinc-300 line-clamp-1">
                      {book.author}
                    </p>
                    {yearLabel(book.year) && (
                      <p className="mt-1 font-mono text-[11px] text-zinc-400">
                        {yearLabel(book.year)}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export function BackToGlobeButton({
  onClick,
}: {
  onClick: () => void;
}) {
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
