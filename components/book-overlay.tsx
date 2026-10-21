'use client';

import React from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';
import { ExternalLink, BookMarked, Sparkles } from 'lucide-react';

interface BookOverlayProps {
  onOpenDetails: (book: Book) => void;
}

export default function BookOverlay({ onOpenDetails }: BookOverlayProps) {
  const { focusedBook, setSelectedBook } = useBookStore();

  if (!focusedBook) return null;

  const rating = focusedBook.rating || 85;
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rating / 100) * circumference;

  return (
    <>
      {/* Top subtle vignette gradient so typography is crystal clear */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#060608]/90 via-[#060608]/60 to-transparent pointer-events-none z-10" />

      <div className="absolute top-16 left-0 right-0 z-20 flex flex-col items-center pointer-events-none px-4 select-none">
        <div className="max-w-3xl w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Author & Year Tagline */}
        <p className="text-xs sm:text-sm font-medium text-zinc-400 tracking-wide mb-1 flex items-center gap-2 drop-shadow">
          <span>{focusedBook.author}</span>
          {focusedBook.year > 0 && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 font-mono">({focusedBook.year})</span>
            </>
          )}
        </p>

        {/* Book Title */}
        <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2.5 text-balance drop-shadow-md px-4">
          {focusedBook.title}
        </h2>

        {/* Metadata Row: Rating Dial + Genre Badges + Read Action */}
        <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
          {/* Circular Rating Score */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-lg"
            title={`${rating}% Community Rating`}
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 28 28">
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-zinc-800"
                  fill="transparent"
                />
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-emerald-400 transition-all duration-500"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[9px] font-mono font-bold text-zinc-200">
                {rating}
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Rating
            </span>
          </div>

          {/* Primary Genre Badge */}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 backdrop-blur-md shadow-md">
            {focusedBook.genre}
          </span>

          {/* Secondary Genres if available */}
          {focusedBook.genres &&
            focusedBook.genres
              .filter((g) => g !== focusedBook.genre)
              .slice(0, 1)
              .map((g) => (
                <span
                  key={g}
                  className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900/70 text-zinc-400 border border-zinc-800/80 backdrop-blur-md"
                >
                  {g}
                </span>
              ))}

          {/* View Details / Read Button */}
          <button
            onClick={() => {
              setSelectedBook(focusedBook);
              onOpenDetails(focusedBook);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-md active:scale-95"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>

          {/* Open Library Link */}
          {focusedBook.openlibrary_url && (
            <a
              href={focusedBook.openlibrary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors backdrop-blur-md"
              title="Open in Open Library"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
