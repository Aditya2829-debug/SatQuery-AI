import React from 'react';
import { useSatStore } from '../store/useSatStore';
import { FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import { exportAnalysisPDF } from '../services/pdfService';

export const ReportsPage: React.FC = () => {
  const { allResults, queryHistory } = useSatStore();

  const handleDownloadJSON = (result: any) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SatQuery_Intelligence_${result.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-surface-darkCard">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 dark:border-slate-800">
        <FileSpreadsheet className="h-5 w-5 text-primary dark:text-secondary-light" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Generated Intelligence Reports</h1>
      </div>

      {allResults.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No finished analysis briefings yet. Complete a query in the console to compile reports.
        </div>
      ) : (
        <div className="space-y-4">
          {allResults.map((res) => {
            const matchedQuery = queryHistory.find((q) => q.id === res.queryId) || {
              id: 'q_sim',
              text: 'Autonomous GeoAI Analysis Session',
              timestamp: new Date().toLocaleTimeString(),
              imageIds: [],
              taskType: 'vqa' as const,
              status: 'completed' as const,
            };

            return (
              <div
                key={res.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{res.id}</span>
                    <span className="flex items-center space-x-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Veracity: {(res.confidence * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    "{matchedQuery.text}"
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Model: {res.metadata.modelUsed} | Latency: {res.metadata.executionTime}ms
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportAnalysisPDF(matchedQuery, res)}
                    className="flex items-center space-x-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadJSON(res)}
                    className="flex items-center space-x-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};