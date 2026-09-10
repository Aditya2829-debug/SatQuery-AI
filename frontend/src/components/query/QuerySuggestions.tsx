import React from 'react';

export const QUERY_TEMPLATES = {
  vqa: [
    'What objects are visible in this image?',
    'How many buildings can you see?',
    'Is there any water body present?',
  ],
  captioning: [
    'Describe the land-cover and major objects visible in this image.',
    'Provide a detailed scene description.',
  ],
  grounding: [
    'Highlight the water body referred to in the query.',
    'Locate all built-up areas in this image.',
  ],
  change: [
    'What changed between these two dates, and where did the change occur?',
    'Has the built-up area increased, decreased, or remained unchanged?',
    'Show me areas where vegetation has decreased.',
  ],
  crossModal: [
    'Use the optical and SAR images together to identify built-up and water-covered regions.',
    'Combine both images to detect urban areas.',
  ],
};

export interface QuerySuggestionsProps {
  onSelect: (query: string) => void;
}

export const QuerySuggestions: React.FC<QuerySuggestionsProps> = ({ onSelect }) => {
  const quickList = [
    'Describe the land-cover and major objects visible in this image.',
    'Highlight the water body referred to in the query.',
    'What changed between these two dates, and where did the change occur?',
    'Use the optical and SAR images together to identify built-up and water-covered regions.',
    'Has the built-up area increased, decreased, or remained unchanged?',
  ];

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {quickList.map((tpl, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(tpl)}
          className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition truncate max-w-xs"
        >
          {tpl}
        </button>
      ))}
    </div>
  );
};
