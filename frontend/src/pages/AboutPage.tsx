import React from 'react';
import { Eye, ShieldCheck, Globe } from 'lucide-react';
import { TeamMember } from '../types';
import { useSatStore } from '../store/useSatStore';

const TEAM: TeamMember[] = [
  { name: 'Aditya Srivastava', role: 'CSE (AI)', initial: 'A', color: 'bg-blue-600' },
  { name: 'Gaurav Verma', role: 'CSE (AI & ML)', initial: 'G', color: 'bg-sky-500' },
  { name: 'Sanskriti Gupta', role: 'IT', initial: 'S', color: 'bg-indigo-600' },
  { name: 'Satyam Jain', role: 'IT', initial: 'S', color: 'bg-teal-600' },
  { name: 'Lakshaya Gupta', role: 'CSE (AI & ML)', initial: 'L', color: 'bg-blue-500' },
  { name: 'Aditya Singhal', role: 'CSE (AI & ML)', initial: 'A', color: 'bg-violet-600' },
];

export const AboutPage: React.FC = () => {
  const { darkMode } = useSatStore();

  return (
    <div
      className={`min-h-[calc(100vh-57px)] w-full py-8 px-6 select-none transition-colors duration-200 ${
        darkMode ? 'bg-[#030712] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Intro Section */}
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">About SatQuery AI</h1>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Making Earth-observation intelligence accessible to everyone.
          </p>
          <p
            className={`text-xs leading-relaxed max-w-3xl ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            SatQuery AI is an interactive vision-language assistant for multimodal remote-sensing
            image analysis. Our goal is to simplify satellite data analysis through natural language
            queries, combining state-of-the-art AI models with evidence-grounded reasoning.
          </p>
        </div>

        {/* 3 Core Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className={`flex items-center space-x-3 rounded-2xl border p-4 shadow-sm transition-colors ${
              darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold">Accessibility</span>
          </div>
          <div
            className={`flex items-center space-x-3 rounded-2xl border p-4 shadow-sm transition-colors ${
              darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">Reliability</span>
          </div>
          <div
            className={`flex items-center space-x-3 rounded-2xl border p-4 shadow-sm transition-colors ${
              darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-xs font-bold">Real-World Impact</span>
          </div>
        </div>

        {/* Team Section (2 Vertical Columns with 3 Members Each) */}
        <div className="space-y-4">
          <h2
            className={`text-xs font-bold uppercase tracking-wider ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            OUR TEAM
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM.map((member, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-3.5 rounded-2xl border p-4 shadow-xs transition hover:border-blue-400 dark:hover:border-blue-500 ${
                  darkMode
                    ? 'border-slate-800 bg-slate-900/90 text-white'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm shadow-sm ${member.color}`}
                >
                  {member.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{member.name}</p>
                  <p
                    className={`text-xs font-medium truncate mt-0.5 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote Banner */}
        <div
          className={`rounded-2xl border p-5 text-center transition-colors ${
            darkMode
              ? 'border-slate-800 bg-slate-900/60 text-slate-300'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <p className="text-xs sm:text-sm font-medium italic">
            "From satellite imagery to real-world impact." 🌿
          </p>
        </div>

      </div>
    </div>
  );
};
