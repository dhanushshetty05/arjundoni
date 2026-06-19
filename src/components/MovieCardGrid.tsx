'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Movie, updateStoredMovie } from '@/utils/movies';
import { getMovieMedia, saveMovieMedia, deleteMovieMedia } from '@/utils/indexedDB';

interface MovieCardGridProps {
  movies: Movie[];
}

export const MovieCardGrid: React.FC<MovieCardGridProps> = ({ movies }) => {
  const [downloadedMap, setDownloadedMap] = useState<{ [id: string]: boolean }>({});
  const [downloadingMap, setDownloadingMap] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    const checkStatus = async () => {
      const status: { [id: string]: boolean } = {};
      for (const movie of movies) {
        const media = await getMovieMedia(movie.id);
        status[movie.id] = !!(media.adAudioBlob || media.ccSrtContent || media.referenceAudioBlob);
      }
      setDownloadedMap(status);
    };
    checkStatus();
  }, [movies]);

  const handleDownload = async (movie: Movie) => {
    setDownloadingMap(prev => ({ ...prev, [movie.id]: true }));
    try {
      let adAudioBlob: Blob | null = null;
      let referenceAudioBlob: Blob | null = null;
      let srtContent: string | null = null;

      // 1. Download AD Audio if it is not default
      if (movie.adAudioPath && !movie.adAudioPath.startsWith('/audio/default_ad.mp3')) {
        const res = await fetch(movie.adAudioPath);
        if (res.ok) {
          adAudioBlob = await res.blob();
        }
      }

      // 2. Download Reference Audio if it is not default
      if (movie.referenceAudioPath && !movie.referenceAudioPath.startsWith('/audio/default_ref.wav')) {
        const res = await fetch(movie.referenceAudioPath);
        if (res.ok) {
          referenceAudioBlob = await res.blob();
        }
      }

      // 3. Download SRT if it is not default
      if (movie.ccSrtPath && !movie.ccSrtPath.startsWith('/subtitles/default.srt')) {
        const res = await fetch(movie.ccSrtPath);
        if (res.ok) {
          srtContent = await res.text();
        }
      }

      // Save to IndexedDB
      await saveMovieMedia(movie.id, adAudioBlob, srtContent, referenceAudioBlob);

      // Mark locally as stored
      const updatedMovie = {
        ...movie,
        ccSrtContent: srtContent ? 'stored' : movie.ccSrtContent,
        adAudioUrl: adAudioBlob ? 'stored' : movie.adAudioUrl,
        referenceAudioUrl: referenceAudioBlob ? 'stored' : movie.referenceAudioUrl,
      };
      updateStoredMovie(updatedMovie);

      setDownloadedMap(prev => ({ ...prev, [movie.id]: true }));
    } catch (err) {
      console.error('Failed to download movie assets:', err);
      alert(`Failed to download offline assets for "${movie.name}".`);
    } finally {
      setDownloadingMap(prev => ({ ...prev, [movie.id]: false }));
    }
  };

  const handleRemoveDownload = async (movie: Movie) => {
    if (confirm(`Remove offline downloaded media for "${movie.name}"?`)) {
      try {
        await deleteMovieMedia(movie.id);
        const updatedMovie = {
          ...movie,
          ccSrtContent: undefined,
          adAudioUrl: undefined,
          referenceAudioUrl: undefined,
        };
        updateStoredMovie(updatedMovie);
        setDownloadedMap(prev => ({ ...prev, [movie.id]: false }));
      } catch (err) {
        console.error('Failed to delete media:', err);
      }
    }
  };

  if (movies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-center border border-white/5 bg-white/2">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-white/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No content available yet</h3>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Check back later — content will appear here once it has been prepared.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            href={`/sync/${movie.id}`}
            className="group block w-full text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded-2xl"
          >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 border border-white/8 bg-white/5 shadow-lg group-hover:border-orange-500/30 transition-colors">
              {movie.posterPath ? (
                <img
                  src={movie.posterPath}
                  alt={movie.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider">No Poster</span>
                </div>
              )}
              
              {/* Dynamic live badge overlay */}
              {movie.isLive && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-red-500/30 text-[10px] font-bold text-red-500 px-2 py-0.8 rounded-full shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              )}

              {/* Offline download button overlay */}
              <div className="absolute bottom-2.5 right-2.5 z-10">
                {downloadingMap[movie.id] ? (
                  <div className="bg-black/80 backdrop-blur-md rounded-full p-2 border border-white/10 text-orange-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : downloadedMap[movie.id] ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveDownload(movie);
                    }}
                    title="Available Offline. Click to remove."
                    className="bg-emerald-500/95 hover:bg-red-600 text-white rounded-full p-2 border border-emerald-500/30 transition-all flex items-center justify-center group/btn shadow-lg"
                  >
                    <svg className="w-4 h-4 block group-hover/btn:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg className="w-4 h-4 hidden group-hover/btn:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(movie);
                    }}
                    title="Download for Offline Sync"
                    className="bg-black/60 hover:bg-orange-600 text-white/90 hover:text-white rounded-full p-2 border border-white/10 hover:border-orange-500/30 transition-all flex items-center justify-center shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="px-1">
              <h3 className="font-bold text-white text-sm sm:text-base leading-snug truncate group-hover:text-orange-400 transition-colors">
                {movie.name}
              </h3>
              
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-white/45">
                <span>{movie.language.charAt(0) + movie.language.slice(1).toLowerCase()}</span>
                <span>•</span>
                <span>{movie.year}</span>
                {downloadedMap[movie.id] && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-500 font-bold uppercase text-[9px] tracking-wider">Offline</span>
                  </>
                )}
              </div>
              
              {movie.director && (
                <p className="text-[10px] text-white/30 mt-0.5 truncate">
                  Director: {movie.director}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
export default MovieCardGrid;
