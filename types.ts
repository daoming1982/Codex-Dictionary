export interface DictionaryEntry {
  id: string;
  originalInput: string;     // What the user typed (e.g., "Apple" or "你好")
  japanese: string;          // The translated Japanese (e.g., "林檎")
  reading: string;           // Hiragana/Katakana (e.g., "りんご")
  romaji: string;            // Romaji (e.g., "ringo")
  englishDefinition: string; // English meaning context
  
  // New fields for context
  exampleJapanese: string;   // Example sentence in Japanese
  exampleReading: string;    // Example sentence reading
  exampleEnglish: string;    // Example sentence translation

  timestamp: number;
  
  // Audio state (URLs are session-based, blobs stored in IndexedDB)
  audioUrl?: string | null; 
}

export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}