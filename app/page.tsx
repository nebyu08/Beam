'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { useGeoStore } from '@/lib/geo-store';
import { Book } from '@/lib/types';
import EarthGlobe from '@/components/earth-globe';
import CountryView, { BackToGlobeButton } from '@/components/country-view';
import BookDetailsModal from '@/components/book-details-modal';
import LoadingScreen from '@/components/loading-screen';

export default function Home() {
  const {
    books,
    setBooks,
    selectedBook,
    setSelectedBook,
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
  const [isIntroReady, setIsIntroReady] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);

  // Trigger intro readiness once topology and initial assets settle
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Sync books from /data/books.json in background if needed
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
      const typing =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';
      if (typing && e.key !== 'Escape') return;

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
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (activeModal) {
          e.preventDefault();
          handleCloseDock();
        } else if (appMode === 'country') {
          e.preventDefault();
          handleCloseDock();
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

  const handleBackToGlobe = useCallback(() => {
    handleCloseDock();
    exitToGlobe();
  }, [exitToGlobe, handleCloseDock]);

  const isDetailsDockOpen = activeModal === 'details' && !!selectedBook;
  const shelfOpen = appMode === 'country' && !!activeCountry;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-zinc-100 select-none">
      <EarthGlobe
        countries={countries}
        onSelectCountry={enterCountry}
        hoveredCountry={hoveredCountry}
        onHoverCountry={setHoveredCountry}
        interactive={!shelfOpen}
      />

      {shelfOpen && activeCountry && (
        <>
          <BackToGlobeButton onClick={handleBackToGlobe} />
          <CountryView
            key={activeCountry.id}
            country={activeCountry}
            onBackToGlobe={handleBackToGlobe}
            onSelectBook={handleSelectBook}
          />
        </>
      )}

      <BookDetailsModal
        isOpen={isDetailsDockOpen}
        book={selectedBook}
        countryName={activeCountry?.name}
        onClose={handleCloseDock}
        onBackToGlobe={handleBackToGlobe}
        clearOfBar={shelfOpen}
      />

      {/* Atmospheric Intro Loading Screen: "theres nothing to read" with animated dots */}
      {!introDismissed && (
        <LoadingScreen
          isReady={isIntroReady}
          onFinished={() => setIntroDismissed(true)}
        />
      )}
    </main>
  );
}
