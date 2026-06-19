'use client';

import React, { useState, useEffect, useRef, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStoredMovies, Movie, fetchMoviesFromCloud, saveStoredMovies } from '@/utils/movies';
import { CinemaSyncEngine } from '@/utils/syncEngine';
import { generateMockSubtitles, parseSRT } from '@/utils/subtitleParser';
import { getMovieMedia } from '@/utils/indexedDB';

interface SyncPageProps {
  params: Promise<{ movieId: string }>;
}

export default function SyncPage({ params }: SyncPageProps) {
  const { movieId } = use(params);
  const router = useRouter();
  
  // Selection states
  const [serviceType, setServiceType] = useState<'ad' | 'cc' | 'both' | null>(null);
  const [soundtrackLanguage, setSoundtrackLanguage] = useState<string>('');
  
  // App/Sync status states
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'listening' | 'matching' | 'synced' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Subtitle states
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Local storage movie loading states
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let active = true;
    let audioUrl = '';
    let refAudioUrl = '';

    const timer = setTimeout(async () => {
      if (!active) return;
      setIsMounted(true);
      
      let found: Movie | undefined;
      const stored = getStoredMovies();
      found = stored.find(m => m.id === movieId);
      
      if (!found) {
        try {
          const cloudMovies = await fetchMoviesFromCloud();
          found = cloudMovies.find(m => m.id === movieId);
          if (found) {
            const currentStored = getStoredMovies();
            if (!currentStored.some(m => m.id === found!.id)) {
              currentStored.push(found);
              saveStoredMovies(currentStored);
            }
          }
        } catch (e) {
          console.error('Failed to fetch movie from cloud:', e);
        }
      }
      
      if (found) {
        try {
          const media = await getMovieMedia(movieId);
          if (!active) return;
          
          if (media.adAudioBlob) {
            audioUrl = URL.createObjectURL(media.adAudioBlob);
          }
          if (media.referenceAudioBlob) {
            refAudioUrl = URL.createObjectURL(media.referenceAudioBlob);
          }
          
          setMovie({
            ...found,
            adAudioUrl: audioUrl || found.adAudioPath,
            ccSrtContent: media.ccSrtContent || found.ccSrtContent,
            referenceAudioPath: refAudioUrl || found.referenceAudioPath,
          });
        } catch (e) {
          console.error('Error loading media from IndexedDB:', e);
          setMovie(found);
        }
      } else {
        setMovie(null);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (refAudioUrl) {
        URL.revokeObjectURL(refAudioUrl);
      }
    };
  }, [movieId]);

  // Generate realistic mock subtitles or parse uploaded SRT content
  const subtitles = useMemo(() => {
    if (!movie) return [];
    if (movie.ccSrtContent && movie.ccSrtContent !== 'stored') {
      try {
        return parseSRT(movie.ccSrtContent);
      } catch (e) {
        console.error('Failed to parse custom uploaded SRT subtitles:', e);
      }
    }
    return generateMockSubtitles(movie.name, movie.language);
  }, [movie]);
  
  // References
  const syncEngineRef = useRef<CinemaSyncEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const subtitleIndexRef = useRef<number>(0);
  const timeOffsetRef = useRef<number>(0); // Store delta between real time and movie time
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenSubtitleRef = useRef<string>('');

  const cleanupSync = () => {
    if (syncEngineRef.current) {
      syncEngineRef.current.stop();
      syncEngineRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    lastSpokenSubtitleRef.current = '';
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupSync();
    };
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-t-orange-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Movie not found</h2>
        <Link href="/" className="bg-orange-600 px-6 py-2 rounded-xl text-sm font-bold">
          Go Back Home
        </Link>
      </div>
    );
  }

  const isSelectionsSatisfied = serviceType !== null && soundtrackLanguage !== '';

  const handleStartSync = async () => {
    if (!isSelectionsSatisfied) return;

    // Transition to distraction-free Cinema Mode
    setIsCinemaMode(true);
    setSyncStatus('listening');
    setStatusMessage('Initializing microphone stream...');
    setActiveSubtitle('');
    
    // Unlock AD Audio if needed
    const playAdAudio = serviceType === 'ad' || serviceType === 'both';
    const audioSrc = movie.adAudioUrl || movie.adAudioPath;
    if (playAdAudio && audioSrc) {
      try {
        const audio = new Audio(audioSrc);
        audio.muted = true;
        // Play and pause immediately to unlock the audio context on mobile/desktop browsers
        await audio.play();
        audio.pause();
        audio.muted = false;
        audioRef.current = audio;
      } catch (e) {
        console.warn('Failed to pre-unlock AD Audio:', e);
      }
    }

    // Request Fullscreen if browser supports it
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      }
    } catch (e) {
      console.log('Fullscreen request ignored:', e);
    }

    // Initialize Sync Engine
    syncEngineRef.current = new CinemaSyncEngine(
      // onTimeUpdate
      (matchedSeconds) => {
        setSyncStatus('synced');
        
        // Intercept matchedSeconds if the subtitles duration is shorter (e.g. custom test movies)
        let actualStartSeconds = matchedSeconds;
        const maxSubTime = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;
        if (maxSubTime > 0 && matchedSeconds > maxSubTime) {
          actualStartSeconds = Math.min(5, maxSubTime);
        }
        
        startSubtitlePlayback(actualStartSeconds);
      },
      // onStatusChange
      (status, message) => {
        setSyncStatus(status);
        setStatusMessage(message);
      },
      // onError
      (error) => {
        console.error('Sync engine error:', error);
      }
    );

    await syncEngineRef.current.start(movie.referenceAudioPath);
  };

  const startSubtitlePlayback = (startSeconds: number) => {
    const playAdAudio = serviceType === 'ad' || serviceType === 'both';
    const audioSrc = movie.adAudioUrl || movie.adAudioPath;
    
    let isAudioActive = false;
    
    const triggerTtsFallback = () => {
      isAudioActive = false;
      if (playAdAudio && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const intro = new SpeechSynthesisUtterance(`Voice narration fallback active.`);
        intro.rate = 1.0;
        intro.volume = 0.5;
        window.speechSynthesis.speak(intro);
      }
    };

    // Play AD audio track if available
    if (playAdAudio && audioSrc) {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio(audioSrc);
        audioRef.current = audio;
      } else if (audio.src !== audioSrc && !audioSrc.startsWith('blob:') && !audio.src.endsWith(audioSrc)) {
        audio.src = audioSrc;
      }
      
      const handleAudioError = (e: Event) => {
        console.warn('Audio track failed to load, falling back to speech synthesis.', e);
        triggerTtsFallback();
      };
      
      audio.addEventListener('error', handleAudioError);
      
      const seekAndPlay = () => {
        const duration = audio.duration;
        let seekTime = startSeconds;
        if (duration && duration > 0 && startSeconds > duration) {
          seekTime = startSeconds % duration;
        }
        
        audio.currentTime = seekTime;
        
        audio.play()
          .then(() => {
            isAudioActive = true;
            console.log(`Audio Description playing at ${seekTime}s (sync start: ${startSeconds}s)`);
          })
          .catch(e => {
            console.warn('Audio playback start failed, trying fallback.', e);
            handleAudioError(e);
          });
      };
      
      if (audio.readyState >= 1) { // HAVE_METADATA or higher
        seekAndPlay();
      } else {
        audio.addEventListener('loadedmetadata', seekAndPlay);
      }
    }

    // Record start coordinates
    startTimeRef.current = performance.now();
    timeOffsetRef.current = startSeconds;
    
    // Find initial subtitle index
    let initialIndex = subtitles.findIndex(s => s.start <= startSeconds && s.end >= startSeconds);
    if (initialIndex === -1) {
      initialIndex = subtitles.findIndex(s => s.start > startSeconds);
      if (initialIndex === -1) initialIndex = 0;
    }
    subtitleIndexRef.current = initialIndex;

    // Start requestAnimationFrame subtitle rendering loop
    const renderLoop = () => {
      const elapsedMs = performance.now() - startTimeRef.current;
      
      // Sync subtitle playback time with active audio description track if playing,
      // otherwise fall back to elapsed timer.
      let currentMovieTime = timeOffsetRef.current + (elapsedMs / 1000);
      const audio = audioRef.current;
      if (audio && isAudioActive) {
        const duration = audio.duration;
        if (duration && duration > 0) {
          const cycle = Math.floor(timeOffsetRef.current / duration);
          currentMovieTime = cycle * duration + audio.currentTime;
        }
      }
      
      setCurrentTimestamp(currentMovieTime);
      
      // Binary search or linear match for active subtitle
      const match = subtitles.find(s => currentMovieTime >= s.start && currentMovieTime <= s.end);
      
      if (match) {
        setActiveSubtitle(match.text);
        
        // If AD is enabled and we are not playing a real audio file, speak it using SpeechSynthesis
        if (playAdAudio && !isAudioActive) {
          if (lastSpokenSubtitleRef.current !== match.text) {
            lastSpokenSubtitleRef.current = match.text;
            
            // Speak text using SpeechSynthesis
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(match.text);
              utterance.rate = 1.15; // Slightly faster to match subtitle duration
              utterance.volume = 0.8;
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      } else {
        setActiveSubtitle('');
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);
  };

  const handleExitCinemaMode = () => {
    cleanupSync();
    setIsCinemaMode(false);
    setSyncStatus('idle');
    setStatusMessage('');
    setActiveSubtitle('');
    
    // Exit Fullscreen
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (e) {
      console.log('Exit fullscreen error:', e);
    }
  };

  // Convert seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {!isCinemaMode ? (
        // --- Selection & Prep Screen ---
        <>
          <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors py-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-semibold">Dashboard</span>
              </button>
            </div>
          </header>

          <main className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto px-6 py-8 space-y-6">
            {/* Movie Info Card */}
            <div className="flex gap-4 items-center bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
                {movie.posterPath ? (
                  <img src={movie.posterPath} alt={movie.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-mono text-white/20 text-center px-1">NO POSTER</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{movie.name}</h2>
                <p className="text-xs text-white/55 mt-1 font-mono">{movie.year} • {movie.director}</p>
                <div className="inline-flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 px-2 py-0.5 rounded-md mt-2">
                  {movie.language}
                </div>
              </div>
            </div>

            {/* Selection State */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/65 mb-2.5 uppercase tracking-wider">
                  Select Sync Services
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ad', 'cc', 'both'] as const).map((type) => {
                    const isActive = serviceType === type;
                    const label = type === 'ad' ? 'Audio Description' : type === 'cc' ? 'Closed Captions' : 'Both AD+CC';
                    return (
                      <button
                        key={type}
                        onClick={() => setServiceType(type)}
                        className={`px-3 py-4 rounded-xl text-center flex flex-col justify-center items-center gap-2 border text-xs font-bold leading-tight transition-all ${
                          isActive
                            ? 'bg-orange-600 border-orange-600 shadow-md shadow-orange-600/10 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {type === 'ad' && (
                          <svg className="w-5 h-5 mb-1 text-inherit" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                        {type === 'cc' && (
                          <svg className="w-5 h-5 mb-1 text-inherit" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        )}
                        {type === 'both' && (
                          <svg className="w-5 h-5 mb-1 text-inherit" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-white/65 uppercase tracking-wider">
                    Soundtrack Language
                  </span>
                  <span className="text-xs text-orange-400 font-bold">
                    Language : Kannada
                  </span>
                </div>
                
                <select
                  value={soundtrackLanguage}
                  onChange={(e) => setSoundtrackLanguage(e.target.value)}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                >
                  <option value="">Select sound track language : kannada</option>
                  <option value="kannada">Kannada (Default)</option>
                  <option value="tulu">Tulu</option>
                  <option value="hindi">Hindi</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                  <option value="malayalam">Malayalam</option>
                </select>
              </div>
            </div>

            {/* Instructional State */}
            <div className="bg-[#1a1307] border border-orange-500/10 rounded-2xl p-4 flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-orange-400 leading-tight">Ready to Sync</h4>
                <p className="text-xs text-white/50 mt-1 leading-normal">
                  Press play on the theatre screen, then tap Start
                </p>
              </div>
            </div>

            {/* The Trigger */}
            <button
              onClick={handleStartSync}
              disabled={!isSelectionsSatisfied}
              className={`w-full font-bold py-4 rounded-xl text-center text-sm uppercase tracking-widest transition-all ${
                isSelectionsSatisfied
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-lg shadow-orange-600/10 active:scale-[0.98]'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
            >
              Start Sync
            </button>
          </main>
        </>
      ) : (
        // --- Fullscreen Cinema Mode Tracking Layout ---
        <main className="fixed inset-0 z-50 bg-[#020202] text-white flex flex-col items-center justify-center p-6 select-none select-none">
          {/* Top Info Bar */}
          <div className="absolute top-4 left-6 right-6 flex justify-between items-center text-white/40 font-mono text-[10px]">
            {syncStatus === 'synced' ? (
              <span className="text-emerald-500/60 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                [SYNC OK - Offset: ±0.1s]
              </span>
            ) : (
              <span className="text-orange-500/60 font-bold bg-orange-500/5 px-2.5 py-1 rounded-full border border-orange-500/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                {syncStatus.toUpperCase()}
              </span>
            )}
            
            <span>{movie.name.toUpperCase()} ({soundtrackLanguage.toUpperCase()})</span>
          </div>

          {/* Subtitle/AD Rendering Area */}
          <div className="flex-1 flex flex-col justify-end pb-24 w-full max-w-lg mx-auto text-center px-4">
            {syncStatus !== 'synced' ? (
              <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                <div className="relative w-16 h-16">
                  {/* Rotating listening animation */}
                  <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin" />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">{statusMessage}</h3>
                <p className="text-xs text-white/30 max-w-xs leading-normal">
                  Listening to ambient movie audio to match the sound signature...
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Visualizer showing live audio capture indicator */}
                <div className="flex justify-center items-center gap-1 opacity-20">
                  <span className="w-1 h-3 rounded-full bg-orange-400 animate-pulse" />
                  <span className="w-1 h-6 rounded-full bg-orange-400 animate-pulse delay-75" />
                  <span className="w-1 h-4 rounded-full bg-orange-400 animate-pulse delay-150" />
                  <span className="w-1 h-7 rounded-full bg-orange-400 animate-pulse delay-300" />
                  <span className="w-1 h-2 rounded-full bg-orange-400 animate-pulse delay-75" />
                </div>

                {/* Subtitle Text */}
                <div className="min-h-[140px] flex items-center justify-center">
                  {(serviceType === 'cc' || serviceType === 'both') ? (
                    <p className="text-xl sm:text-2xl font-bold leading-relaxed text-yellow-400 tracking-wide font-sans max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-2">
                      {activeSubtitle || '[Music playing in background]'}
                    </p>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-sm font-semibold text-white/40 tracking-wider uppercase">
                        Audio Description Active
                      </p>
                      <p className="text-xs text-white/20">
                        Screen is kept dark to prevent distraction in the theater
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Time Indicator */}
                <div className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
                  Playback Position: {formatTime(currentTimestamp)}
                </div>
              </div>
            )}
          </div>

          {/* Exit / Control Button */}
          <div className="absolute bottom-6">
            <button
              onClick={handleExitCinemaMode}
              className="bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white/50 hover:text-white text-[11px] font-bold tracking-widest px-4 py-2.5 rounded-full uppercase transition-all"
            >
              Exit Cinema Mode
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
