import React from 'react';
import { ImageUploader } from '../components/upload/ImageUploader';
import { QueryInterface } from '../components/query/QueryInterface';
import { ExecutionTraceDashboard } from '../components/agent/ExecutionTraceDashboard';
import { ResultsViewer } from '../components/results/ResultsViewer';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Top section: Two Column Intake & Query */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ImageUploader />
        </div>
        <div className="lg:col-span-7">
          <QueryInterface />
        </div>
      </div>

      {/* Execution Trace Bar */}
      <ExecutionTraceDashboard />

      {/* Analytical Findings & Map Visualization */}
      <ResultsViewer />
    </div>
  );
};