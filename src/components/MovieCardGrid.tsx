'use client';

import React from 'react';
import Link from 'next/link';
import { Movie } from '@/utils/movies';

interface MovieCardGridProps {
  movies: Movie[];
}

export const MovieCardGrid: React.FC<MovieCardGridProps> = ({ movies }) => {
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
            </div>

            <div className="px-1">
              <h3 className="font-bold text-white text-sm sm:text-base leading-snug truncate group-hover:text-orange-400 transition-colors">
                {movie.name}
              </h3>
              
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-white/45">
                <span>{movie.language.charAt(0) + movie.language.slice(1).toLowerCase()}</span>
                <span>•</span>
                <span>{movie.year}</span>
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
