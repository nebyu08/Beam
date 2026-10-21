export interface Book {
  id: number;
  key: string;
  title: string;
  author: string;
  year: number;
  rating: number; // 0-100
  genre: string;
  genres: string[];
  cover: string;
  cover_url: string;
  cover_id: number;
  openlibrary_url: string;
  edition_count: number;
  tagline?: string;
  description?: string;
}

export type ViewMode = 'sphere' | 'flat';
