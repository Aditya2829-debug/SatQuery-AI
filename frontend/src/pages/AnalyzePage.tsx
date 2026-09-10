import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  UploadCloud,
  X,
  Loader2,
  Download,
  Check,
  Eye,
  Crosshair,
  Radar,
  SlidersHorizontal,
  Sparkles,
  HelpCircle,
  Scan,
  MapPin,
} from 'lucide-react';
import { useSatStore } from '../store/useSatStore';

type Paradigm = 'single' | 'bitemporal' | 'crossmodal';
type SingleMode = 'vqa' | 'captioning_grounding';

interface UploadedFileItem {
  id: string;
  name: string;
  sizeMB: string;
  type: string;
  previewUrl: string;
}

interface AnalysisMessage {
  id: string;
  query: string;
  paradigm: Paradigm;
  singleMode?: SingleMode;
  timestamp: string;
  fileName: string;
  status: 'analyzing' | 'completed';
  result?: {
    answer: string;
    confidence: number;
    latency: string;
    models: string[];
    task: string;
  };
}

export const AnalyzePage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, addHistoryItem } = useSatStore();

  // 1. Paradigm & Sub-options
  const [paradigm, setParadigm] = useState<Paradigm>('single');
  const [singleMode, setSingleMode] = useState<SingleMode>('vqa');

  // 2. Uploaded file slots (Compact capsule format)
  const [fileSlot1, setFileSlot1] = useState<UploadedFileItem | null>(null);
  const [fileSlot2, setFileSlot2] = useState<UploadedFileItem | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // 3. Query input & conversational stream
  const [queryText, setQueryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);

  // 4. Viewport tab inside results
  const [visualTab, setVisualTab] = useState<'annotated' | 'original' | 'heatmap'>('annotated');

  const getPrompts = () => {
    if (paradigm === 'single') {
      if (singleMode === 'vqa') {
        return [
          'How many cargo ships are docked at the port?',
          'Is there an active runway visible in this scene?',
          'Are there any flooded roadways in this area?',
        ];
      }
      return [
        'Describe the land-cover and major objects visible in this image.',
        'Highlight the primary water body and calculate estimated coverage.',
        'Identify industrial buildings and cargo ships docked at the port.',
      ];
    }

    if (paradigm === 'bitemporal') {
      return [
        'What changed between these two dates, and where did the change occur?',
        'Has the built-up urban area increased, decreased, or remained unchanged?',
      ];
    }

    return [
      'Use optical and SAR together to identify built-up and water-covered regions.',
      'Delineate flooded terrain hidden under cloud cover using SAR backscatter.',
    ];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newItem: UploadedFileItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.name.endsWith('.tif') || file.name.endsWith('.tiff') ? 'GeoTIFF' : 'Standard Raster',
      previewUrl: URL.createObjectURL(file),
    };

    if (slot === 1) setFileSlot1(newItem);
    if (slot === 2) setFileSlot2(newItem);
  };

  const hasRequiredFiles = () => {
    if (paradigm === 'single') return !!fileSlot1;
    return !!fileSlot1 && !!fileSlot2;
  };

  const handleAnalyze = (overrideQuery?: string) => {
    const activeText = overrideQuery || queryText;
    if (!hasRequiredFiles() || !activeText.trim() || isAnalyzing) return;

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newMsg: AnalysisMessage = {
      id: msgId,
      query: activeText,
      paradigm,
      singleMode: paradigm === 'single' ? singleMode : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileName: fileSlot1?.name || 'img1.jpeg',
      status: 'analyzing',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsAnalyzing(true);
    setQueryText('');

    const taskTag =
      paradigm === 'single'
        ? singleMode === 'vqa'
          ? 'VQA'
          : 'Grounding'
        : paradigm === 'bitemporal'
        ? 'Change Detection'
        : 'Cross-modal Fusion';

    addHistoryItem({
      id: 'hist_' + Math.random().toString(36).substring(2, 9),
      title: activeText,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      taskType: taskTag,
      status: 'Completed',
      thumbnail:
        fileSlot1?.previewUrl ||
        'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80',
    });

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 200);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            return {
              ...m,
              status: 'completed',
              result: {
                answer:
                  paradigm === 'single' && singleMode === 'vqa'
                    ? 'Visual Question Answering confirms 4 cargo vessels currently moored at the primary shipping terminal, alongside 18 warehouse structures with clear road network access.'
                    : 'The analyzed satellite scene confirms distinct commercial development with 42% built-up surface area and adjacent agricultural plots. Water bodies are well-defined with healthy photosynthetic vegetation along boundaries.',
                confidence: 94,
                latency: '1.24s',
                task:
                  paradigm === 'single'
                    ? singleMode === 'vqa'
                      ? 'VQA INFERENCE'
                      : 'CAPTIONING & GROUNDING'
                    : paradigm === 'bitemporal'
                    ? 'BI-TEMPORAL CHANGE'
                    : 'CROSS-MODAL FUSION',
                models: ['RemoteCLIP-ViT-L', 'SatViG-Grounder', 'NDVI-Engine'],
              },
            };
          }
          return m;
        })
      );
      setIsAnalyzing(false);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 200);
    }, 2200);
  };

  const handleDownloadPDF = (msg: AnalysisMessage) => {
    const doc = new jsPDF();
    doc.setFillColor(10, 36, 99);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('SatQuery AI - Remote Sensing Analysis Report', 14, 16);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toUTCString()} | Status: Grounded Analysis`, 14, 32);

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('1. Natural Language Query:', 14, 44);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`"${msg.query}"`, 14, 52, { maxWidth: 180 });

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('2. Synthesized Geospatial Findings:', 14, 68);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(msg.result?.answer || '', 14, 76, { maxWidth: 180, lineHeightFactor: 1.4 });

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('3. Execution Audit Summary:', 14, 108);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Task: ${msg.result?.task || 'SINGLE ANALYSIS'}`, 14, 116);
    doc.text(`Latency: ${msg.result?.latency || '1.24s'}`, 14, 122);
    doc.text(`Confidence: ${msg.result?.confidence || 94}%`, 14, 128);
    doc.text(`Models Deployed: ${msg.result?.models.join(', ')}`, 14, 134);

    doc.save(`SatQuery_Report_${msg.id}.pdf`);
  };

  return (
    <div
      className={`w-full flex min-h-[calc(100vh-57px)] select-none font-sans transition-colors duration-300 ${
        darkMode ? 'bg-[#030712] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      {/* ================= LEFT VERTICAL DASHBOARD SECTION ================= */}
      <aside
        className={`w-[340px] shrink-0 border-r p-6 space-y-6 flex flex-col justify-between transition-colors duration-300 ${
          darkMode
            ? 'border-slate-800 bg-slate-950/80 text-white'
            : 'border-slate-200/90 bg-white text-slate-900'
        }`}
      >
        <div className="space-y-5">
          <div className="flex items-center space-x-2.5">
            <SlidersHorizontal className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Analysis Paradigm
            </h2>
          </div>

          {/* Vertical Stack of Paradigm Capsules */}
          <div className="space-y-2.5">
            {/* 1. Single Image */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setParadigm('single')}
                className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-sm sm:text-base font-semibold transition-all ${
                  paradigm === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode
                    ? 'bg-slate-900 text-slate-200 hover:text-white border border-slate-800'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>Single Image</span>
                {paradigm === 'single' && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
              </button>

              {/* Nested Capsule Sub-Options for Single Image */}
              {paradigm === 'single' && (
                <div className="pl-3 pr-1 py-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    Select Mode:
                  </span>
                  <div className="space-y-1.5">
                    {/* VQA Sub-option */}
                    <button
                      type="button"
                      onClick={() => setSingleMode('vqa')}
                      className={`w-full flex items-center justify-between rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                        singleMode === 'vqa'
                          ? 'bg-blue-500 text-white shadow-xs'
                          : darkMode
                          ? 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <HelpCircle className="h-4 w-4" />
                        <span>VQA (Question Answering)</span>
                      </span>
                      {singleMode === 'vqa' && <Check className="h-4 w-4" />}
                    </button>

                    {/* Captioning & Grounding Sub-option */}
                    <button
                      type="button"
                      onClick={() => setSingleMode('captioning_grounding')}
                      className={`w-full flex items-center justify-between rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                        singleMode === 'captioning_grounding'
                          ? 'bg-blue-500 text-white shadow-xs'
                          : darkMode
                          ? 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <Scan className="h-4 w-4" />
                        <span>Captioning & Grounding</span>
                      </span>
                      {singleMode === 'captioning_grounding' && <Check className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Bi-temporal Pair */}
            <button
              type="button"
              onClick={() => setParadigm('bitemporal')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-sm sm:text-base font-semibold transition-all ${
                paradigm === 'bitemporal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-900 text-slate-200 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>Bi-temporal Pair</span>
              {paradigm === 'bitemporal' && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
            </button>

            {/* 3. Cross-modal Pair */}
            <button
              type="button"
              onClick={() => setParadigm('crossmodal')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-sm sm:text-base font-semibold transition-all ${
                paradigm === 'crossmodal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-900 text-slate-200 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>Cross-modal Pair</span>
              {paradigm === 'crossmodal' && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
            </button>

            {/* 4. Search by Location */}
            <button
              type="button"
              onClick={() => navigate('/location')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-sm sm:text-base font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-900 text-slate-200 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Search by Location</span>
              </span>
            </button>
          </div>

          {/* Floating Paradigm Detail Capsule Card */}
          <div
            className={`rounded-2xl p-4 text-left shadow-xs space-y-2.5 border transition-colors ${
              darkMode
                ? 'border-slate-800 bg-slate-900/90 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-xs sm:text-sm leading-relaxed">
              {paradigm === 'single' && singleMode === 'vqa' &&
                'Visual Question Answering for counting objects, verifying infrastructure, and answering specific inquiries on a single raster scene.'}
              {paradigm === 'single' && singleMode === 'captioning_grounding' &&
                'Analyze optical, multispectral, or SAR image for scene captioning, spatial localization, and bounding coordinates.'}
              {paradigm === 'bitemporal' &&
                'Compare two co-registered scenes from different dates (T1 vs T2) for automated difference and change detection.'}
              {paradigm === 'crossmodal' &&
                'Joint multimodal inference fusing Optical scene context with synthetic aperture radar backscatter penetration.'}
            </p>
            <div className="pt-1">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-mono font-semibold transition-colors ${
                  darkMode
                    ? 'border-blue-800 bg-blue-950/60 text-cyan-300'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {paradigm === 'single' && '1 Image (GeoTIFF / PNG)'}
                {paradigm === 'bitemporal' && '2 Images (Date 1 & Date 2)'}
                {paradigm === 'crossmodal' && '2 Images (Optical + SAR)'}
              </span>
            </div>
          </div>
        </div>

        {/* Left Panel Footer Status */}
        <div className="text-xs sm:text-sm text-slate-400 space-y-1.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <p className="font-semibold text-slate-500 dark:text-slate-400">Autonomous Agent Status:</p>
          <p className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GeoAI Core Ready (Online)</span>
          </p>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-64 overflow-y-auto">
        <div className="p-6 sm:p-10 space-y-8 max-w-5xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-900 text-blue-600 mb-2 shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome to SatQuery AI
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Configure your analysis paradigm on the left, upload your satellite asset below, or explore by global location.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-6 pt-2">
              {/* User Query Bubble */}
              <div className="flex justify-end items-center space-x-3">
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-3.5 text-sm sm:text-base font-medium shadow-sm ${
                    darkMode ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  {msg.query}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                  U
                </div>
              </div>

              {/* AI Analyzing Status or Complete Results */}
              {msg.status === 'analyzing' ? (
                <div className="flex items-center space-x-2.5 text-sm text-blue-500 animate-pulse pl-2 font-mono">
                  <Radar className="h-5 w-5 animate-spin" />
                  <span>Analyzing scene....</span>
                </div>
              ) : (
                <div className="space-y-5">
                  <div
                    className={`rounded-2xl p-6 shadow-sm space-y-6 border transition-colors ${
                      darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between border-b pb-4 ${
                        darkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <button
                          onClick={() => setVisualTab('annotated')}
                          className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
                            visualTab === 'annotated'
                              ? 'bg-blue-600 text-white'
                              : darkMode
                              ? 'bg-slate-800 text-slate-300 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Annotated
                        </button>
                        <button
                          onClick={() => setVisualTab('original')}
                          className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
                            visualTab === 'original'
                              ? 'bg-blue-600 text-white'
                              : darkMode
                              ? 'bg-slate-800 text-slate-300 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Original
                        </button>
                        <button
                          onClick={() => setVisualTab('heatmap')}
                          className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
                            visualTab === 'heatmap'
                              ? 'bg-blue-600 text-white'
                              : darkMode
                              ? 'bg-slate-800 text-slate-300 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Heatmap
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>Layer: Grounding Overlay</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-6 space-y-2.5">
                        <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
                          <img
                            src={
                              fileSlot1?.previewUrl ||
                              'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80'
                            }
                            alt="Satellite"
                            className={`h-full w-full object-cover ${
                              visualTab === 'heatmap' ? 'filter hue-rotate-90 saturate-200' : ''
                            }`}
                          />

                          {visualTab === 'annotated' && (
                            <>
                              <div
                                className="absolute border-2 border-cyan-400 bg-cyan-400/20 rounded"
                                style={{ top: '20%', left: '16%', width: '38%', height: '32%' }}
                              >
                                <span className="absolute -top-6 left-0 rounded bg-cyan-500 px-2 py-0.5 text-xs font-bold text-slate-950 shadow-sm">
                                  Urban Built-up
                                </span>
                              </div>

                              <div
                                className="absolute border-2 border-blue-500 bg-blue-500/20 rounded"
                                style={{ top: '48%', left: '46%', width: '36%', height: '38%' }}
                              >
                                <span className="absolute -top-6 left-0 rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                                  Water Body
                                </span>
                              </div>

                              <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 rounded bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
                                <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                                <span>Vector</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                          <span>Dims: 599 × 368 px</span>
                          <span>Projection: EPSG:4326 / WGS84</span>
                        </div>
                      </div>

                      {/* Synthesized Answer & Confidence */}
                      <div className="lg:col-span-6 space-y-5">
                        <p
                          className={`text-base sm:text-lg leading-relaxed font-normal transition-colors ${
                            darkMode ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {msg.result?.answer}
                        </p>

                        <div
                          className={`space-y-2 pt-3 border-t ${
                            darkMode ? 'border-slate-800' : 'border-slate-100'
                          }`}
                        >
                          <div
                            className={`flex justify-between text-sm font-semibold ${
                              darkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            <span>Confidence</span>
                            <span className="text-emerald-500 font-mono font-bold text-base">
                              {msg.result?.confidence}%
                            </span>
                          </div>
                          <div
                            className={`h-2.5 w-full overflow-hidden rounded-full ${
                              darkMode ? 'bg-slate-800' : 'bg-slate-100'
                            }`}
                          >
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${msg.result?.confidence}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`space-y-2.5 pt-3 border-t ${
                            darkMode ? 'border-slate-800' : 'border-slate-100'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            DEPLOYED MODELS
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.result?.models.map((mod, idx) => (
                              <span
                                key={idx}
                                className={`rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-mono font-medium ${
                                  darkMode
                                    ? 'border-blue-900 bg-blue-950/60 text-blue-300'
                                    : 'border-blue-200 bg-blue-50 text-blue-700'
                                }`}
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Audit Summary */}
                  <div
                    className={`rounded-2xl p-6 shadow-sm space-y-5 border transition-colors ${
                      darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      5. EXECUTION AUDIT SUMMARY
                    </h3>

                    <div
                      className={`grid grid-cols-3 gap-4 border-b pb-5 ${
                        darkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400">TASK</span>
                        <p className="text-sm sm:text-base font-bold mt-1">{msg.result?.task}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400">LATENCY</span>
                        <p className="text-sm sm:text-base font-bold mt-1">{msg.result?.latency}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400">CONFIDENCE</span>
                        <p className="text-sm sm:text-base font-bold text-emerald-500 mt-1">
                          {msg.result?.confidence}%
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDownloadPDF(msg)}
                        className={`flex items-center space-x-2 rounded-full border px-6 py-2.5 text-sm font-semibold transition shadow-xs cursor-pointer ${
                          darkMode
                            ? 'border-blue-500 text-blue-400 hover:bg-blue-950/40'
                            : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Intelligence Report (PDF)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ================= FIXED BOTTOM DOCK ================= */}
        <div
          className={`fixed bottom-0 left-0 lg:left-[340px] right-0 z-40 backdrop-blur-md border-t shadow-[0_-8px_30px_rgba(0,0,0,0.06)] py-3.5 px-6 sm:px-8 transition-colors duration-300 ${
            darkMode ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200/90'
          }`}
        >
          <div className="mx-auto max-w-4xl space-y-3">
            <div className="w-full">
              {paradigm === 'single' ? (
                !fileSlot1 ? (
                  <div
                    onClick={() => fileInputRef1.current?.click()}
                    className={`flex items-center justify-center space-x-2.5 rounded-full border border-dashed py-2 px-5 cursor-pointer transition ${
                      darkMode
                        ? 'border-amber-400/50 bg-amber-950/20 hover:bg-amber-950/40 text-slate-200'
                        : 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/80 text-slate-800'
                    }`}
                  >
                    <input
                      ref={fileInputRef1}
                      type="file"
                      accept=".tif,.tiff,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 1)}
                    />
                    <UploadCloud className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium">Click or Drag & Drop image here</span>
                    <span className="text-xs text-slate-400 font-mono">
                      (GeoTIFF, TIFF, PNG, or JPEG)
                    </span>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between rounded-full border py-1.5 px-4 shadow-xs transition-colors ${
                      darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={fileSlot1.previewUrl}
                        alt="Thumbnail"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80';
                        }}
                        className="h-7 w-7 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <span className="text-sm font-bold truncate">{fileSlot1.name}</span>
                      <span className="text-xs text-slate-400">({fileSlot1.sizeMB})</span>
                      <span className="flex items-center text-xs font-semibold text-emerald-500 shrink-0">
                        <Check className="h-3.5 w-3.5 mr-1 stroke-[3]" />
                        Validated & Ready
                      </span>
                    </div>
                    <button
                      onClick={() => setFileSlot1(null)}
                      aria-label="Remove uploaded image"
                      className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {!fileSlot1 ? (
                    <div
                      onClick={() => fileInputRef1.current?.click()}
                      className={`flex items-center justify-center space-x-2 rounded-full border border-dashed py-2 px-3.5 cursor-pointer transition text-center ${
                        darkMode
                          ? 'border-amber-400/50 bg-amber-950/20 hover:bg-amber-950/40 text-slate-200'
                          : 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/80 text-slate-800'
                      }`}
                    >
                      <input
                        ref={fileInputRef1}
                        type="file"
                        accept=".tif,.tiff,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 1)}
                      />
                      <UploadCloud className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {paradigm === 'bitemporal' ? 'Date 1 (T1 Scene)' : 'Optical (RGB)'}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between rounded-full border py-1.5 px-3.5 shadow-xs ${
                        darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs sm:text-sm font-bold truncate">{fileSlot1.name}</span>
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <button onClick={() => setFileSlot1(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {!fileSlot2 ? (
                    <div
                      onClick={() => fileInputRef2.current?.click()}
                      className={`flex items-center justify-center space-x-2 rounded-full border border-dashed py-2 px-3.5 cursor-pointer transition text-center ${
                        darkMode
                          ? 'border-amber-400/50 bg-amber-950/20 hover:bg-amber-950/40 text-slate-200'
                          : 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/80 text-slate-800'
                      }`}
                    >
                      <input
                        ref={fileInputRef2}
                        type="file"
                        accept=".tif,.tiff,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 2)}
                      />
                      <UploadCloud className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {paradigm === 'bitemporal' ? 'Date 2 (T2 Scene)' : 'SAR (Radar)'}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between rounded-full border py-1.5 px-3.5 shadow-xs ${
                        darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs sm:text-sm font-bold truncate">{fileSlot2.name}</span>
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <button onClick={() => setFileSlot2(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prompts Row */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Prompts:
              </span>
              {getPrompts().map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQueryText(p)}
                  className={`rounded-full border px-3.5 py-1 text-xs sm:text-sm transition truncate max-w-sm cursor-pointer ${
                    darkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-blue-950/50 hover:border-blue-700 hover:text-blue-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div
              className={`rounded-full border p-1.5 pl-5 shadow-sm flex items-center justify-between transition-colors focus-within:border-blue-500 ${
                darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Ask anything about the satellite imagery..."
                className={`flex-1 bg-transparent text-sm sm:text-base focus:outline-none pr-4 ${
                  darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyze();
                }}
              />

              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={!hasRequiredFiles() || !queryText.trim() || isAnalyzing}
                className="rounded-full bg-blue-600 px-7 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze Scene</span>
                )}
              </button>
            </div>

            <div className="text-center text-xs text-slate-400">
              {hasRequiredFiles()
                ? 'Ready for follow-up query or report generation.'
                : 'Upload required images and enter a query.'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
