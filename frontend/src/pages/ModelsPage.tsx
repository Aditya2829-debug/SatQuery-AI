import React from 'react';
import { ModelItem } from '../types';
import { Cpu } from 'lucide-react';

const MODELS: ModelItem[] = [
  {
    id: 'm1',
    name: 'Qwen2-VL / Qwen3-VL (VQA + Captioning)',
    category: 'VQA + Captioning',
    description: 'Multimodal vision-language model for remote-sensing question answering.',
    status: 'Active',
  },
  {
    id: 'm2',
    name: 'RemoteCLIP (Classification)',
    category: 'Classification',
    description: 'Contrastive image-text matching and zero-shot satellite classification.',
    status: 'Active',
  },
  {
    id: 'm3',
    name: 'Grounding Model',
    category: 'Grounding',
    description: 'Locates and produces bounding-box coordinates for requested objects.',
    status: 'Active',
  },
  {
    id: 'm4',
    name: 'Change Detection (CD003 U-Net)',
    category: 'Change Detection',
    description: 'Detects structural, vegetative, and water shifts between bi-temporal images.',
    status: 'Active',
  },
  {
    id: 'm5',
    name: 'Optical + SAR Fusion',
    category: 'Multimodal Fusion',
    description: 'Joint cross-attention analysis using optical and radar backscatter.',
    status: 'Experimental',
  },
];

export const ModelsPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">AI Specialist Models</h1>
        <p className="text-xs text-slate-500">Different models for different remote-sensing tasks.</p>
      </div>

      <div className="space-y-3">
        {MODELS.map((model) => (
          <div
            key={model.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{model.name}</h3>
                <p className="text-xs text-slate-500">{model.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  model.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                {model.status}
              </span>
              <button
                onClick={() => alert(`Weights & Benchmarks for ${model.name}`)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
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
