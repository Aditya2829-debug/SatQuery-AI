import React from 'react';
import { useSatStore } from '../store/useSatStore';
import { ModelSelector } from '../components/agent/ModelSelector';
import { Settings, Sliders, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSatStore();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-4">
        <Settings className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Preferences & System Configuration</h1>
          <p className="text-xs text-slate-500">Configure vision-language models and inference thresholds.</p>
        </div>
      </div>

      {/* Model Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ModelSelector />
      </div>

      {/* Confidence Filter Slider */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>Bounding Box Confidence Threshold</span>
          </div>
          <span className="font-mono text-sm font-bold text-blue-600">
            {(settings.confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="0.99"
          step="0.01"
          value={settings.confidenceThreshold}
          onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
          aria-label="Confidence threshold"
          className="w-full accent-blue-600"
        />
        <p className="text-xs text-slate-400">
          Suppress predictions with bounding box confidence below this threshold.
        </p>
      </div>

      {/* System flags */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-800">
          <Shield className="h-4 w-4 text-blue-600" />
          <span>Execution Flags</span>
        </div>
        <div className="space-y-2 text-xs text-slate-600">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoProcess}
              onChange={(e) => updateSettings({ autoProcess: e.target.checked })}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Auto-process images upon upload</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.showTrace}
              onChange={(e) => updateSettings({ showTrace: e.target.checked })}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Show live agent orchestration telemetry during inference</span>
          </label>
        </div>
      </div>
    </div>
  );
};
