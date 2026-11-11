'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { useGeoStore } from '@/lib/geo-store';
import { Book } from '@/lib/types';
import { Waves } from 'lucide-react';
import EarthGlobe from '@/components/earth-globe';
import CountryView, { BackToGlobeButton } from '@/components/country-view';
import WaveView from '@/components/wave-view';
import BookDetailsModal, { PopOrigin } from '@/components/book-details-modal';
import LoadingScreen from '@/components/loading-screen';
import { GeoBook } from '@/lib/geo-types';

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
    enterWave,
    exitToGlobe,
    setHoveredCountry,
    selectRandomCountry,
  } = useGeoStore();

  const [activeModal, setActiveModal] = useState<'details' | null>(null);
  const [popOrigin, setPopOrigin] = useState<PopOrigin | null>(null);
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
    setPopOrigin(null);
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
        } else if (appMode === 'wave') {
          e.preventDefault();
          const pool = countries.flatMap((country) => country.books);
          if (pool.length > 0) {
            const chosen = pool[Math.floor(Math.random() * pool.length)];
            setSelectedBook(chosen);
            setActiveModal('details');
          }
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (activeModal) {
          e.preventDefault();
          handleCloseDock();
        } else if (appMode === 'country' || appMode === 'wave') {
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
    countries,
    handleCloseDock,
    selectRandomCountry,
    setSelectedBook,
    exitToGlobe,
  ]);

  const handleSelectBook = useCallback(
    (book: Book, origin?: PopOrigin) => {
      setSelectedBook(book);
      setPopOrigin(origin ?? null);
      setActiveModal('details');
    },
    [setSelectedBook]
  );

  const handleBackToGlobe = useCallback(() => {
    handleCloseDock();
    exitToGlobe();
  }, [exitToGlobe, handleCloseDock]);

  const isDetailsDockOpen = activeModal === 'details' && !!selectedBook;
  const countryOpen = appMode === 'country' && !!activeCountry;
  const waveOpen = appMode === 'wave';
  const overlayOpen = countryOpen || waveOpen;
  const detailCountry =
    appMode === 'country'
      ? activeCountry?.name
      : selectedBook && 'country' in selectedBook
        ? (selectedBook as GeoBook).country
        : undefined;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-zinc-100 select-none">
      <EarthGlobe
        countries={countries}
        onSelectCountry={enterCountry}
        hoveredCountry={hoveredCountry}
        onHoverCountry={setHoveredCountry}
        interactive={!overlayOpen}
      />

      {introDismissed && appMode === 'globe' && (
        <button
          type="button"
          onClick={enterWave}
          className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98] sm:left-6 sm:top-5"
        >
          <Waves className="h-4 w-4" aria-hidden="true" />
          All books
        </button>
      )}

      {countryOpen && activeCountry && (
        <>
          <BackToGlobeButton onClick={handleBackToGlobe} />
          <CountryView
            key={activeCountry.id}
            country={activeCountry}
            keysActive={!isDetailsDockOpen}
            onBackToGlobe={handleBackToGlobe}
            onSelectBook={handleSelectBook}
          />
        </>
      )}

      {waveOpen && (
        <>
          <BackToGlobeButton onClick={handleBackToGlobe} />
          <WaveView keysActive={!isDetailsDockOpen} onSelectBook={handleSelectBook} />
        </>
      )}

      <BookDetailsModal
        isOpen={isDetailsDockOpen}
        book={selectedBook}
        countryName={detailCountry}
        origin={popOrigin}
        onClose={handleCloseDock}
        onBackToGlobe={handleBackToGlobe}
        clearOfBar={overlayOpen}
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
