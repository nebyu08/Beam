import { create } from 'zustand';
import { Book } from './types';
import booksData from '../public/data/books.json';

const defaultBooks = booksData as Book[];

interface BookStore {
  books: Book[];
  filteredBooks: Book[];
  focusedBook: Book | null;
  selectedBook: Book | null;
  selectedGenre: string;
  searchQuery: string;
  isHelpOpen: boolean;
  isListOpen: boolean;

  setBooks: (books: Book[]) => void;
  setFocusedBook: (book: Book | null) => void;
  setSelectedBook: (book: Book | null) => void;
  setSelectedGenre: (genre: string) => void;
  setSearchQuery: (query: string) => void;
  toggleHelp: () => void;
  toggleList: () => void;
  selectRandomBook: () => Book | null;
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: defaultBooks,
  filteredBooks: defaultBooks,
  focusedBook: defaultBooks[0] || null,
  selectedBook: null,
  selectedGenre: 'All',
  searchQuery: '',
  isHelpOpen: false,
  isListOpen: false,

  setBooks: (books) => {
    set({
      books,
      filteredBooks: books,
      focusedBook: books[0] || null,
    });
  },

  setFocusedBook: (focusedBook) => set({ focusedBook }),

  setSelectedBook: (selectedBook) => set({ selectedBook }),

  setSelectedGenre: (genre) => {
    const { books, searchQuery } = get();
    const filtered = books.filter((b) => {
      const matchesGenre = genre === 'All' || b.genre === genre || b.genres.includes(genre);
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGenre && matchesSearch;
    });

    set({
      selectedGenre: genre,
      filteredBooks: filtered,
      focusedBook: filtered.length > 0 ? filtered[0] : null,
    });
  },

  setSearchQuery: (query) => {
    const { books, selectedGenre } = get();
    const filtered = books.filter((b) => {
      const matchesGenre =
        selectedGenre === 'All' || b.genre === selectedGenre || b.genres.includes(selectedGenre);
      const matchesSearch =
        !query ||
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase());
      return matchesGenre && matchesSearch;
    });

    set({
      searchQuery: query,
      filteredBooks: filtered,
      focusedBook: filtered.length > 0 ? filtered[0] : null,
    });
  },

  toggleHelp: () => set((state) => ({ isHelpOpen: !state.isHelpOpen })),
  toggleList: () => set((state) => ({ isListOpen: !state.isListOpen })),

  selectRandomBook: () => {
    const { filteredBooks } = get();
    if (filteredBooks.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * filteredBooks.length);
    const chosen = filteredBooks[randomIndex];
    set({ focusedBook: chosen, selectedBook: chosen });
    return chosen;
  },
}));
