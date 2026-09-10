import React from 'react';
import { DatasetItem } from '../types';

const DATASETS: DatasetItem[] = [
  {
    id: 'd1',
    name: 'VRSBench',
    description: 'Remote sensing visual captioning and grounding dataset.',
    imageCount: '29K Images',
    qaCount: '125K QA pairs',
    thumbnail: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'd2',
    name: 'RSVQA',
    description: 'Remote sensing visual question answering dataset.',
    imageCount: 'Various scenes',
    qaCount: 'QA pairs',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'd3',
    name: 'EuroSAT',
    description: 'Land cover classification dataset with multi-spectral channels.',
    imageCount: '27K Images',
    classesCount: '10 classes',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'd4',
    name: 'LEVIR-CD+',
    description: 'Bitemporal change detection dataset featuring high resolution.',
    imageCount: '637 pairs',
    classesCount: 'High resolution',
    thumbnail: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=400&q=80',
  },
];

export const DatasetsPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Datasets</h1>
        <p className="text-xs text-slate-500">Datasets used for training and AI results.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DATASETS.map((ds) => (
          <div
            key={ds.id}
            className="flex space-x-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <img
              src={ds.thumbnail}
              alt={ds.name}
              className="h-28 w-28 rounded-xl object-cover"
            />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{ds.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ds.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {ds.imageCount}
                  </span>
                  {ds.qaCount && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {ds.qaCount}
                    </span>
                  )}
                  {ds.classesCount && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {ds.classesCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => alert(`Viewing metadata for dataset: ${ds.name}`)}
                className="mt-3 w-fit rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
