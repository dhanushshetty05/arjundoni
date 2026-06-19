'use client';

import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-lg font-bold tracking-wider text-transparent uppercase font-mono">
              FILM ADCC BY ARJUN DONI
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          <Link 
            href="/admin" 
            className="text-[10px] sm:text-xs font-mono font-bold text-orange-400/80 hover:text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/15 hover:border-orange-500/30 rounded-full px-3 py-1.5 transition-all uppercase tracking-wide"
          >
            Admin Panel
          </Link>
        </div>
      </div>
    </header>
  );
};
export default Header;
