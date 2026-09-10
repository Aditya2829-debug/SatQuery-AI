import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Satellite, Sun, Moon } from 'lucide-react';
import { useSatStore } from '../../store/useSatStore';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useSatStore();

  if (location.pathname === '/') {
    return null;
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/analyze', label: 'Analyze' },
    { to: '/history', label: 'History' },
    { to: '/about', label: 'About' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-300 ${
        darkMode
          ? 'border-slate-800 bg-slate-950 text-white'
          : 'border-slate-200/80 bg-white text-slate-900'
      }`}
    >
      <div className="w-full flex items-center justify-between px-6 sm:px-8 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2.5 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Satellite className="h-5 w-5" />
          </div>
          <span className="font-extrabold tracking-tight">SatQuery AI</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative py-1 transition ${
                  isActive
                    ? darkMode
                      ? 'text-blue-400 font-bold'
                      : 'text-blue-600 font-bold'
                    : darkMode
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
                {isActive && (
                  <span
                    className={`absolute bottom-[-13px] left-0 right-0 h-[2px] rounded-full ${
                      darkMode ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle & Avatar */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle Theme Mode"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer shadow-xs ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm ring-2 ring-blue-100 dark:ring-blue-900/50">
            A
          </div>
        </div>
      </div>
    </header>
  );
};
