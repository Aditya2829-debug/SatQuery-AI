import React, { useState } from 'react';
import { Search, MoreVertical, CheckCircle2, Trash2, ArrowUpRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSatStore } from '../store/useSatStore';

export const HistoryPage: React.FC = () => {
  const { history, deleteHistoryItem, clearHistory, darkMode } = useSatStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = history.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || item.taskType === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div
      className={`min-h-[calc(100vh-57px)] w-full py-8 px-6 transition-colors duration-200 select-none ${
        darkMode ? 'bg-[#030712] text-white' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Previous Analyses</h1>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              View and manage your past queries and results.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-red-500 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search past queries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl border py-2 pl-9 pr-4 text-xs focus:border-blue-500 focus:outline-none transition ${
                darkMode
                  ? 'border-slate-800 bg-slate-900 text-white placeholder-slate-500'
                  : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none transition ${
              darkMode
                ? 'border-slate-800 bg-slate-900 text-slate-300'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <option value="All">All Types</option>
            <option value="VQA">VQA</option>
            <option value="Grounding">Grounding</option>
            <option value="Change Detection">Change Detection</option>
            <option value="Cross-modal Fusion">Cross-modal Fusion</option>
          </select>
        </div>

        {/* Dynamic History List */}
        {filtered.length === 0 ? (
          <div
            className={`rounded-2xl border p-12 text-center space-y-3 transition-colors ${
              darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold">No past analyses recorded</h3>
            <p className={`text-xs max-w-sm mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Head over to the Analyze console and submit a query to automatically build your session history.
            </p>
            <div className="pt-2">
              <Link
                to="/analyze"
                className="inline-flex items-center space-x-1.5 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
              >
                <span>Go to Analyze</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-2xl border p-4 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700 ${
                  darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4 min-w-0 pr-2">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80';
                    }}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.date} •{' '}
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {item.taskType}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="flex items-center space-x-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{item.status}</span>
                  </span>

                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    aria-label="Delete history entry"
                    className="p-1 text-slate-400 hover:text-red-500 transition"
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
