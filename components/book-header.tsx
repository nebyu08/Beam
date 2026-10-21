'use client';

import React, { useState } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Sparkles, Info, BookOpen, Search, Menu, X, Compass } from 'lucide-react';

interface BookHeaderProps {
  onOpenAbout: () => void;
  onOpenList: () => void;
}

const GENRES = [
  'All',
  'Science Fiction',
  'Fantasy',
  'Classics',
  'Dystopian',
  'Mystery',
  'Thriller',
  'Philosophy',
  'Horror',
  'Romance',
  'Adventure',
];

export default function BookHeader({ onOpenAbout, onOpenList }: BookHeaderProps) {
  const {
    selectedGenre,
    setSelectedGenre,
    selectRandomBook,
    searchQuery,
    setSearchQuery,
    filteredBooks,
  } = useBookStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Discreet corner toggle (100% clean roaming screen) */}
      <div className="absolute top-4 right-5 z-30 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Close menu' : 'Explore library & filters'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 backdrop-blur-md shadow-xl active:scale-95 text-xs font-medium ${
            isOpen
              ? 'bg-zinc-800 text-white border-zinc-700'
              : 'bg-zinc-950/40 hover:bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800/40 hover:border-zinc-700/80'
          }`}
        >
          {isOpen ? (
            <>
              <X className="w-3.5 h-3.5 text-zinc-300" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono text-zinc-300">Menu</span>
            </>
          )}
        </button>
      </div>

      {/* Expandable Navigation & Tools Bar (hidden until clicked) */}
      {isOpen && (
        <header className="absolute top-0 left-0 right-0 z-20 flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/70 pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200 shadow-2xl">
          {/* Brand & Surprise Button grouped inside menu */}
          <div className="flex items-center gap-3 mb-3 md:mb-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
                Nothing to Read
              </h1>
              <p className="text-[9px] text-zinc-500 font-mono">
                {filteredBooks.length} books in infinite orbit
              </p>
            </div>

            {/* Surprise Me button inside the menu */}
            <button
              onClick={() => {
                selectRandomBook();
                setIsOpen(false);
              }}
              title="Pick Random Book (Press Space)"
              className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-100 text-xs font-medium transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Surprise Me</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-emerald-950/70 border border-emerald-800/60 rounded text-[9px] font-mono text-emerald-300">
                SPACE
              </kbd>
            </button>
          </div>

          {/* Genre Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1 p-1 rounded-full bg-zinc-900/90 border border-zinc-800/80 shadow-inner max-w-full overflow-x-auto">
            {GENRES.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          {/* Search & Extra Tools */}
          <div className="flex items-center gap-2 mt-3 md:mt-0">
            {isSearchOpen ? (
              <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1">
                <Search className="w-3 h-3 text-zinc-400 mr-1.5" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles..."
                  className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-32"
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 ml-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                title="Search books"
                className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                onOpenList();
                setIsOpen(false);
              }}
              title="Catalog List View"
              className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                onOpenAbout();
                setIsOpen(false);
              }}
              title="About & Guide"
              className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}
    </>
  );
}
