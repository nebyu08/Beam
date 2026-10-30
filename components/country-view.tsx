'use client';

import React, { useState } from 'react';
import { GeoBook, GeoCountry } from '@/lib/geo-types';
import { ArrowLeft } from 'lucide-react';
import CoverField from '@/components/cover-field';

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

export default function CountryView({ country, onSelectBook }: CountryViewProps) {
  const books = country.books;
  const [activeBook, setActiveBook] = useState<GeoBook | null>(null);
  const [fieldReady, setFieldReady] = useState(true);
  const year = activeBook ? yearLabel(activeBook.year) : '';

  return (
    <div className="absolute inset-0 z-20 bg-[#050506] text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-sm text-white sm:px-10">No books for this country yet.</p>
      ) : fieldReady ? (
        <CoverField
          books={books}
          seed={`${country.id}:${country.name}`}
          onSelect={onSelectBook}
          onActiveChange={setActiveBook}
          onUnavailable={() => setFieldReady(false)}
        />
      ) : (
        <ul className="grid h-full content-center gap-4 overflow-y-auto px-6 py-24 sm:grid-cols-3 sm:px-10">
          {books.map((book) => (
            <li key={book.id}>
              <button
                type="button"
                onClick={() => onSelectBook?.(book)}
                className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span className="block text-base font-semibold">{book.title}</span>
                <span className="mt-1 block text-sm text-white/80">{book.author}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
        <div className="bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16 sm:px-8 sm:pb-7">
          <div className="grid max-w-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
            <div
              className={`col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none ${
                activeBook ? 'opacity-0' : 'opacity-100'
              }`}
              aria-hidden={!!activeBook}
            >
              <h1 className="text-balance text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                <span className="mr-2">{country.flag}</span>
                {country.name}
              </h1>
            </div>
            <div
              className={`col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none ${
                activeBook ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!activeBook}
            >
              {activeBook && (
                <>
                  <p className="text-balance text-xl font-semibold leading-tight tracking-[-0.03em] sm:text-2xl">
                    {activeBook.title}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-white sm:text-base">
                    {activeBook.author}
                    {year ? `, ${year}` : ''}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
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
