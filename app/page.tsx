'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { useGeoStore } from '@/lib/geo-store';
import { Book } from '@/lib/types';
import EarthGlobe from '@/components/earth-globe';
import BookSphere from '@/components/book-sphere';
import BookDetailsModal from '@/components/book-details-modal';
import LoadingScreen from '@/components/loading-screen';

export default function Home() {
  const {
    books,
    setBooks,
    selectedBook,
    setSelectedBook,
    selectRandomBook,
  } = useBookStore();

  const {
    countries,
    activeCountry,
    hoveredCountry,
    appMode,
    enterCountry,
    exitToGlobe,
    setHoveredCountry,
    selectRandomCountry,
  } = useGeoStore();

  const [activeModal, setActiveModal] = useState<'details' | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Preload initial batch of covers for smooth entrance
  useEffect(() => {
    if (books.length === 0) return;
    const initialCovers = books
      .slice(0, 24)
      .map((b) => b.cover || b.cover_url)
      .filter(Boolean) as string[];

    if (initialCovers.length === 0) {
      setIsReady(true);
      return;
    }

    let loaded = 0;
    initialCovers.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= Math.min(8, initialCovers.length)) {
          setIsReady(true);
        }
      };
    });
  }, [books]);

  // Sync books from /data/books.json when updated
  useEffect(() => {
    async function syncBooks() {
      try {
        const res = await fetch('/data/books.json');
        if (res.ok) {
          const data: Book[] = await res.json();
          if (data && data.length > books.length) {
            setBooks(data);
          }
        }
      } catch (e) {
        // use default preloaded books
      }
    }
    syncBooks();
  }, [books.length, setBooks]);

  const handleCloseDock = useCallback(() => {
    setActiveModal(null);
    setSelectedBook(null);
  }, [setSelectedBook]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        if (appMode === 'globe') {
          e.preventDefault();
          selectRandomCountry();
        } else if (appMode === 'country') {
          e.preventDefault();
          if (activeCountry && activeCountry.books.length > 0) {
            const chosen =
              activeCountry.books[Math.floor(Math.random() * activeCountry.books.length)];
            setSelectedBook(chosen);
            setActiveModal('details');
          }
        }
      } else if (e.key === 'Escape') {
        if (activeModal) {
          handleCloseDock();
        } else if (appMode === 'country') {
          exitToGlobe();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeModal,
    appMode,
    activeCountry,
    handleCloseDock,
    selectRandomCountry,
    setSelectedBook,
    exitToGlobe,
  ]);

  const handleSelectBook = useCallback(
    (book: Book) => {
      setSelectedBook(book);
      setActiveModal('details');
    },
    [setSelectedBook]
  );

  const handleLoadingFinished = useCallback(() => {
    // Finished loading screen
  }, []);

  const isDetailsDockOpen = activeModal === 'details' && !!selectedBook;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-zinc-100 select-none">
      {appMode === 'country' && activeCountry ? (
        /* The Country's Books crawling over screen with living wave heartbeat */
        <BookSphere
          books={activeCountry.books}
          activeCountry={activeCountry}
          onSelectBook={handleSelectBook}
          isDockOpen={isDetailsDockOpen}
          onCloseDock={handleCloseDock}
          onBackToGlobe={exitToGlobe}
        />
      ) : (
        /* 3D Monochrome Black & White Earth Globe */
        <EarthGlobe
          countries={countries}
          onSelectCountry={enterCountry}
          hoveredCountry={hoveredCountry}
          onHoverCountry={setHoveredCountry}
        />
      )}

      {/* Top-Left Sliding Book Detail Modal with Full Cover Background */}
      <BookDetailsModal
        isOpen={isDetailsDockOpen}
        book={selectedBook}
        onClose={handleCloseDock}
      />

      {/* Intro Loading Screen */}
      <LoadingScreen isReady={isReady} onFinished={handleLoadingFinished} />
    </main>
  );
}
