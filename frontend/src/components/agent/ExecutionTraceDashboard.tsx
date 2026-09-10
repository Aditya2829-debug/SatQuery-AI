import React from 'react';
import { CheckCircle2, Loader2, StopCircle, Terminal } from 'lucide-react';
import { useSatStore } from '../../store/useSatStore';

export const ExecutionTraceDashboard: React.FC = () => {
  const { currentTrace, cancelTrace } = useSatStore();

  if (!currentTrace) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        Agent telemetry standby. Run a query to view execution trace.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Agent Execution Trace ({currentTrace.id})
          </h3>
        </div>

        <button
          onClick={cancelTrace}
          className="flex items-center space-x-1 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          <StopCircle className="h-3.5 w-3.5" />
          <span>Cancel Execution</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {currentTrace.steps.map((s, idx) => (
          <div
            key={s.id}
            className={`rounded-xl border p-3 ${
              s.status === 'completed'
                ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                : s.status === 'running'
                ? 'border-blue-300 bg-blue-50/50 text-blue-800'
                : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {s.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : s.status === 'running' ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300" />
              )}
              <span className="text-xs font-bold truncate">
                {idx + 1}. {s.name}
              </span>
            </div>
            {s.details && <p className="mt-1 text-[10px] opacity-80">{s.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
