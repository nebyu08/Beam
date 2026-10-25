'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GeoCountry, GeoBook } from '@/lib/geo-types';
import BookDetailsModal from '@/components/book-details-modal';
import {
  ArrowLeft,
  Sparkles,
  Star,
  BookOpen,
  Calendar,
  Layers,
  MapPin,
  Compass,
} from 'lucide-react';

interface CountryViewProps {
  country: GeoCountry;
  onBackToGlobe: () => void;
  onSelectBook?: (book: GeoBook) => void;
}

export default function CountryView({
  country,
  onBackToGlobe,
  onSelectBook,
}: CountryViewProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<string>('All');
  const [selectedBook, setSelectedBook] = useState<GeoBook | null>(null);
  const [hoveredBookId, setHoveredBookId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Author list with counts
  const authorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of country.books) {
      map.set(b.author, (map.get(b.author) || 0) + 1);
    }
    return map;
  }, [country.books]);

  // Filtered books based on author selection
  const visibleBooks = useMemo(() => {
    if (selectedAuthor === 'All') return country.books;
    return country.books.filter((b) => b.author === selectedAuthor);
  }, [country.books, selectedAuthor]);

  // Auto-elevate the first or top-rated book when entering the country view
  useEffect(() => {
    if (visibleBooks.length > 0 && !selectedBook) {
      // Find top rated book
      const topBook = [...visibleBooks].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      setHoveredBookId(topBook.id);
    }
  }, [visibleBooks, selectedBook]);

  const handleBookClick = useCallback(
    (book: GeoBook) => {
      setSelectedBook(book);
      setIsDetailsOpen(true);
      if (onSelectBook) onSelectBook(book);
    },
    [onSelectBook]
  );

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedBook(null);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDetailsOpen) {
          handleCloseDetails();
        } else {
          onBackToGlobe();
        }
      } else if (e.code === 'Space' && !isDetailsOpen) {
        e.preventDefault();
        if (visibleBooks.length > 0) {
          const randomIndex = Math.floor(Math.random() * visibleBooks.length);
          const chosen = visibleBooks[randomIndex];
          handleBookClick(chosen);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (!isDetailsOpen && visibleBooks.length > 0) {
          e.preventDefault();
          const currentIndex = visibleBooks.findIndex((b) => b.id === hoveredBookId);
          const nextIndex = (currentIndex + 1) % visibleBooks.length;
          setHoveredBookId(visibleBooks[nextIndex].id);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (!isDetailsOpen && visibleBooks.length > 0) {
          e.preventDefault();
          const currentIndex = visibleBooks.findIndex((b) => b.id === hoveredBookId);
          const prevIndex = (currentIndex - 1 + visibleBooks.length) % visibleBooks.length;
          setHoveredBookId(visibleBooks[prevIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailsOpen, handleCloseDetails, onBackToGlobe, visibleBooks, hoveredBookId, handleBookClick]);

  // Track mouse coordinates over container for organic interactive mountain stack
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen overflow-hidden bg-[#020612] text-zinc-100 flex flex-col select-none"
    >
      {/* Subtle Atmospheric Background Gradient */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(2,6,18,0))]" />

      {/* Top Navigation & National Literary Heritage Bar */}
      <header className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToGlobe}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-indigo-400 text-zinc-300 hover:text-zinc-100 transition-all shadow-lg"
            title="Return to 3D Earth Globe (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold tracking-wide">Earth Globe</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-400 border border-zinc-700">
              Esc
            </kbd>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">{country.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                  {country.name}
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {country.books.length} Canonical Works
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400 inline" />
                <span className="font-medium text-zinc-300">{country.title}</span>
                <span className="text-zinc-600">•</span>
                <span className="line-clamp-1">{country.tagline}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Surprise me inside country */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (visibleBooks.length === 0) return;
              const random = visibleBooks[Math.floor(Math.random() * visibleBooks.length)];
              handleBookClick(random);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Random {country.name} Work</span>
          </button>
        </div>
      </header>

      {/* Author Filter Pills Bar */}
      <div className="relative z-10 px-6 py-2.5 border-b border-zinc-800/50 bg-zinc-950/40 backdrop-blur-md flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mr-2 whitespace-nowrap">
          Seminal Authors:
        </span>
        <button
          onClick={() => setSelectedAuthor('All')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            selectedAuthor === 'All'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800'
          }`}
        >
          All Works ({country.books.length})
        </button>

        {country.authors.map((author) => {
          const count = authorCounts.get(author) || 0;
          return (
            <button
              key={author}
              onClick={() => setSelectedAuthor(author)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedAuthor === author
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800'
              }`}
            >
              <span>{author}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedAuthor === author
                      ? 'bg-indigo-800 text-indigo-200'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mountain-Stack Books Grid Showcase */}
      <main className="flex-1 overflow-y-auto px-6 py-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {visibleBooks.map((book, idx) => {
              const isHovered = hoveredBookId === book.id;
              const isSelected = selectedBook?.id === book.id;
              const coverSrc = book.cover || book.cover_url;

              return (
                <div
                  key={book.id || idx}
                  onMouseEnter={() => setHoveredBookId(book.id)}
                  onClick={() => handleBookClick(book)}
                  className={`group relative flex flex-col cursor-pointer transition-all duration-300 ease-out transform ${
                    isHovered
                      ? '-translate-y-3 scale-105 z-30'
                      : 'hover:-translate-y-2 hover:scale-[1.02] z-10'
                  }`}
                >
                  {/* Book 3D Mountain Elevation Card */}
                  <div
                    className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl ${
                      isHovered
                        ? 'ring-2 ring-indigo-400 shadow-[0_20px_50px_rgba(99,102,241,0.35)]'
                        : 'border border-zinc-800/80 shadow-black/80'
                    }`}
                  >
                    {/* Book Cover Image */}
                    {coverSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverSrc}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-95 group-hover:brightness-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                        <BookOpen className="w-8 h-8 text-zinc-600 mb-2" />
                        <span className="text-xs font-semibold text-zinc-300 line-clamp-3">
                          {book.title}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay for rating & meta */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-3">
                      {/* Top badges: Year & Rating */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10">
                          {book.year > 0 ? book.year : `${Math.abs(book.year)} BCE`}
                        </span>

                        {book.rating && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{book.rating}%</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Info on Cover */}
                      <div className="transform transition-transform duration-200">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 mb-1">
                          {book.genre}
                        </span>
                        <h3 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-tight drop-shadow-md">
                          {book.title}
                        </h3>
                        <p className="text-[11px] text-zinc-300 line-clamp-1 mt-0.5">
                          {book.author}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Below card subtitle / city if present */}
                  <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-zinc-400">
                    {book.city && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-light">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        {book.city}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-indigo-400 group-hover:underline">
                      Explore →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookOpen className="w-12 h-12 text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">
                No works found for this author filter
              </h3>
              <button
                onClick={() => setSelectedAuthor('All')}
                className="mt-3 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
              >
                Reset to All Works
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Top-Left Sliding Book Detail Modal with Full Cover Background */}
      <BookDetailsModal
        isOpen={isDetailsOpen && !!selectedBook}
        book={selectedBook}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
