'use client';

import React from 'react';
import { Book } from '@/lib/types';
import { ExternalLink, X, BookOpen, Star, ArrowLeft, Globe } from 'lucide-react';

interface BookDetailsModalProps {
  isOpen: boolean;
  book: Book | null;
  countryName?: string;
  onClose: () => void;
  onBackToGlobe?: () => void;
  clearOfBar?: boolean;
}

export default function BookDetailsModal({
  isOpen,
  book,
  countryName,
  onClose,
  onBackToGlobe,
  clearOfBar = false,
}: BookDetailsModalProps) {
  if (!isOpen || !book) return null;

  const coverSrc = book.cover || book.cover_url;
  const rating = book.rating || 0;

  return (
    <>
      {/* Clickable Backdrop Overlay: Clicking anywhere outside instantly turns back to books */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Modal Card */}
      <aside
        aria-label="Book details"
        className={`fixed z-40 max-w-sm sm:max-w-md pointer-events-auto select-none ${
          clearOfBar
            ? 'top-20 left-4 right-4 sm:left-auto sm:right-5 sm:w-[410px]'
            : 'top-4 left-4 w-[calc(100vw-2rem)] sm:w-[410px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-3xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden min-h-[380px] flex flex-col justify-between text-zinc-100">
          {/* Full Cover Image Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-zinc-900">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt=""
                className="w-full h-full object-cover scale-105 filter brightness-90"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
            )}

            {/* Moody filmic gradient scrim so foreground text is crystal-clear */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          </div>

          {/* Top Header Bar: Turn Back Button + Badges + Close */}
          <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-black/30 backdrop-blur-md">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-xs font-medium text-zinc-200 hover:text-white border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Turn back to country books (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {countryName || 'Books'}</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Rating Score Badge */}
              {rating > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 backdrop-blur-md text-zinc-200 border border-white/20 shadow-md">
                  <Star className="w-3 h-3 fill-zinc-300 text-zinc-300" />
                  <span>{rating}%</span>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                title="Close panel (Esc)"
                className="w-7 h-7 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center border border-white/25 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Bottom Content Area: Typography + Short Detail + Actions */}
          <div className="relative z-10 p-5 pt-6 flex flex-col">
            {/* Genre Badge & Year */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900/90 text-zinc-200 border border-zinc-700">
                {book.genre}
              </span>
              {book.year > 0 && (
                <span className="text-zinc-400 font-mono text-[11px]">
                  {book.year}
                </span>
              )}
            </div>

            {/* Author */}
            <p className="text-xs font-medium text-zinc-400 mb-1 drop-shadow-md">
              {book.author}
            </p>

            {/* Book Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-lg mb-2">
              {book.title}
            </h2>

            {/* Description Snippet */}
            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 drop-shadow mb-3 font-light">
              {book.description || `${book.title} by ${book.author}.`}
            </p>

            {/* Theme Badges */}
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {book.genres.slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] text-zinc-300 font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons: Open Library + Back to Books + Return to Globe */}
            <div className="flex items-center gap-2 pt-1">
              {book.openlibrary_url ? (
                <a
                  href={book.openlibrary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shadow-lg active:scale-98"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Online</span>
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              ) : null}

              {/* Turn Back Button */}
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-black/70 hover:bg-black text-zinc-200 hover:text-white text-xs font-semibold border border-white/20 backdrop-blur-md transition-all active:scale-98 cursor-pointer"
              >
                Back
              </button>

              {/* Direct Return to Earth Globe */}
              {onBackToGlobe && (
                <button
                  onClick={() => {
                    onClose();
                    onBackToGlobe();
                  }}
                  className="px-3 py-2 rounded-xl bg-black/70 hover:bg-black text-zinc-300 hover:text-white text-xs font-medium border border-white/20 backdrop-blur-md transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
                  title="Return directly to Earth Globe"
                >
                  <Globe className="w-3 h-3" />
                  <span>To globe</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
