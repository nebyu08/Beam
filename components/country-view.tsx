'use client';

import React, { useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft } from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  onBackToGlobe?: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

function jacketHue(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}

function Jacket({ book }: { book: GeoBook }) {
  const hue = jacketHue(book.title);
  return (
    <div
      className="flex h-full w-full flex-col justify-between p-4 text-left"
      style={{
        background: `linear-gradient(165deg, hsl(${hue} 32% 24%) 0%, hsl(${hue} 22% 9%) 72%)`,
      }}
    >
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/70">
        {book.genre || 'Literature'}
      </span>
      <span className="text-[15px] font-semibold leading-snug text-white">{book.title}</span>
      <span className="text-xs leading-snug text-white/80">{book.author}</span>
    </div>
  );
}

function Poster({ book }: { book: GeoBook }) {
  const src = book.cover || book.cover_url;
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Jacket book={book} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth < 24 || image.naturalHeight < 24) setFailed(true);
      }}
    />
  );
}

function gridClass(count: number) {
  if (count <= 1) return 'max-w-[220px] grid-cols-1';
  if (count <= 3) return 'max-w-3xl grid-cols-2 sm:grid-cols-3';
  if (count <= 6) return 'max-w-4xl grid-cols-2 sm:grid-cols-3';
  if (count <= 10) return 'max-w-5xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return 'max-w-6xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
}

export default function CountryView({ country, onSelectBook }: CountryViewProps) {
  const books = country.books;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#070708] text-white">
      <header className="flex flex-col gap-2 px-5 pb-4 pt-[4.6rem] sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-8 sm:pb-5 sm:pl-[13.5rem] sm:pt-6">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold tracking-[-0.03em] sm:text-3xl">
            <span className="mr-2">{country.flag}</span>
            {country.name}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-300 line-clamp-2">
            {country.tagline}
          </p>
        </div>
        <p className="text-sm text-zinc-300 sm:shrink-0">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 sm:px-8">
        {books.length === 0 ? (
          <p className="pt-16 text-sm text-zinc-300">No books for this country yet.</p>
        ) : (
          <ul className={`mx-auto grid gap-x-5 gap-y-8 ${gridClass(books.length)}`}>
            {books.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => onSelectBook?.(book)}
                  className="group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-[12px] bg-[#141418] shadow-[0_18px_34px_-20px_rgba(0,0,0,0.9)] transition duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_26px_40px_-18px_rgba(0,0,0,0.95)]">
                    <Poster book={book} />
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug text-white line-clamp-2">
                    {book.title}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-zinc-300 line-clamp-1">{book.author}</p>
                  {yearLabel(book.year) && (
                    <p className="mt-1 font-mono text-[11px] text-zinc-400">{yearLabel(book.year)}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
