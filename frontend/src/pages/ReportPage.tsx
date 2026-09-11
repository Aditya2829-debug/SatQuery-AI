import React from 'react';
import { Download, Satellite } from 'lucide-react';
import { useSatStore } from '../store/useSatStore';
import { jsPDF } from 'jspdf';

export const ReportPage: React.FC = () => {
  const { currentResult } = useSatStore();

  if (!currentResult) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Satellite className="mx-auto mb-4 h-10 w-10 text-slate-400" />

          <h1 className="text-lg font-bold text-slate-900">
            No Analysis Available
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Run an analysis first to generate a report.
          </p>
        </div>
      </div>
    );
  }

  /*
   * The current Result type uses:
   * - queryId
   * - text
   * - confidence
   * - evidencePoints
   * - metadata
   *
   * Older fields such as query, taskType, metrics,
   * beforeImg, afterImg and changeMaskImg are no longer
   * part of the Result type.
   */

  const queryText = currentResult.queryId || 'Satellite analysis';

  const modelUsed = 'SatQuery AI';

  const confidence = currentResult.confidence ?? 0;

  const answer =
    currentResult.text ||
    'No AI conclusion was returned for this analysis.';

  const taskType = 'Remote Sensing Analysis';

  const processingTime = 'N/A';

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(
      'SatQuery AI - Remote Sensing Analysis Report',
      14,
      20
    );

    doc.setFontSize(11);

    doc.text(`Query: ${queryText}`, 14, 32);
    doc.text(`Analysis Type: ${taskType}`, 14, 40);
    doc.text(`Model Used: ${modelUsed}`, 14, 48);
    doc.text(
      `Confidence: ${(confidence * 100).toFixed(0)}%`,
      14,
      56
    );

    doc.text('AI Conclusion:', 14, 68);

    doc.setFontSize(10);
    doc.text(answer, 14, 76, {
      maxWidth: 180,
    });

    doc.save('SatQuery_Report.pdf');
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Satellite className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                SatQuery AI
              </h1>

              <p className="text-xs text-slate-500">
                Remote Sensing Analysis Report
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>

        {/* 1. Executive Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            1. Executive Summary
          </h2>

          <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-600">
                Query:
              </span>

              <span className="col-span-2 text-slate-800">
                {queryText}
              </span>

              <span className="font-semibold text-slate-600">
                Analysis Type:
              </span>

              <span className="col-span-2 text-slate-800">
                {taskType}
              </span>

              <span className="font-semibold text-slate-600">
                Input Date(s):
              </span>

              <span className="col-span-2 text-slate-800">
                N/A
              </span>

              <span className="font-semibold text-slate-600">
                Sensor:
              </span>

              <span className="col-span-2 text-slate-800">
                Sentinel-2 (Optical)
              </span>

              <span className="font-semibold text-slate-600">
                AI Conclusion:
              </span>

              <span className="col-span-2 text-slate-800">
                {answer}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Visual Evidence */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            2. Visual Evidence
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="flex h-32 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-400">
                  Source imagery
                </span>
              </div>

              <p className="mt-1 text-center text-[10px] font-medium text-slate-500">
                Before
              </p>
            </div>

            <div>
              <div className="flex h-32 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-400">
                  Analysis imagery
                </span>
              </div>

              <p className="mt-1 text-center text-[10px] font-medium text-slate-500">
                After
              </p>
            </div>

            <div>
              <div className="flex h-32 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-400">
                  Change visualization
                </span>
              </div>

              <p className="mt-1 text-center text-[10px] font-medium text-slate-500">
                Detected Change
              </p>
            </div>
          </div>
        </div>

        {/* 3. Analysis Details */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            3. Analysis Details
          </h2>

          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] font-medium text-slate-400">
                Processing Time
              </span>

              <p className="text-sm font-bold text-slate-800">
                {processingTime}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] font-medium text-slate-400">
                Evidence Points
              </span>

              <p className="text-sm font-bold text-slate-800">
                {currentResult.evidencePoints?.length ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] font-medium text-slate-400">
                Model Used
              </span>

              <p className="text-sm font-bold text-slate-800">
                {modelUsed}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] font-medium text-slate-400">
                Confidence
              </span>

              <p className="text-sm font-bold text-emerald-600">
                {(confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* 4. Methodology */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            4. Methodology
          </h2>

          <p className="text-xs leading-relaxed text-slate-600">
            The analysis was performed using the SatQuery AI remote
            sensing pipeline. The system processes the uploaded
            satellite imagery, routes the query to the appropriate
            specialist model, and returns analytical findings with
            confidence and supporting evidence.
          </p>
        </div>
      </div>
    </div>
  );
};