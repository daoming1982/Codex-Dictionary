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
      systemInstruction: `You are a Japanese translator and dictionary Codex. 
      Your task is to process the User Input and output a JSON object.
      
      RULES:
      1. 'japanese': Translate the ENTIRE User Input into natural Japanese. 
         - If the input is a paragraph, translate the whole paragraph. 
         - Do not summarize. 
         - Do not truncate. 
         - Preserve line breaks.
         - If the input is already Japanese, keep it as is (or correct natural phrasing).
      2. 'reading': Provide the full reading (Furigana) in Hiragana/Katakana for the 'japanese' field.
      3. 'romaji': Provide the Romaji for the 'japanese' field.
      4. 'englishDefinition': 
         - If input is a word: provide the definition.
         - If input is a sentence/paragraph: provide the English translation of the meaning.
      5. 'exampleJapanese': Create a NEW, SHORT, SIMPLE example sentence using the main vocabulary from the input (different from the input itself).
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
          exampleEnglish: { type: Type.STRING }
        },
        required: ["japanese", "reading", "romaji", "englishDefinition", "exampleJapanese", "exampleReading", "exampleEnglish"]
      }
    },
    contents: [{ parts: [{ text: text }] }] // Pass text directly as content
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