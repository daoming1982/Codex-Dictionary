import React from 'react';

export const AudioVisualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  if (!isPlaying) return null;
  
  return (
    <div className="flex items-end gap-1 h-6">
      <div className="w-1 bg-indigo-500 animate-[bounce_1s_infinite] h-3"></div>
      <div className="w-1 bg-indigo-500 animate-[bounce_1.2s_infinite] h-5"></div>
      <div className="w-1 bg-indigo-500 animate-[bounce_0.8s_infinite] h-4"></div>
      <div className="w-1 bg-indigo-500 animate-[bounce_1.1s_infinite] h-6"></div>
      <div className="w-1 bg-indigo-500 animate-[bounce_0.9s_infinite] h-3"></div>
    </div>
  );
};
