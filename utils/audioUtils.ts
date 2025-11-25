// Decodes base64 string to a raw string
function atobRaw(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Converts raw PCM data (Float32) to a WAV Blob
export function pcmToWav(channels: number, sampleRate: number, samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, channels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * channels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, channels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write the PCM samples
  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

export async function decodeAudioData(
  base64Data: string, 
  sampleRate = 24000
): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate
  });
  
  const byteArray = atobRaw(base64Data);
  
  // Create a buffer for the raw PCM data
  // The API returns raw PCM 16-bit integers usually, but let's verify format.
  // Actually, Gemini TTS output is raw PCM. 
  // We need to convert the bytes into an AudioBuffer.
  
  // IMPORTANT: The `decodeAudioData` method of AudioContext expects a full file with headers (mp3/wav).
  // Raw PCM needs to be manually parsed.
  
  // Assuming 16-bit PCM, Little Endian, 1 channel (standard for Gemini TTS output usually)
  const int16Array = new Int16Array(byteArray.buffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    // Convert Int16 to Float32 [-1.0, 1.0]
    float32Array[i] = int16Array[i] / 32768.0;
  }

  const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);
  
  // Close context immediately as we just needed the buffer structure utility
  await audioContext.close();

  return audioBuffer;
}

export async function convertBase64PCMToWavBlob(base64Data: string, sampleRate = 24000): Promise<Blob> {
    const byteArray = atobRaw(base64Data);
    const int16Array = new Int16Array(byteArray.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    return pcmToWav(1, sampleRate, float32Array);
}
