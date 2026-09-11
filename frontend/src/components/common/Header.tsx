import React from 'react';
import { Satellite, Moon, Sun } from 'lucide-react';
import { useSatStore } from '../../store/useSatStore';

export const Header: React.FC = () => {
  const {
    darkMode,
    toggleDarkMode,
  } = useSatStore();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-surface-dark/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md">
            <Satellite className="h-6 w-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-primary dark:text-white">
                SatQuery AI
              </span>

              <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary dark:bg-secondary/30 dark:text-secondary-light">
                Agentic v2.4
              </span>
            </div>

            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              Autonomous Vision-Language Satellite Intelligence
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={
              darkMode
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* User profile avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700 dark:bg-slate-700 dark:text-white">
            SQ
          </div>
        </div>
      </div>
    </header>
  );
};