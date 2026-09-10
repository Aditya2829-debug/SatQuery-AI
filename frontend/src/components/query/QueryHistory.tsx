import React from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { Query } from '../../types';

export interface QueryHistoryProps {
  queries: Query[];
  onSelect: (query: Query) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({
  queries,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  if (queries.length === 0) {
    return <div className="text-xs text-slate-400 py-3">No recent query history.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-slate-500">Recent Queries</span>
        {onClearAll && (
          <button onClick={onClearAll} className="text-[11px] text-slate-400 hover:text-red-500">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {queries.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs hover:border-slate-300 transition"
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center space-x-1.5">
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {q.taskType}
                </span>
                <span className="flex items-center text-[10px] text-slate-400">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="mt-1 font-medium text-slate-800 truncate">{q.text}</p>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => onSelect(q)}
                aria-label="Re-run Query"
                className="rounded p-1 text-slate-400 hover:text-blue-600"
                title="Re-run Query"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(q.id)}
                aria-label="Delete Query"
                className="rounded p-1 text-slate-400 hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
