import React, { useRef, useState, useEffect, memo } from 'react';
import { Pause, Trash2, Volume2, Loader2, Repeat, Turtle, Eye, EyeOff, Copy, Check, BookOpen, Lightbulb } from 'lucide-react';
import { DictionaryEntry } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface ReviewCardProps {
  item: DictionaryEntry;
  onDelete: (id: string) => void;
  onPlayRequest: (id: string) => void; 
  autoPlay?: boolean;
}

// Helper to determine JLPT color
const getJlptColor = (level: string) => {
  const normalized = level?.toUpperCase() || '';
  if (normalized.includes('N5')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (normalized.includes('N4')) return 'bg-teal-100 text-teal-800 border-teal-200';
  if (normalized.includes('N3')) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (normalized.includes('N2')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (normalized.includes('N1')) return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export const ReviewCard: React.FC<ReviewCardProps> = memo(({ item, onDelete, onPlayRequest, autoPlay }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [copied, setCopied] = useState(false);
  
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
          // Loop with 3.2s delay as requested
          loopTimeoutRef.current = window.setTimeout(() => {
              if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                  setIsPlaying(true);
              }
          }, 3200); 
      } else {
          setIsPlaying(false);
      }
  };

  const handleCopy = () => {
    const textToCopy = `${item.japanese} (${item.reading}) - ${item.englishDefinition}\n${item.exampleJapanese}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="backdrop-blur-sm rounded-md border-l-4 shadow-sm p-4 md:p-6 transition-all hover:shadow-md group relative overflow-hidden bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
         style={{ borderColor: 'var(--text-primary)' }}>
       {/* Background Decoration */}
       <div className="absolute top-0 right-0 p-12 -mr-8 -mt-8 bg-[var(--text-secondary)] rounded-full opacity-5 z-0 pointer-events-none" />

      {/* Top Row: Actions & Metadata */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="flex items-center gap-2">
           <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Input</span>
           {item.jlpt && item.jlpt !== 'Unknown' && (
             <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getJlptColor(item.jlpt)}`}>
               {item.jlpt}
             </span>
           )}
           {item.partOfSpeech && (
             <span className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-white/50">
               {item.partOfSpeech}
             </span>
           )}
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
           <button 
            onClick={handleCopy}
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-1.5 rounded-sm hover:bg-[var(--border-color)]/30"
            aria-label="Copy to clipboard"
            title="Copy entry"
          >
            {copied ? <Check size={14} className="text-green-600"/> : <Copy size={14} />}
          </button>
          <button 
            onClick={() => onDelete(item.id)}
            className="text-[var(--text-secondary)] hover:text-red-500 transition-colors p-1.5 rounded-sm hover:bg-red-500/10"
            aria-label="Delete item"
            title="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mb-5 relative z-10">
          <div className="text-sm text-[var(--text-secondary)] mb-3 font-serif-jp whitespace-pre-wrap leading-relaxed opacity-80">{item.originalInput}</div>
          
          <div className="pl-4 border-l border-[var(--border-color)]">
            <div className="flex flex-col relative">
                {/* Furigana Toggle Button */}
                <button 
                  onClick={() => setShowFurigana(!showFurigana)}
                  className="absolute -right-2 top-0 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-50 hover:opacity-100 transition-opacity"
                  title={showFurigana ? "Hide reading" : "Show reading"}
                >
                  {showFurigana ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>

                <div className={`transition-opacity duration-300 ${showFurigana ? 'opacity-100' : 'opacity-0 select-none'}`}>
                   <span className="text-sm font-serif-jp mb-1 text-[var(--accent)] whitespace-pre-wrap">{item.reading}</span>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold font-serif-jp leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{item.japanese}</h3>
                <div className="flex flex-col gap-2 mt-3">
                    <span className="text-xs font-mono text-[var(--text-secondary)] opacity-70">[{item.romaji}]</span>
                    <span className="text-xs font-medium px-2 py-1 rounded text-[var(--text-primary)] bg-[var(--border-color)]/50 self-start">{item.englishDefinition}</span>
                </div>
            </div>
          </div>
      </div>

      {/* Grammar / Nuance Note */}
      {item.grammarNote && (
        <div className="mb-4 flex gap-2 items-start text-[var(--text-secondary)] bg-white/30 p-2 rounded border border-[var(--border-color)]/30">
           <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500/80" />
           <p className="text-xs font-serif-jp leading-relaxed italic">{item.grammarNote}</p>
        </div>
      )}

      {/* Example Sentence */}
      <div className="mb-6 p-4 rounded-sm border relative z-10 bg-[var(--accent-bg)] border-[var(--accent-bg)]">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs mb-1 uppercase tracking-wide opacity-60 text-[var(--text-primary)]">
                    <BookOpen size={10} /> Usage Example
                </div>
                <div className="text-lg font-serif-jp text-[var(--text-primary)]">{item.exampleJapanese}</div>
                <div className="text-xs font-serif-jp text-[var(--accent)] opacity-90">{item.exampleReading}</div>
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
                title="Loop playback with 3.2s interval"
            >
                <Repeat size={14} />
                <span>Loop (3.2s)</span>
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