'use client';

import React from 'react';

interface FilterPillsProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

const LANGUAGES = ['ALL', 'KANNADA', 'TULU', 'HINDI', 'TAMIL', 'TELUGU', 'MALAYALAM', 'OTHERS'];

export const FilterPills: React.FC<FilterPillsProps> = ({ selectedLanguage, onSelectLanguage }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none pb-1">
      <div className="flex gap-2 min-w-max">
        {LANGUAGES.map((lang) => {
          const isActive = selectedLanguage === lang;
          const displayLabel = lang === 'ALL' 
            ? 'All' 
            : lang.charAt(0) + lang.slice(1).toLowerCase();

          return (
            <button
              key={lang}
              onClick={() => onSelectLanguage(lang)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border whitespace-nowrap ${
                isActive
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default FilterPills;
