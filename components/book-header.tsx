'use client';

import React, { useState } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Sparkles, Info, BookOpen, Search, ExternalLink } from 'lucide-react';

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

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-md">
          <BookOpen className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-200">
            Nothing to Read
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-tight">
            {filteredBooks.length} books in library
          </p>
        </div>
      </div>

      {/* Center Genre Filter Pills */}
      <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 pointer-events-auto shadow-xl">
        {GENRES.map((genre) => {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Search Input / Toggle */}
        <div className="relative flex items-center">
          {isSearchOpen ? (
            <div className="flex items-center bg-zinc-900/90 border border-zinc-700/80 rounded-full px-3 py-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or author..."
                className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-36 sm:w-48"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-zinc-400 hover:text-zinc-200 ml-1.5 text-xs font-mono"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Search Books"
              className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Randomize / Surprise Me */}
        <button
          onClick={() => selectRandomBook()}
          title="Pick Random Book (Press Space)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all backdrop-blur-md shadow-sm active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Surprise Me</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-emerald-950/60 border border-emerald-800/50 rounded text-[9px] font-mono text-emerald-300">
            SPACE
          </kbd>
        </button>

        {/* Browse List View */}
        <button
          onClick={onOpenList}
          title="Browse All Books"
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Info Modal */}
        <button
          onClick={onOpenAbout}
          title="About & Controls"
          className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
