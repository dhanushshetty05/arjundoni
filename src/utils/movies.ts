export interface Movie {
  id: string;
  name: string;
  language: string;
  year: string;
  director: string;
  posterPath: string;
  status: 'ready' | 'playing';
  adAudioPath: string;
  referenceAudioPath: string;
  ccSrtPath: string;
  isLive: boolean;
  ccSrtContent?: string;
  adAudioUrl?: string;
}

export const mockMovies: Movie[] = [];

const LOCAL_STORAGE_KEY = 'filmadcc_movies_db_v2';

// Safely get all movies from localStorage, with fallback to default mockMovies
export function getStoredMovies(): Movie[] {
  if (typeof window === 'undefined') {
    return mockMovies;
  }
  
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      // Initialize with defaults if empty
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockMovies));
      return mockMovies;
    }
    return JSON.parse(raw) as Movie[];
  } catch (e) {
    console.error('Error reading localStorage movies:', e);
    return mockMovies;
  }
}

// Save movies array to localStorage
export function saveStoredMovies(movies: Movie[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(movies));
  } catch (e) {
    console.error('Error writing localStorage movies:', e);
  }
}

// Add a new movie
export function addStoredMovie(movie: Movie): void {
  const current = getStoredMovies();
  current.push(movie);
  saveStoredMovies(current);
}

// Update an existing movie
export function updateStoredMovie(movie: Movie): void {
  const current = getStoredMovies();
  const index = current.findIndex(m => m.id === movie.id);
  if (index !== -1) {
    current[index] = movie;
    saveStoredMovies(current);
  }
}

// Delete a movie by ID
export function deleteStoredMovie(id: string): void {
  const current = getStoredMovies();
  const filtered = current.filter(m => m.id !== id);
  saveStoredMovies(filtered);
}

