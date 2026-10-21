'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBookStore } from '@/lib/book-store';
import { Book } from '@/lib/types';
import BookSphere from '@/components/book-sphere';
import BookHeader from '@/components/book-header';
import BookOverlay from '@/components/book-overlay';
import FooterBar from '@/components/footer-bar';
import BookDetailsModal from '@/components/book-details-modal';
import BookListModal from '@/components/book-list-modal';
import AboutModal from '@/components/about-modal';

export default function Home() {
  const {
    books,
    setBooks,
    focusedBook,
    setFocusedBook,
    selectedBook,
    setSelectedBook,
    selectRandomBook,
    filteredBooks,
  } = useBookStore();

  const [activeModal, setActiveModal] = useState<'about' | 'list' | 'details' | null>(null);

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
        e.preventDefault();
        selectRandomBook();
      } else if (e.key === 'Escape') {
        setActiveModal(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredBooks.length === 0) return;
        const currentIndex = filteredBooks.findIndex((b) => b.id === focusedBook?.id);
        const nextIndex = (currentIndex + 1) % filteredBooks.length;
        setFocusedBook(filteredBooks[nextIndex]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredBooks.length === 0) return;
        const currentIndex = filteredBooks.findIndex((b) => b.id === focusedBook?.id);
        const prevIndex = (currentIndex - 1 + filteredBooks.length) % filteredBooks.length;
        setFocusedBook(filteredBooks[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredBooks, focusedBook, selectRandomBook, setFocusedBook]);

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, [setSelectedBook]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#060608] text-zinc-100">
      {/* Interactive 3D Book Sphere Canvas */}
      <BookSphere onSelectBook={handleSelectBook} />

      {/* Top Header & Filters */}
      <BookHeader
        onOpenAbout={() => setActiveModal('about')}
        onOpenList={() => setActiveModal('list')}
      />

      {/* Main Focus Overlay (Title, Author, Rating Dial, Actions) */}
      <BookOverlay
        onOpenDetails={(book) => {
          setSelectedBook(book);
          setActiveModal('details');
        }}
      />

      {/* Bottom Hint Bar */}
      <FooterBar />

      {/* Modals */}
      <BookDetailsModal
        isOpen={activeModal === 'details'}
        book={selectedBook || focusedBook}
        onClose={() => setActiveModal(null)}
      />

      <BookListModal
        isOpen={activeModal === 'list'}
        onClose={() => setActiveModal(null)}
        onSelectBook={handleSelectBook}
      />

      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />
    </main>
  );
}
