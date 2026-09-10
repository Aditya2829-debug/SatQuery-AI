import React from 'react';
import { NavLink } from 'react-router-dom';
import { UploadCloud, Compass, History, FileSpreadsheet, Settings } from 'lucide-react';

export const Navigation: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Console / Upload', icon: UploadCloud },
    { to: '/history', label: 'Query History', icon: History },
    { to: '/reports', label: 'Intelligence Reports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Agent Settings', icon: Settings },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-darkCard">
      <div className="mx-auto flex max-w-7xl space-x-1 px-4 sm:px-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors duration-150 ${
                  isActive
                    ? 'border-primary text-primary font-semibold dark:border-secondary dark:text-secondary-light'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};