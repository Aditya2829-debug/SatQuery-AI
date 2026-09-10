import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  LayoutDashboard,
  History,
  BookmarkCheck,
  FileSpreadsheet,
  Database,
  Cpu,
  Settings,
} from 'lucide-react';
import { useSatStore } from '../../store/useSatStore';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { setStage } = useSatStore();

  const menuItems = [
    { to: '/analyze', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/history', label: 'History', icon: History },
    { to: '/analyze', label: 'Saved Results', icon: BookmarkCheck },
    { to: '/report', label: 'Reports', icon: FileSpreadsheet },
    { to: '/datasets', label: 'Datasets', icon: Database },
    { to: '/models', label: 'Models', icon: Cpu },
    { to: '/about', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200/80 bg-[#F8FAFC] p-5 flex flex-col justify-between min-h-[calc(100vh-57px)]">
      <div className="space-y-4">
        {/* New Query Button */}
        <button
          onClick={() => setStage('dashboard')}
          className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Query</span>
        </button>

        {/* Navigation list */}
        <nav className="space-y-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const isDashboardActive = location.pathname === '/analyze' && item.label === 'Dashboard';
            const isOtherActive = location.pathname === item.to && item.label !== 'Dashboard' && item.label !== 'Saved Results';
            const active = isDashboardActive || isOtherActive;

            return (
              <Link
                key={idx}
                to={item.to}
                onClick={() => {
                  if (item.label === 'Dashboard') setStage('dashboard');
                }}
                className={`flex items-center space-x-3.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
