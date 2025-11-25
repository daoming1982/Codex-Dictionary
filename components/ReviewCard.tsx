import React, { useRef, useState, useEffect, memo } from 'react';
import { Pause, Trash2, Volume2, Loader2, Repeat, Turtle } from 'lucide-react';
import { DictionaryEntry } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface ReviewCardProps {
  item: DictionaryEntry;
  onDelete: (id: string) => void;
  onPlayRequest: (id: string) => void; 
  autoPlay?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = memo(({ item, onDelete, onPlayRequest, autoPlay }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayed = useRef(false);
  const loopTimeoutRef = useRef<number | null>(null);

  // Trigger loading state if no audio URL yet
  useEffect(() => {
    if (!item.audioUrl) {
       setIsAudioLoading(true);
    } else {
       setIsAudioLoading(false);
    }
  }, [item.audioUrl]);

  // Update playback rate dynamically
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = isSlow ? 0.7 : 1.0;
    }
  }, [isSlow, isPlaying]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && !hasAutoPlayed.current && item.audioUrl && audioRef.current) {
        const timer = setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.playbackRate = isSlow ? 0.7 : 1.0;
                audioRef.current.play().catch(e => console.log("Auto-play prevented:", e));
                setIsPlaying(true);
                hasAutoPlayed.current = true;
            }
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [autoPlay, item.audioUrl, isSlow]);

  // Clean up timeout on unmount
  useEffect(() => {
      return () => {
          if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      };
  }, []);

  const togglePlay = () => {
    if (!item.audioUrl) {
      if (!isAudioLoading) {
         setIsAudioLoading(true);
         onPlayRequest(item.id);
      }
      return;
    }

    if (!audioRef.current) return;
    
    // Clear any pending loop
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = isSlow ? 0.7 : 1.0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
      if (isLooping) {
          loopTimeoutRef.current = window.setTimeout(() => {
              if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                  setIsPlaying(true);
              }
          }, 1000); // 1 second delay
      } else {
          setIsPlaying(false);
      }
  };

  return (
    <div className="backdrop-blur-sm rounded-md border-l-4 shadow-sm p-6 transition-all hover:shadow-md group relative overflow-hidden bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
         style={{ borderColor: 'var(--text-primary)' }}>
       {/* Background Decoration */}
       <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 bg-[var(--text-secondary)] rounded-full opacity-5 z-0 pointer-events-none" />

      {/* Top Row: Original & Delete */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">
           Input
        </div>
        <button 
          onClick={() => onDelete(item.id)}
          className="text-[var(--text-secondary)] hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
          aria-label="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="mb-6 relative z-10">
          <div className="text-sm text-[var(--text-secondary)] mb-4 font-serif-jp">{item.originalInput}</div>
          
          <div className="pl-4 border-l border-[var(--border-color)]">
            <div className="flex flex-col">
                <span className="text-sm font-serif-jp mb-1 text-[var(--accent)]">{item.reading}</span>
                <h3 className="text-3xl font-bold font-serif-jp leading-tight text-[var(--text-primary)]">{item.japanese}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">[{item.romaji}]</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded text-[var(--text-primary)] bg-[var(--border-color)]">{item.englishDefinition}</span>
                </div>
            </div>
          </div>
      </div>

      {/* Example Sentence */}
      <div className="mb-6 p-4 rounded-sm border relative z-10 bg-[var(--accent-bg)] border-[var(--accent-bg)]">
            <div className="flex flex-col gap-1">
                <div className="text-xs mb-1 uppercase tracking-wide opacity-60 text-[var(--text-primary)]">Usage</div>
                <div className="text-lg font-serif-jp text-[var(--text-primary)]">{item.exampleJapanese}</div>
                <div className="text-xs font-serif-jp text-[var(--accent)]">{item.exampleReading}</div>
                <div className="text-sm mt-1 font-serif-jp text-[var(--text-secondary)]">{item.exampleEnglish}</div>
            </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/50 relative z-10">
        <div className="flex gap-4 items-center">
             {/* Native Audio Button */}
            <button
              onClick={togglePlay}
              disabled={isAudioLoading && !item.audioUrl}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all text-sm font-medium ${
                 isAudioLoading 
                    ? 'text-[var(--text-secondary)] cursor-wait' 
                    : isPlaying 
                        ? 'text-[var(--accent)]' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--accent-bg)]'
              }`}
            >
              {isAudioLoading ? (
                  <Loader2 size={14} className="animate-spin" />
              ) : isPlaying ? (
                  <Pause size={14} />
              ) : (
                  <Volume2 size={14} />
              )}
              <span>{isAudioLoading ? 'Loading...' : 'Listen'}</span>
            </button>
            <audio 
                ref={audioRef} 
                src={item.audioUrl || undefined} 
                onEnded={handleAudioEnded}
                onPause={() => !isLooping && setIsPlaying(false)}
            />

            <div className="h-4 w-px bg-[var(--border-color)]"></div>

            {/* Loop Button */}
            <button
                onClick={() => setIsLooping(!isLooping)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm transition-all text-xs font-medium ${
                    isLooping 
                        ? 'text-[var(--accent)] bg-[var(--accent-bg)]' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Loop playback with 1s interval"
            >
                <Repeat size={14} />
                <span>Loop</span>
            </button>

            {/* Slow Button */}
            <button
                onClick={() => setIsSlow(!isSlow)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm transition-all text-xs font-medium ${
                    isSlow 
                        ? 'text-[var(--accent)] bg-[var(--accent-bg)]' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Slow playback (0.7x)"
            >
                <Turtle size={14} />
                <span>Slow</span>
            </button>
        </div>
        
        <div className="flex items-center gap-2">
             <AudioVisualizer isPlaying={isPlaying} />
        </div>
      </div>
    </div>
  );
});