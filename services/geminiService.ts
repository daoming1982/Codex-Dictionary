import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 1. Analyze and Translate text
export const analyzeText = async (text: string) => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `You are Codex Love Dictionary, an expert Japanese lexicographer and translator. 
      Your task is to analyze the User Input and output a structured JSON object for a learner's dictionary.
      
      RULES:
      1. 'japanese': Translate the ENTIRE User Input into natural Japanese.
      2. 'reading': Provide the full reading (Furigana) in Hiragana/Katakana.
      3. 'romaji': Provide the Romaji.
      4. 'englishDefinition': Concise meaning.
      5. 'exampleJapanese': Create a NEW, SHORT example sentence using the main vocabulary.
      6. 'jlpt': Estimate the JLPT level of the main vocabulary (N5, N4, N3, N2, N1, or Unknown).
      7. 'partOfSpeech': The grammatical classification (e.g., Noun, Godan Verb, I-Adjective, Phrase).
      8. 'grammarNote': A brief, helpful tip about usage nuance, cultural context, or grammar rules (max 20 words).
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          japanese: { type: Type.STRING },
          reading: { type: Type.STRING },
          romaji: { type: Type.STRING },
          englishDefinition: { type: Type.STRING },
          exampleJapanese: { type: Type.STRING },
          exampleReading: { type: Type.STRING },
          exampleEnglish: { type: Type.STRING },
          jlpt: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          grammarNote: { type: Type.STRING }
        },
        required: ["japanese", "reading", "romaji", "englishDefinition", "exampleJapanese", "exampleReading", "exampleEnglish", "jlpt", "partOfSpeech", "grammarNote"]
      }
    },
    contents: [{ parts: [{ text: text }] }] 
  });

  const jsonStr = response.text;
  if (!jsonStr) throw new Error("Failed to parse dictionary response");
  
  return JSON.parse(jsonStr);
};

// 2. Generate Audio (TTS)
export const generateJapaneseSpeech = async (text: string, voiceName: VoiceName = VoiceName.Kore): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data received from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};