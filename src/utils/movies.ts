import { db } from '@/utils/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

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
  referenceAudioUrl?: string;
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

// Add a new movie to local storage
export function addStoredMovie(movie: Movie): void {
  const current = getStoredMovies();
  current.push(movie);
  saveStoredMovies(current);
}

// Update an existing movie in local storage
export function updateStoredMovie(movie: Movie): void {
  const current = getStoredMovies();
  const index = current.findIndex(m => m.id === movie.id);
  if (index !== -1) {
    current[index] = movie;
    saveStoredMovies(current);
  }
}

// Delete a movie by ID from local storage
export function deleteStoredMovie(id: string): void {
  const current = getStoredMovies();
  const filtered = current.filter(m => m.id !== id);
  saveStoredMovies(filtered);
}

// --- Firestore Cloud Helpers ---

export async function fetchMoviesFromCloud(): Promise<Movie[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'movies'));
    const movies: Movie[] = [];
    querySnapshot.forEach((doc) => {
      movies.push(doc.data() as Movie);
    });
    return movies;
  } catch (e) {
    console.error('Error fetching movies from Firestore:', e);
    return [];
  }
}

export async function addMovieToCloud(movie: Movie): Promise<void> {
  try {
    await setDoc(doc(db, 'movies', movie.id), movie);
  } catch (e) {
    console.error('Error adding movie to Firestore:', e);
    throw e;
  }
}

export async function deleteMovieFromCloud(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'movies', id));
  } catch (e) {
    console.error('Error deleting movie from Firestore:', e);
    throw e;
  }
}

