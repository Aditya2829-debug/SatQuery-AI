import React from 'react';
import { Cpu, CheckCircle, Clock } from 'lucide-react';
import { useSatStore } from '../../store/useSatStore';

export const ModelSelector: React.FC = () => {
  const { models, selectedModelId, setSelectedModelId } = useSatStore();

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase text-slate-500">Available AI Models</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {models.map((model) => {
          const isSelected = selectedModelId === model.id;
          return (
            <div
              key={model.id}
              onClick={() => setSelectedModelId(model.id)}
              className={`rounded-xl border p-3.5 cursor-pointer transition ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">{model.name}</span>
                </div>
                {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">{model.description}</p>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>Acc: {model.accuracy}%</span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {model.latency}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
