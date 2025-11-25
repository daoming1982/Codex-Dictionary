import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 1. Analyze and Translate text
export const analyzeText = async (text: string) => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze: "${text}".
    Output JSON.
    1. If input != Japanese, translate to Japanese.
    2. Provide reading (Hiragana/Katakana), Romaji, English definition.
    3. Provide 1 simple Japanese example sentence with reading & English.`,
    config: {
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
          exampleEnglish: { type: Type.STRING }
        },
        required: ["japanese", "reading", "romaji", "englishDefinition", "exampleJapanese", "exampleReading", "exampleEnglish"]
      }
    }
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