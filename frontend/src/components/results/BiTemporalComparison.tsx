import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

export interface BiTemporalComparisonProps {
  beforeImg: string;
  afterImg: string;
  beforeDate?: string;
  afterDate?: string;
}

export const BiTemporalComparison: React.FC<BiTemporalComparisonProps> = ({
  beforeImg,
  afterImg,
  beforeDate = '2023-01-01',
  afterDate = '2023-08-01',
}) => {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-slate-600">
        <span>Before ({beforeDate})</span>
        <span className="font-mono text-blue-600">Interactive Swipe</span>
        <span>After ({afterDate})</span>
      </div>

      <div className="relative h-64 w-full select-none overflow-hidden rounded-2xl border border-slate-200">
        <img src={afterImg} alt="After" className="absolute inset-0 h-full w-full object-cover" />

        <div
          className="absolute inset-0 h-full w-full overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={beforeImg}
            alt="Before"
            className="absolute inset-0 h-full max-w-none object-cover"
            style={{ width: '100%' }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 z-20 w-1 cursor-ew-resize bg-blue-500 shadow-md"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          aria-label="Swipe comparison slider"
          className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  );
};
