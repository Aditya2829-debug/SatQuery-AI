import React, { useState } from 'react';
import { Send, Mic, Sparkles } from 'lucide-react';
import { QuerySuggestions } from './QuerySuggestions';
import { useSatStore } from '../../store/useSatStore';
import { QueryTaskType } from '../../types';

export const QueryInterface: React.FC = () => {
  const { activeQueryText, setActiveQueryText, setStage, addQuery } = useSatStore();
  const [isListening, setIsListening] = useState(false);

  const detectTaskType = (text: string): QueryTaskType => {
    const t = text.toLowerCase();
    if (t.includes('change') || t.includes('dates')) return 'change';
    if (t.includes('highlight') || t.includes('locate') || t.includes('where')) return 'grounding';
    if (t.includes('sar') || t.includes('optical and')) return 'cross-modal';
    if (t.includes('describe') || t.includes('caption')) return 'captioning';
    return 'vqa';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeQueryText.trim()) return;

    addQuery({
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      text: activeQueryText,
      timestamp: new Date(),
      imageIds: [],
      taskType: detectTaskType(activeQueryText),
      status: 'completed',
    });

    setStage('analyzing');
  };

  const detectedTask = detectTaskType(activeQueryText);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          type="text"
          value={activeQueryText}
          onChange={(e) => setActiveQueryText(e.target.value)}
          placeholder="Ask a question about the image..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-5 pr-28 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="absolute right-2.5 top-2.5 flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsListening(!isListening)}
            aria-label="Voice input"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              isListening
                ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600'
            }`}
            title="Voice input (speech-to-text)"
          >
            <Mic className="h-4 w-4" />
          </button>

          <button
            type="submit"
            aria-label="Submit query"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Auto-detected task hint */}
      {activeQueryText.trim() && (
        <div className="flex items-center space-x-2 text-xs text-slate-500 pl-1">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>
            Detected Task:{' '}
            <span className="font-bold text-blue-700 uppercase">{detectedTask}</span>
          </span>
        </div>
      )}

      {/* Pre-built suggestions */}
      <QuerySuggestions onSelect={(tpl) => setActiveQueryText(tpl)} />
    </div>
  );
};
