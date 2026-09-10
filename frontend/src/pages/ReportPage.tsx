import React from 'react';
import { Download, Satellite } from 'lucide-react';
import { useSatStore } from '../store/useSatStore';
import { jsPDF } from 'jspdf';

export const ReportPage: React.FC = () => {
  const { currentResult } = useSatStore();

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SatQuery AI - Remote Sensing Analysis Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Query: ${currentResult.query}`, 14, 32);
    doc.text(`Analysis Type: ${currentResult.taskType}`, 14, 40);
    doc.text(`Model Used: ${currentResult.metrics.modelUsed}`, 14, 48);
    doc.text(`Confidence: ${(currentResult.confidence * 100).toFixed(0)}%`, 14, 56);
    doc.text('AI Conclusion:', 14, 68);
    doc.setFontSize(10);
    doc.text(currentResult.answer, 14, 76, { maxWidth: 180 });
    doc.save('SatQuery_Report.pdf');
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Satellite className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">SatQuery AI</h1>
              <p className="text-xs text-slate-500">Remote Sensing Analysis Report</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
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
          <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-600">Query:</span>
              <span className="col-span-2 text-slate-800">{currentResult.query}</span>

              <span className="font-semibold text-slate-600">Analysis Type:</span>
              <span className="col-span-2 text-slate-800">{currentResult.taskType}</span>

              <span className="font-semibold text-slate-600">Input Date(s):</span>
              <span className="col-span-2 text-slate-800">2023-01-01 / 2023-08-01</span>

              <span className="font-semibold text-slate-600">Sensor:</span>
              <span className="col-span-2 text-slate-800">Sentinel-2 (Optical)</span>

              <span className="font-semibold text-slate-600">AI Conclusion:</span>
              <span className="col-span-2 text-slate-800">{currentResult.answer}</span>
            </div>
          </div>
        </div>

        {/* 2. Visual Evidence */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            2. Visual Evidence
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <img
                src={currentResult.beforeImg}
                alt="Before"
                className="h-32 w-full object-cover rounded-lg border border-slate-200"
              />
              <p className="text-center text-[10px] text-slate-500 mt-1 font-medium">Before</p>
            </div>
            <div>
              <img
                src={currentResult.afterImg}
                alt="After"
                className="h-32 w-full object-cover rounded-lg border border-slate-200"
              />
              <p className="text-center text-[10px] text-slate-500 mt-1 font-medium">After</p>
            </div>
            <div>
              <img
                src={currentResult.changeMaskImg}
                alt="Change"
                className="h-32 w-full object-cover rounded-lg border border-slate-200"
              />
              <p className="text-center text-[10px] text-slate-500 mt-1 font-medium">
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
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] text-slate-400 font-medium">Change Area</span>
              <p className="text-sm font-bold text-slate-800">{currentResult.metrics.changeArea}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] text-slate-400 font-medium">Detected Regions</span>
              <p className="text-sm font-bold text-slate-800">
                {currentResult.metrics.detectedRegions}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] text-slate-400 font-medium">Model Used</span>
              <p className="text-sm font-bold text-slate-800">
                {currentResult.metrics.modelUsed}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] text-slate-400 font-medium">Confidence</span>
              <p className="text-sm font-bold text-emerald-600">0.87 (High)</p>
            </div>
          </div>
        </div>

        {/* 4. Methodology */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            4. Methodology
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Change detection performed using CD003 U-Net. Approach based on multimodal feature
            subtraction with temporal Siamese alignment and spatial self-attention masks.
          </p>
        </div>
      </div>
    </div>
  );
};
