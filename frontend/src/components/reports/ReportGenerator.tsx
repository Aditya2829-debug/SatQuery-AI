import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileText, Check } from 'lucide-react';
import { Result } from '../../types';

export interface ReportGeneratorProps {
  result: Result;
  queryText: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ result, queryText }) => {
  const [format, setFormat] = useState<'pdf' | 'json'>('pdf');
  const [includeEvidence, setIncludeEvidence] = useState(true);

  const handleDownload = () => {
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
      const anchor = document.createElement('a');
      anchor.href = dataStr;
      anchor.download = `SatQuery_Report_${result.id}.json`;
      anchor.click();
      return;
    }

    const doc = new jsPDF();
    doc.setFillColor(10, 36, 99);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('SatQuery AI - Remote Sensing Analysis Report', 14, 16);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toUTCString()} | ID: ${result.id}`, 14, 32);

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('Submitted Query:', 14, 44);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`"${queryText}"`, 14, 52, { maxWidth: 180 });

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('Multimodal AI Findings:', 14, 68);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(result.text, 14, 76, { maxWidth: 180 });

    doc.save(`SatQuery_Report_${result.id}.pdf`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-bold uppercase text-slate-800">Report Generator</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="font-semibold text-slate-600">Export Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'pdf' | 'json')}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium"
          >
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="json">Raw Telemetry JSON (.json)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pt-5">
          <input
            type="checkbox"
            id="incEvidence"
            checked={includeEvidence}
            onChange={(e) => setIncludeEvidence(e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <label htmlFor="incEvidence" className="text-slate-600 font-medium">
            Include visual evidence and bounding coordinates
          </label>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
      >
        <Download className="h-4 w-4" />
        <span>Export {format.toUpperCase()} Report</span>
      </button>
    </div>
  );
};
