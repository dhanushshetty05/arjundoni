'use client';

import React, { useState } from 'react';
import { addStoredMovie, Movie } from '@/utils/movies';

interface SubmitFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubmitFilmModal: React.FC<SubmitFilmModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('Kannada');
  const [director, setDirector] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add new movie to local storage database
    const newMovie: Movie = {
      id: title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      name: title,
      language: language.toUpperCase(),
      year: year || new Date().getFullYear().toString(),
      director: director || 'Unknown Director',
      posterPath: '', // Will render the placeholder in MovieCardGrid
      status: 'ready',
      adAudioPath: '/audio/default_ad.mp3',
      referenceAudioPath: '/audio/default_ref.wav',
      ccSrtPath: '/subtitles/default.srt',
      isLive: true
    };
    
    addStoredMovie(newMovie);
    if (onSuccess) {
      onSuccess();
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle('');
      setDirector('');
      setYear('');
      setEmail('');
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Film Submitted!</h3>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
              Thank you! We have received your film details. Our sync team will prepare the audio fingerprint maps and SRT subtitles shortly.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Submit a Film</h2>
            <p className="text-xs text-white/45 mb-6">
              Request a movie to be processed for Audio Descriptions & Closed Captions synchronization.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                  Movie Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kantara"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all focus:bg-white/8"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                  >
                    <option>Kannada</option>
                    <option>Tulu</option>
                    <option>Hindi</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                    <option>Malayalam</option>
                    <option>English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                    Release Year
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all focus:bg-white/8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                  Director Name
                </label>
                <input
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="e.g. Rishab Shetty"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all focus:bg-white/8"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                  Your Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. arjun@filmadcc.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all focus:bg-white/8"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] text-sm"
                >
                  Submit Movie Request
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default SubmitFilmModal;
