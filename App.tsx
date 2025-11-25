import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateJapaneseSpeech, analyzeText } from './services/geminiService';
import { convertBase64PCMToWavBlob } from './utils/audioUtils';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from './utils/storage';
import { DictionaryEntry, VoiceName } from './types';
import { ReviewCard } from './components/ReviewCard';
import { BookOpen, AlertCircle, Loader2, Search, PenTool, Feather } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'codex_dictionary_items';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dictionaryItems, setDictionaryItems] = useState<DictionaryEntry[]>([]);
  const [latestItemId, setLatestItemId] = useState<string | null>(null);
  
  const listTopRef = useRef<HTMLDivElement>(null);

  // Load from LocalStorage and IndexedDB on mount
  useEffect(() => {
    const loadHistory = async () => {
        try {
            // Load items
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!saved) {
                setIsInitializing(false);
                return;
            }

            const parsed: DictionaryEntry[] = JSON.parse(saved);
            
            // Rehydrate with blobs from IndexedDB
            const hydratedItems = await Promise.all(parsed.map(async (item) => {
                const nativeBlob = await getAudioBlob(item.id, 'native');
                
                return {
                    ...item,
                    audioUrl: nativeBlob ? URL.createObjectURL(nativeBlob) : null,
                };
            }));
            
            setDictionaryItems(hydratedItems);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsInitializing(false);
        }
    };

    loadHistory();
  }, []);

  // Save metadata to LocalStorage whenever items change
  useEffect(() => {
    if (isInitializing) return;

    const dataToSave = dictionaryItems.map(({ 
        id, originalInput, japanese, reading, romaji, englishDefinition, 
        exampleJapanese, exampleReading, exampleEnglish, timestamp 
    }) => ({
      id, originalInput, japanese, reading, romaji, englishDefinition,
      exampleJapanese, exampleReading, exampleEnglish, timestamp
    }));
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [dictionaryItems, isInitializing]);

  // Separate Audio Generation Task to not block UI
  const generateAndSaveAudio = async (id: string, text: string) => {
     try {
        const base64PCM = await generateJapaneseSpeech(text, VoiceName.Kore);
        const wavBlob = await convertBase64PCMToWavBlob(base64PCM);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        await saveAudioBlob(id, 'native', wavBlob);

        setDictionaryItems(prev => prev.map(item => 
             item.id === id ? { ...item, audioUrl } : item
        ));
     } catch (err) {
         console.error("Background audio generation failed for", id, err);
     }
  };

  const handleLookup = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setLatestItemId(null);

    try {
      // 1. Analyze and Translate text (Fast)
      const analysis = await analyzeText(inputText);

      const newItemId = crypto.randomUUID();

      // 2. Create new entry IMMEDIATELY without audio
      const newItem: DictionaryEntry = {
        id: newItemId,
        originalInput: inputText,
        japanese: analysis.japanese,
        reading: analysis.reading,
        romaji: analysis.romaji,
        englishDefinition: analysis.englishDefinition,
        exampleJapanese: analysis.exampleJapanese,
        exampleReading: analysis.exampleReading,
        exampleEnglish: analysis.exampleEnglish,
        timestamp: Date.now(),
        audioUrl: null, // Audio loads later
      };

      setDictionaryItems(prev => [newItem, ...prev]);
      setLatestItemId(newItemId);
      setInputText('');
      
      // Scroll to top
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      setIsAnalyzing(false); // Unlock UI immediately

      // 3. Trigger background audio generation
      generateAndSaveAudio(newItemId, analysis.japanese);

    } catch (err: any) {
      setError(err.message || "Failed to process text. Please try again.");
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  const handlePlayRequest = useCallback(async (id: string) => {
    const item = dictionaryItems.find(i => i.id === id);
    if (!item) return;
    // Trigger generation if missing
    await generateAndSaveAudio(id, item.japanese);
  }, [dictionaryItems]);

  const handleDelete = useCallback(async (id: string) => {
    const itemToDelete = dictionaryItems.find(item => item.id === id);
    if (itemToDelete) {
      if (itemToDelete.audioUrl) URL.revokeObjectURL(itemToDelete.audioUrl);
    }

    setDictionaryItems(prev => prev.filter(item => item.id !== id));
    
    try {
        await deleteAudioBlob(id);
    } catch (e) {
        console.error("Failed to delete from DB", e);
    }
  }, [dictionaryItems]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Sidebar / Lookup Section */}
      <div className="w-full md:w-[420px] bg-[var(--bg-sidebar)] text-[var(--text-sidebar)] flex flex-col h-auto md:h-screen sticky top-0 z-20 shadow-2xl">
        <div className="p-8 border-b border-[var(--border-color)]/10">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-white/10 p-2 rounded-sm border border-white/10">
                    <Feather size={24} className="text-[var(--text-sidebar)]" />
                </div>
                <div>
                    <h1 className="text-2xl font-serif-jp font-bold tracking-wide text-[var(--text-sidebar)]">Codex Dictionary</h1>
                    <p className="text-[10px] text-[var(--text-sidebar-muted)] uppercase tracking-[0.2em] font-medium">Japanese Lexicon</p>
                </div>
            </div>
        </div>

        <div className="p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
            <div>
                <label className="block text-xs font-bold text-[var(--text-sidebar-muted)] mb-3 uppercase tracking-wider flex items-center gap-2">
                    <PenTool size={12} /> Input
                </label>
                <div className="relative group">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter text here..."
                        className="w-full h-40 p-5 rounded-sm border border-[var(--border-color)]/20 bg-[var(--input-bg)] text-[var(--input-text)] placeholder-[var(--text-sidebar-muted)]/50 focus:ring-1 focus:ring-[var(--text-sidebar-muted)] focus:border-[var(--text-sidebar-muted)] resize-none text-lg leading-relaxed transition-all font-serif-jp"
                        disabled={isAnalyzing}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 text-red-200 p-4 rounded-sm text-sm flex items-start gap-3 border border-red-900/30">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button
                onClick={handleLookup}
                disabled={isAnalyzing || !inputText.trim()}
                className="w-full py-4 rounded-sm bg-[var(--button-bg)] text-[var(--button-text)] font-serif-jp font-bold shadow-lg hover:bg-[var(--button-bg-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-wide"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                ) : (
                    <>
                        <Search size={18} /> Look Up
                    </>
                )}
            </button>
            
            <div className="mt-auto pt-8">
                 <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
                    <div className="text-[10px] uppercase tracking-[0.3em] mb-1 font-serif-jp text-[var(--text-sidebar-muted)]">Powered by</div>
                    <div className="font-bold font-serif-jp text-sm tracking-widest text-[var(--text-sidebar)]">Codex Japan Co., Ltd.</div>
                 </div>
            </div>
        </div>
      </div>

      {/* Main Content / List - Washi Paper Style */}
      <div className="flex-1 bg-washi h-auto md:h-screen overflow-y-auto relative">
        <div className="max-w-2xl mx-auto p-6 md:p-12 pb-32">
            <div ref={listTopRef} />
            
            <div className="flex items-end justify-between mb-12 border-b-2 border-[var(--border-color)] pb-4">
                <div>
                    <h2 className="text-3xl font-serif-jp font-bold text-[var(--text-primary)]">Vocabulary</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 font-serif-jp">Personal Collection</p>
                </div>
                <div className="font-mono text-xs text-[var(--text-secondary)]">
                    {dictionaryItems.length} ITEMS
                </div>
            </div>

            {isInitializing ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-50">
                     <Loader2 className="animate-spin text-[var(--text-primary)] mb-4" size={24} />
                     <p className="text-[var(--text-secondary)] font-serif-jp text-sm">Loading Codex...</p>
                </div>
            ) : dictionaryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300 border border-[var(--border-color)] border-dashed rounded-sm">
                    <BookOpen size={48} className="mb-6 opacity-20 text-[var(--text-secondary)]" />
                    <p className="text-xl font-serif-jp text-[var(--text-secondary)] mb-2">No entries yet</p>
                    <p className="text-sm font-sans text-[var(--text-secondary)]">Begin your journey by adding a word.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {dictionaryItems.map(item => (
                        <ReviewCard 
                            key={item.id} 
                            item={item} 
                            onDelete={handleDelete}
                            onPlayRequest={handlePlayRequest}
                            autoPlay={item.id === latestItemId}
                        />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;