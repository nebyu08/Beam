'use client';

import React, { useMemo, useState } from 'react';
import { GeoBook } from '@/lib/geo-types';
import { useGeoStore } from '@/lib/geo-store';
import WaveField from '@/components/wave-field';

interface WaveViewProps {
  suspended?: boolean;
  spotlightId?: number | null;
  spotlightNonce?: number;
  onSelectBook?: (book: GeoBook) => void;
}

function yearLabel(year: number) {
  if (!year) return '';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export default function WaveView({
  suspended = false,
  spotlightId = null,
  spotlightNonce = 0,
  onSelectBook,
}: WaveViewProps) {
  const countries = useGeoStore((state) => state.countries);
  const books = useMemo(() => countries.flatMap((country) => country.books), [countries]);
  const [activeBook, setActiveBook] = useState<GeoBook | null>(null);
  const [fieldReady, setFieldReady] = useState(true);
  const year = activeBook ? yearLabel(activeBook.year) : '';

  return (
    <div className="absolute inset-0 z-20 bg-[#070708] text-white">
      {books.length === 0 ? (
        <p className="px-6 pt-28 text-sm sm:px-10">No books yet.</p>
      ) : fieldReady ? (
        <WaveField
          books={books}
          seed="all-books"
          variant="world"
          label="Every book. Drag to move, scroll to zoom, use the arrow keys to move between books, and press Enter to open one."
          suspended={suspended}
          spotlightId={spotlightId}
          spotlightNonce={spotlightNonce}
          onSelect={onSelectBook}
          onActiveChange={setActiveBook}
          onUnavailable={() => setFieldReady(false)}
        />
      ) : (
        <p className="max-w-sm px-6 pt-28 text-sm leading-relaxed sm:px-10">
          This view needs WebGL. Go back to the globe and open a country instead.
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
        <div className="bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16 sm:px-8 sm:pb-7">
          <div className="grid max-w-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]" aria-live="polite">
            <div
              className={`col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none ${
                activeBook ? 'opacity-0' : 'opacity-100'
              }`}
              aria-hidden={!!activeBook}
            >
              <p className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                {books.length.toLocaleString('en-US')} books
              </p>
              <p className="mt-1 text-sm text-white/85">Drag to move. Scroll to zoom.</p>
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
                  <p className="mt-1 text-sm leading-snug sm:text-base">
                    {activeBook.author}
                    {year ? `, ${year}` : ''}
                  </p>
                  <p className="mt-0.5 text-sm text-white/85">
                    {activeBook.countryFlag} {activeBook.country}
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
