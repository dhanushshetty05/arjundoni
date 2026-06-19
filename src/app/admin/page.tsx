'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { 
  Movie, 
  getStoredMovies, 
  saveStoredMovies,
  addStoredMovie, 
  updateStoredMovie, 
  deleteStoredMovie,
  fetchMoviesFromCloud,
  addMovieToCloud,
  deleteMovieFromCloud
} from '@/utils/movies';
import { saveMovieMedia, deleteMovieMedia } from '@/utils/indexedDB';
import { getSupabaseClient } from '@/utils/supabase';

async function uploadToStorage(path: string, file: File | Blob): Promise<string> {
  const bucketName = 'filmadcc-media';
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    
  if (error) {
    throw error;
  }
  
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);
    
  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage');
  }
  
  return urlData.publicUrl;
}

export default function AdminDashboard() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('KANNADA');
  const [year, setYear] = useState('');
  const [director, setDirector] = useState('');
  const [posterPath, setPosterPath] = useState('');
  const [status, setStatus] = useState<'ready' | 'playing'>('ready');
  const [isLive, setIsLive] = useState(true);
  const [adAudioPath, setAdAudioPath] = useState('');
  const [ccSrtPath, setCcSrtPath] = useState('');
  const [ccSrtContent, setCcSrtContent] = useState('');
  const [adAudioUrl, setAdAudioUrl] = useState('');
  const [srtFileName, setSrtFileName] = useState('');
  const [mp3FileName, setMp3FileName] = useState('');
  const [posterFileName, setPosterFileName] = useState('');
  const [adAudioFile, setAdAudioFile] = useState<File | null>(null);

  // Reference Audio states
  const [refAudioFile, setRefAudioFile] = useState<File | null>(null);
  const [refAudioFileName, setRefAudioFileName] = useState('');

  // Upload loader
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load movies on mount
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsMounted(true);
      await refreshList();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const refreshList = async () => {
    try {
      const cloudMovies = await fetchMoviesFromCloud();
      if (cloudMovies.length > 0) {
        setMovies(cloudMovies);
        saveStoredMovies(cloudMovies);
      } else {
        setMovies(getStoredMovies());
      }
    } catch (e) {
      setMovies(getStoredMovies());
    }
  };

  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSrtFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCcSrtContent(text);
    };
    reader.readAsText(file);
  };

  const handleMp3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMp3FileName(file.name);
    setAdAudioFile(file);
    const url = URL.createObjectURL(file);
    setAdAudioUrl(url);
  };

  const handleRefAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefAudioFileName(file.name);
    setRefAudioFile(file);
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPosterFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setPosterPath(compressed);
        } else {
          setPosterPath(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    setEditingMovie(null);
    setName('');
    setLanguage('KANNADA');
    setYear(new Date().getFullYear().toString());
    setDirector('');
    setPosterPath('');
    setStatus('ready');
    setIsLive(true);
    setAdAudioPath('/audio/default_ad.mp3');
    setCcSrtPath('/subtitles/default.srt');
    setCcSrtContent('');
    setAdAudioUrl('');
    setSrtFileName('');
    setMp3FileName('');
    setPosterFileName('');
    setAdAudioFile(null);
    setRefAudioFile(null);
    setRefAudioFileName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setName(movie.name);
    setLanguage(movie.language);
    setYear(movie.year);
    setDirector(movie.director);
    setPosterPath(movie.posterPath || '');
    setStatus(movie.status);
    setIsLive(movie.isLive);
    setAdAudioPath(movie.adAudioPath);
    setCcSrtPath(movie.ccSrtPath);
    setCcSrtContent(movie.ccSrtContent || '');
    setAdAudioUrl(movie.adAudioUrl || '');
    setSrtFileName(movie.ccSrtContent ? 'Custom Subtitles Uploaded' : '');
    setMp3FileName(movie.adAudioUrl ? 'Custom Audio Track Uploaded' : '');
    setPosterFileName(movie.posterPath ? 'Custom Poster Uploaded' : '');
    setAdAudioFile(null);
    setRefAudioFile(null);
    setRefAudioFileName(movie.referenceAudioPath && !movie.referenceAudioPath.endsWith('default_ref.wav') ? 'Custom Reference Audio Uploaded' : '');
    setIsModalOpen(true);
  };

  const handleDelete = async (movie: Movie) => {
    if (confirm(`Are you sure you want to delete "${movie.name}"?`)) {
      try {
        await deleteMovieFromCloud(movie.id);
      } catch (err) {
        console.error('Failed to delete movie from cloud:', err);
      }
      deleteStoredMovie(movie.id);
      deleteMovieMedia(movie.id).catch(err => console.error('Failed to delete media from IndexedDB:', err));
      await refreshList();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsUploading(true);
    const movieId = editingMovie ? editingMovie.id : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    try {
      let finalPosterPath = posterPath;
      let finalAdAudioPath = adAudioPath;
      let finalRefAudioPath = editingMovie?.referenceAudioPath || '/audio/default_ref.wav';
      let finalCcSrtPath = ccSrtPath;

      // 1. Upload Poster Image if new file uploaded
      if (posterFileName && posterPath.startsWith('data:image')) {
        const response = await fetch(posterPath);
        const blob = await response.blob();
        finalPosterPath = await uploadToStorage(`posters/${movieId}.jpg`, blob);
      }

      // 2. Upload AD Audio if new file uploaded
      if (adAudioFile) {
        finalAdAudioPath = await uploadToStorage(`ad_audios/${movieId}_ad.mp3`, adAudioFile);
      }

      // 3. Upload Reference Audio if new file uploaded
      if (refAudioFile) {
        finalRefAudioPath = await uploadToStorage(`ref_audios/${movieId}_ref.wav`, refAudioFile);
      }

      // 4. Upload CC SRT if new content uploaded
      if (ccSrtContent && ccSrtContent !== 'stored') {
        const blob = new Blob([ccSrtContent], { type: 'text/plain' });
        finalCcSrtPath = await uploadToStorage(`subtitles/${movieId}.srt`, blob);
        await saveMovieMedia(movieId, null, ccSrtContent, refAudioFile);
      }

      // Save large assets to IndexedDB locally as cache
      try {
        await saveMovieMedia(movieId, adAudioFile, ccSrtContent || null, refAudioFile);
      } catch (err) {
        console.error('Failed to save media in IndexedDB:', err);
      }

      const movieData: Movie = {
        id: movieId,
        name,
        language,
        year: year || new Date().getFullYear().toString(),
        director: director || 'Unknown Director',
        posterPath: finalPosterPath || '',
        status,
        adAudioPath: finalAdAudioPath || '/audio/default_ad.mp3',
        referenceAudioPath: finalRefAudioPath,
        ccSrtPath: finalCcSrtPath || '/subtitles/default.srt',
        isLive,
        ccSrtContent: ccSrtContent ? 'stored' : (editingMovie?.ccSrtContent ? 'stored' : undefined),
        adAudioUrl: adAudioUrl ? 'stored' : (editingMovie?.adAudioUrl ? 'stored' : undefined),
        referenceAudioUrl: refAudioFileName ? 'stored' : (editingMovie?.referenceAudioUrl ? 'stored' : undefined),
      };

      // Save to Firebase Firestore
      await addMovieToCloud(movieData);

      // Save locally
      if (editingMovie) {
        updateStoredMovie(movieData);
      } else {
        addStoredMovie(movieData);
      }

      setIsModalOpen(false);
      await refreshList();
    } catch (err) {
      console.error('Error saving movie:', err);
      alert('Failed to save movie details: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
    }
  };

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Admin Console</h1>
            <p className="text-white/45 text-xs sm:text-sm mt-1">
              Add, update, or remove movies from the local database. Changes persist instantly in your browser.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-orange-600/10 active:scale-[0.98] uppercase tracking-wider self-start sm:self-center"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Movie
          </button>
        </div>

        {/* Movies List Table */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/2 text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-widest">
                  <th className="py-4 px-5">Poster</th>
                  <th className="py-4 px-5">Title</th>
                  <th className="py-4 px-5">Language</th>
                  <th className="py-4 px-5">Year</th>
                  <th className="py-4 px-5">Director</th>
                  <th className="py-4 px-5">Live?</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {movies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-white/30">
                      No movies in database. Click &ldquo;Add New Movie&rdquo; to insert one.
                    </td>
                  </tr>
                ) : (
                  movies.map((movie) => (
                    <tr key={movie.id} className="hover:bg-white/1.5 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="w-10 h-14 bg-white/5 border border-white/10 rounded-lg overflow-hidden shrink-0">
                          {movie.posterPath ? (
                            <img src={movie.posterPath} alt={movie.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-white/25">
                              NO IMG
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 font-semibold text-white group-hover:text-orange-400 transition-colors">
                        {movie.name}
                      </td>
                      <td className="py-3 px-5">
                        <span className="bg-white/5 border border-white/10 text-[10px] font-bold px-2 py-0.8 rounded-md uppercase text-white/70">
                          {movie.language}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-white/60">{movie.year}</td>
                      <td className="py-3 px-5 text-white/55">{movie.director}</td>
                      <td className="py-3 px-5">
                        {movie.isLive ? (
                          <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="text-white/30 text-[10px]">OFFLINE</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(movie)}
                          className="bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-white/70 hover:text-orange-400 font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-all uppercase tracking-wide"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(movie)}
                          className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-all uppercase tracking-wide"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-1">{editingMovie ? 'Edit Movie' : 'Add New Movie'}</h2>
            <p className="text-xs text-white/40 mb-6">
              Configure parameters for the movie closed captions and audio sync options.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                  Movie Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kantara"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="KANNADA">Kannada</option>
                    <option value="TULU">Tulu</option>
                    <option value="HINDI">Hindi</option>
                    <option value="TAMIL">Tamil</option>
                    <option value="TELUGU">Telugu</option>
                    <option value="MALAYALAM">Malayalam</option>
                    <option value="ENGLISH">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Release Year
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Director Name
                  </label>
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="e.g. Rishab Shetty"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Sync Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ready' | 'playing')}
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="ready">Ready</option>
                    <option value="playing">Playing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Poster Path / Image URL
                  </label>
                  <input
                    type="text"
                    value={posterPath}
                    onChange={(e) => setPosterPath(e.target.value)}
                    placeholder="e.g. /api/files/uploads/prod/02d25b9e-deff-4111-82ea-e621afe8897a.jpg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Upload Poster Image
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      className="hidden"
                      id="poster-file-input"
                    />
                    <label
                      htmlFor="poster-file-input"
                      className="w-full text-center bg-white/5 border border-dashed border-white/20 hover:border-orange-500/40 hover:bg-white/8 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all truncate"
                    >
                      {posterFileName || 'Choose Image File'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    AD Audio Path
                  </label>
                  <input
                    type="text"
                    value={adAudioPath}
                    onChange={(e) => setAdAudioPath(e.target.value)}
                    placeholder="/audio/default_ad.mp3"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    CC SRT Path
                  </label>
                  <input
                    type="text"
                    value={ccSrtPath}
                    onChange={(e) => setCcSrtPath(e.target.value)}
                    placeholder="/subtitles/default.srt"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Upload AD Audio (.mp3)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="file"
                      accept="audio/mp3,audio/*"
                      onChange={handleMp3Upload}
                      disabled={isUploading}
                      className="hidden"
                      id="mp3-file-input"
                    />
                    <label
                      htmlFor="mp3-file-input"
                      className={`w-full text-center bg-white/5 border border-dashed border-white/20 hover:border-orange-500/40 hover:bg-white/8 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all truncate ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {mp3FileName || 'Choose MP3 File'}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Upload Subtitles (.srt)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="file"
                      accept=".srt,.txt"
                      onChange={handleSrtUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="srt-file-input"
                    />
                    <label
                      htmlFor="srt-file-input"
                      className={`w-full text-center bg-white/5 border border-dashed border-white/20 hover:border-orange-500/40 hover:bg-white/8 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all truncate ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {srtFileName || 'Choose SRT File'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 mb-1.5 uppercase tracking-widest">
                    Upload Reference Audio (.wav)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="file"
                      accept="audio/wav,audio/x-wav,audio/*"
                      onChange={handleRefAudioUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="ref-audio-file-input"
                    />
                    <label
                      htmlFor="ref-audio-file-input"
                      className={`w-full text-center bg-white/5 border border-dashed border-white/20 hover:border-orange-500/40 hover:bg-white/8 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all truncate ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {refAudioFileName || 'Choose WAV File'}
                    </label>
                  </div>
                </div>
                <div className="flex items-center">
                  <p className="text-[10px] text-white/40 italic leading-snug">
                    Provide the movie's reference audio track (WAV format) for mic synchronization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-b border-white/5">
                <input
                  type="checkbox"
                  id="isLiveCheckbox"
                  checked={isLive}
                  disabled={isUploading}
                  onChange={(e) => setIsLive(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 accent-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="isLiveCheckbox" className="text-xs font-semibold text-white cursor-pointer select-none disabled:opacity-50">
                  Make this Movie active / live immediately
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  {isUploading ? 'Uploading...' : (editingMovie ? 'Save Changes' : 'Create Movie')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
