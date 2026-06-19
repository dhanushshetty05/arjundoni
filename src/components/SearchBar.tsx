'use client';

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-white/30 group-focus-within:text-orange-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search titles..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all focus:ring-1 focus:ring-orange-500/20"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-3 flex items-center pr-3 text-white/30 hover:text-white/70 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
export default SearchBar;
