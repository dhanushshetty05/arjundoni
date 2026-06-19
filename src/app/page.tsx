'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import FilterPills from '@/components/FilterPills';
import MovieCardGrid from '@/components/MovieCardGrid';
import SubmitFilmModal from '@/components/SubmitFilmModal';
import { getStoredMovies, Movie } from '@/utils/movies';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(true);

  // Register PWA service worker and detect installation status
  useEffect(() => {
    // 1. Register/unregister service worker depending on env
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('Service worker unregistered in development mode');
          }
        });
      } else {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      }
    }

    // 2. Listen for installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Defer state updates to avoid calling setState synchronously in effect
    const timer = setTimeout(() => {
      // 4. Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(ios);

      // 5. Detect if already installed (standalone mode)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as Navigator & { standalone?: boolean }).standalone;
      if (isStandalone) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    }, 0);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  // Load movies from local storage database on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      setMovies(getStoredMovies());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const refreshMovies = () => {
    setMovies(getStoredMovies());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show prompt
    deferredPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Filter movies
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedLanguage === 'ALL') {
      return matchesSearch;
    }
    
    if (selectedLanguage === 'OTHERS') {
      const standardLangs = ['KANNADA', 'TULU', 'HINDI', 'TAMIL', 'TELUGU', 'MALAYALAM'];
      return matchesSearch && !standardLangs.includes(movie.language);
    }
    
    return matchesSearch && movie.language === selectedLanguage;
  });

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-t-orange-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0a0a0a] text-white flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pb-16 space-y-6 sm:space-y-8">
        {/* PWA Install Banner */}
        {isInstallable && !isInstalled && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="FILMADCC Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-black p-1"
                />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white leading-tight">
                    Install FILMADCC BY ARJUNDONI
                  </h4>
                  <p className="text-xs text-white/50 mt-0.5 leading-snug">
                    Install as a PWA to use offline in cinema halls and access screen synchronization features instantly.
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-orange-600/10 shrink-0 uppercase tracking-wider"
              >
                Install App
              </button>
            </div>
          </div>
        )}

        {/* iOS Install Prompt */}
        {isIOS && !isInstalled && showIOSBanner && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="FILMADCC Logo"
                  className="w-10 h-10 rounded-xl object-contain bg-black p-1 shrink-0"
                />
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Add to Home Screen</h4>
                  <p className="text-xs text-white/50 mt-0.5">
                    Tap the <span className="font-bold text-orange-400">Share</span> button in Safari, then select <span className="font-bold text-orange-400">Add to Home Screen</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSBanner(false)}
                className="text-white/30 hover:text-white/60 p-1 shrink-0"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Banner Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 sm:mb-3 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Available Content
            </h1>
            <p className="text-white/50 text-sm sm:text-lg max-w-xl leading-relaxed">
              Select a film to trigger ambient microphone sync, listen to Audio Descriptions (AD), or display Closed Captions (CC) in the theater.
            </p>
          </div>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/7 border border-white/10 hover:border-orange-500/30 text-white hover:text-orange-400 text-xs font-bold px-4 py-3 rounded-2xl transition-all self-start md:self-center uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Submit a Film
          </button>
        </section>

        {/* Search and Filters */}
        <div className="space-y-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <FilterPills selectedLanguage={selectedLanguage} onSelectLanguage={setSelectedLanguage} />
        </div>

        {/* Movie Cards Grid */}
        <MovieCardGrid movies={filteredMovies} />
      </main>

      {/* Modal Dialogue */}
      <SubmitFilmModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} onSuccess={refreshMovies} />
    </div>
  );
}
