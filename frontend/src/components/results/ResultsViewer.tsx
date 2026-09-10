import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Sparkles, Map, BarChart3, SplitSquareHorizontal } from 'lucide-react';
import { Result } from '../../types';
import { LeafletMapView } from './LeafletMapView';
import { BiTemporalComparison } from './BiTemporalComparison';
import { AnalyticsChart } from './AnalyticsChart';

export interface ResultsViewerProps {
  result: Result;
  beforeImg?: string;
  afterImg?: string;
  changeMaskImg?: string;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  result,
  beforeImg = 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=700&q=80',
  afterImg = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=700&q=80',
  changeMaskImg = 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=700&q=80',
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'map' | 'charts'>('visual');

  return (
    <div className="space-y-6">
      {/* 3-card comparative overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
            Before (2023-01-01)
          </div>
          <img src={beforeImg} alt="Before" className="h-56 w-full object-cover" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
            After (2023-08-01)
          </div>
          <img src={afterImg} alt="After" className="h-56 w-full object-cover" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Detected Changes</span>
            <span className="flex items-center space-x-1 text-[10px] text-red-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-600 inline-block" />
              <span>Changed Area</span>
            </span>
          </div>
          <img src={changeMaskImg} alt="Detected Changes" className="h-56 w-full object-cover" />
        </div>
      </div>

      {/* Answer & Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-500 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>AI Answer</span>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">{result.text}</p>
          </div>

          {result.evidencePoints && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-bold uppercase text-slate-500 mb-2">Evidence</div>
              <ul className="space-y-1 text-xs text-slate-600">
                {result.evidencePoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactive tabs */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  activeTab === 'visual' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                <span>Swipe Diff</span>
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  activeTab === 'map' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                <span>Interactive Map</span>
              </button>
              {result.analytics && (
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    activeTab === 'charts' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Composition Chart</span>
                </button>
              )}
            </div>

            {activeTab === 'visual' && (
              <BiTemporalComparison beforeImg={beforeImg} afterImg={afterImg} />
            )}
            {activeTab === 'map' && (
              <LeafletMapView annotations={result.visualEvidence?.annotations} />
            )}
            {activeTab === 'charts' && result.analytics && (
              <AnalyticsChart data={result.analytics} />
            )}
          </div>
        </div>

        {/* Confidence Card */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500">Confidence</h3>
            <div className="mt-3 flex items-center space-x-2">
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                High ({result.confidence})
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] text-slate-400">Model: {result.metadata.modelUsed}</p>
            <div className="flex items-center space-x-2">
              <Link
                to="/report"
                className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Full PDF Report</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
