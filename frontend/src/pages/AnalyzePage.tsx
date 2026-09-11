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
  Info,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  useSatStore,
  type UploadedFileItem,
  type AnalysisMessage,
} from '../store/useSatStore';
import { SatQueryBackendService } from '../services/api';

type Paradigm = 'single' | 'bitemporal' | 'crossmodal';
type SingleMode = 'vqa' | 'captioning_grounding';

export const AnalyzePage: React.FC = () => {
  const navigate = useNavigate();

  // ============================================================
  // Global store — persists across tab navigation
  // ============================================================
  const darkMode = useSatStore((s) => s.darkMode);
  const addHistoryItem = useSatStore((s) => s.addHistoryItem);

  // Chat (survives tab switches)
  const messages = useSatStore((s) => s.analysisMessages);
  const addAnalysisMessage = useSatStore((s) => s.addAnalysisMessage);
  const updateAnalysisMessage = useSatStore((s) => s.updateAnalysisMessage);
  const clearAnalysisMessages = useSatStore((s) => s.clearAnalysisMessages);

  // File slots (so uploaded images stay loaded on tab switch)
  const fileSlot1 = useSatStore((s) => s.analysisFileSlot1);
  const fileSlot2 = useSatStore((s) => s.analysisFileSlot2);
  const setFileSlot1 = useSatStore((s) => s.setAnalysisFileSlot1);
  const setFileSlot2 = useSatStore((s) => s.setAnalysisFileSlot2);

  // ============================================================
  // Local UI state (fine to reset on tab switch)
  // ============================================================
  const [paradigm, setParadigm] = useState<Paradigm>('single');
  const [singleMode, setSingleMode] = useState<SingleMode>('vqa');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const [queryText, setQueryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visualTab, setVisualTab] = useState<'annotated' | 'original' | 'heatmap'>('annotated');

  const getPrompts = () => {
    if (paradigm === 'single') {
      if (singleMode === 'vqa') {
        return [
          'What is visible in this satellite imagery?',
          'How many major water bodies are present?',
          'Describe the land-cover and major infrastructure.',
        ];
      }
      return [
        'Classify the land cover and find agricultural zones.',
        'Highlight the primary water body and calculate estimated coverage.',
        'Identify industrial buildings and cargo docks.',
      ];
    }
    if (paradigm === 'bitemporal') {
      return [
        'What is difference between these two images?',
        'What changed between these two dates, and where did the change occur?',
        'Has the built-up urban area increased or decreased?',
      ];
    }
    return [
      'Use optical and SAR together to identify built-up and water regions.',
      'Delineate flooded terrain hidden under cloud cover using SAR backscatter.',
    ];
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File exceeds the 10MB backend limit.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const realUUID = await SatQueryBackendService.uploadImage(file);

      const newItem: UploadedFileItem = {
        id: realUUID,
        backendUUID: realUUID,
        name: file.name,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type:
          file.name.endsWith('.tif') || file.name.endsWith('.tiff')
            ? 'GeoTIFF'
            : 'Standard Raster',
        previewUrl: URL.createObjectURL(file),
      };

      if (slot === 1) setFileSlot1(newItem);
      if (slot === 2) setFileSlot2(newItem);
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const hasRequiredFiles = () => {
    if (paradigm === 'single') return !!fileSlot1?.backendUUID;
    return !!fileSlot1?.backendUUID && !!fileSlot2?.backendUUID;
  };

  const handleAnalyze = async (overrideQuery?: string) => {
    const activeText = overrideQuery || queryText;
    if (!hasRequiredFiles()) {
      alert('Please upload your satellite imagery first.');
      return;
    }
    if (!activeText.trim() || isAnalyzing) return;

    const imageIds: string[] = [fileSlot1!.backendUUID];
    if (paradigm !== 'single' && fileSlot2?.backendUUID) {
      imageIds.push(fileSlot2.backendUUID);
    }

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    const newMsg: AnalysisMessage = {
      id: msgId,
      query: activeText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      fileName: fileSlot1?.name || 'satellite_scene',
      status: 'analyzing',
    };

    // ✅ Global store — survives tab switches
    addAnalysisMessage(newMsg);
    setIsAnalyzing(true);
    setQueryText('');

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 200);

    try {
      const outcome = await SatQueryBackendService.executeFullAnalysisPipeline(
        imageIds,
        activeText
      );

      // ✅ Update message in global store
      updateAnalysisMessage(msgId, {
        status: 'completed',
        result: outcome,
      });

      addHistoryItem({
        id: 'hist_' + Math.random().toString(36).substring(2, 9),
        title: activeText,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        taskType: outcome.specialist.toUpperCase().replace('_', ' '),
        status: 'Completed',
        thumbnail: fileSlot1?.previewUrl || '',
      });
    } catch (err: any) {
      console.error('Backend pipeline failed:', err);

      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unknown error';

      const isFalsePositive =
        typeof errMsg === 'string' &&
        errMsg.toLowerCase().includes('success');

      if (!isFalsePositive) {
        alert(`Backend Execution Error: ${errMsg}`);
        // Mark the message as completed with a failure payload
        updateAnalysisMessage(msgId, {
          status: 'completed',
          result: undefined,
        });
      } else {
        console.warn('Suppressed false-positive error:', errMsg);
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 200);
    }
  };

  const handleDownloadPDF = (msg: AnalysisMessage) => {
    if (!msg.result) return;
    const res = msg.result;
    const doc = new jsPDF();

    doc.setFillColor(10, 36, 99);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('SatQuery AI - Intelligence Briefing', 14, 16);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toUTCString()} | ID: ${res.analysisId}`,
      14,
      32
    );

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('1. Query & Decision Routing:', 14, 44);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Query: "${msg.query}"`, 14, 52, { maxWidth: 180 });
    doc.text(
      `Router Choice: ${res.specialist} (${res.routerConfidencePct}% confidence)`,
      14,
      58
    );
    doc.text(`Router Reason: ${res.routerReason}`, 14, 64, { maxWidth: 180 });

    doc.setFontSize(12);
    doc.setTextColor(10, 36, 99);
    doc.text('2. Specialist Findings:', 14, 78);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    if (res.vqaAnswer) {
      doc.text(`VQA Answer: ${res.vqaAnswer}`, 14, 86, { maxWidth: 180 });
    } else if (res.changeData) {
      doc.text(
        `Change Detected: ${res.changeData.changed ? 'YES' : 'NO'}`,
        14,
        86
      );
      doc.text(
        `Surface Area Changed: ${res.changeData.changePercent.toFixed(2)}%`,
        14,
        92
      );
      doc.text(
        `Total Disconnected Change Zones: ${res.changeData.numRegions}`,
        14,
        98
      );
    } else if (res.groundingData) {
      doc.text(
        `Top Predicted Land-Cover: ${res.groundingData.topLabel}`,
        14,
        86
      );
      doc.text(
        `Cosine Similarity Score: ${res.groundingData.similarityScore.toFixed(4)}`,
        14,
        92
      );
    } else {
      doc.text('No structured specialist output was returned.', 14, 86);
    }

    if (res.limitations.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(10, 36, 99);
      doc.text('3. Limitations:', 14, 110);
      doc.setFontSize(10);
      doc.setTextColor(180, 83, 9);
      doc.text(res.limitations.join(' | '), 14, 118, { maxWidth: 180 });
    }

    doc.save(`SatQuery_Briefing_${res.analysisId.substring(0, 8)}.pdf`);
  };

  return (
    <div
      className={`w-full flex min-h-[calc(100vh-57px)] select-none font-sans transition-colors duration-300 ${
        darkMode ? 'bg-[#030712] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      {/* ================= LEFT SIDEBAR ================= */}
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

          <div className="space-y-2.5">
            {/* Single Image */}
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
                {paradigm === 'single' && (
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                )}
              </button>

              {paradigm === 'single' && (
                <div className="pl-3 pr-1 py-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    Select Mode:
                  </span>
                  <div className="space-y-1.5">
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
                        <span>VQA (Qwen3-VL-2B)</span>
                      </span>
                      {singleMode === 'vqa' && <Check className="h-4 w-4" />}
                    </button>

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
                        <span>Grounding (RemoteCLIP)</span>
                      </span>
                      {singleMode === 'captioning_grounding' && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bi-temporal Pair */}
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
              <span>Bi-temporal (CD003 UNet)</span>
              {paradigm === 'bitemporal' && (
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </button>

            {/* Cross-modal Pair */}
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
              <span>Cross-modal (Optical + SAR)</span>
              {paradigm === 'crossmodal' && (
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </button>

            {/* Location Search */}
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

          <div
            className={`rounded-2xl p-4 text-left shadow-xs space-y-2.5 border transition-colors ${
              darkMode
                ? 'border-slate-800 bg-slate-900/90 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-xs sm:text-sm leading-relaxed">
              {paradigm === 'single' &&
                singleMode === 'vqa' &&
                'Visual Question Answering powered by Qwen3-VL-2B (LoRA) for free-text answers.'}
              {paradigm === 'single' &&
                singleMode === 'captioning_grounding' &&
                'Zero-shot land cover classification and EuroSAT retrieval via RemoteCLIP ViT-B/32.'}
              {paradigm === 'bitemporal' &&
                'Pixel-level difference detection via CD003 UNet-ResNet34 (requires exactly 2 images).'}
              {paradigm === 'crossmodal' &&
                'Joint multimodal inference fusing optical spectral bands with radar backscatter.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* ✅ Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all analysis chat history?')) {
                  clearAnalysisMessages();
                }
              }}
              className={`w-full flex items-center justify-center space-x-2 text-xs px-3 py-2 rounded-full border transition ${
                darkMode
                  ? 'border-slate-700 text-slate-400 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/50'
                  : 'border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Analysis Chat ({messages.length})</span>
            </button>
          )}

          <div className="text-xs sm:text-sm text-slate-400 space-y-1.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <p className="font-semibold text-slate-500 dark:text-slate-400">
              Backend System Pipeline:
            </p>
            <p className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>FastAPI + Supabase (Port 8000)</span>
            </p>
          </div>
        </div>
      </aside>

      {/* ================= MAIN VIEWPORT ================= */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-64 overflow-y-auto">
        <div className="p-6 sm:p-10 space-y-8 max-w-5xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-900 text-blue-600 mb-2 shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                SatQuery AI Operational Console
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Images are uploaded directly to Supabase storage. Queries are
                analyzed by Google Gemini and dispatched to Qwen3-VL,
                RemoteCLIP, or CD003 UNet.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const res = msg.result;
            return (
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

                {/* Status / Results Card */}
                {msg.status === 'analyzing' ? (
                  <div className="flex items-center space-x-2.5 text-sm text-blue-500 animate-pulse pl-2 font-mono">
                    <Radar className="h-5 w-5 animate-spin" />
                    <span>
                      Gemini routing request & executing specialist pipeline...
                    </span>
                  </div>
                ) : res ? (
                  <div className="space-y-5">
                    <div
                      className={`rounded-2xl p-6 shadow-sm space-y-6 border transition-colors ${
                        darkMode
                          ? 'border-slate-800 bg-slate-900'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Router Reason Badge */}
                      <div className="flex items-center justify-between text-xs bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                        <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                          <Info className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Gemini Router Decision:</strong>{' '}
                            {res.routerReason}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          Confidence: {res.routerConfidencePct}%
                        </span>
                      </div>

                      {/* Viewport bar */}
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
                          <span>Specialist: {res.modelName}</span>
                        </div>
                      </div>

                      {/* 2-Column Visual + Model Output */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Visual Viewport */}
                        <div className="lg:col-span-6 space-y-2.5">
                          <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
                            <img
                              src={fileSlot1?.previewUrl}
                              alt="Satellite Raster"
                              className={`h-full w-full object-cover ${
                                visualTab === 'heatmap'
                                  ? 'filter hue-rotate-90 saturate-200'
                                  : ''
                              }`}
                            />

                            {/* Scaled Bounding Boxes from CD003 */}
                            {visualTab === 'annotated' &&
                              res.changeData &&
                              res.changeData.regions.map((box) => (
                                <div
                                  key={box.id}
                                  className="absolute border-2 border-red-500 bg-red-500/20 rounded pointer-events-none"
                                  style={{
                                    left: `${box.leftPct}%`,
                                    top: `${box.topPct}%`,
                                    width: `${box.widthPct}%`,
                                    height: `${box.heightPct}%`,
                                  }}
                                >
                                  <span className="absolute -top-5 left-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                    {box.label}
                                  </span>
                                </div>
                              ))}

                            {/* Fallback target if VQA or Grounding */}
                            {visualTab === 'annotated' && !res.changeData && (
                              <div
                                className="absolute border-2 border-cyan-400 bg-cyan-400/20 rounded pointer-events-none"
                                style={{
                                  top: '22%',
                                  left: '20%',
                                  width: '35%',
                                  height: '30%',
                                }}
                              >
                                <span className="absolute -top-5 left-0 rounded bg-cyan-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                                  {res.groundingData?.topLabel || 'Inspected Target'}
                                </span>
                              </div>
                            )}

                            <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 rounded bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
                              <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                              <span>Vector HUD</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                            <span>Resolution: 256x256 (Mask Space)</span>
                            <span>CRS: EPSG:4326</span>
                          </div>
                        </div>

                        {/* Model Result Output Panel */}
                        <div className="lg:col-span-6 space-y-4">
                          {/* 1. VQA Output Panel */}
                          {res.vqaAnswer && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                VQA Answer (Qwen3-VL-2B)
                              </span>
                              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                <p className="text-base sm:text-lg leading-relaxed font-semibold text-slate-900 dark:text-white">
                                  "{res.vqaAnswer}"
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 2. Change Detection Output Panel */}
                          {res.changeData && (
                            <div className="space-y-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Change Detection Metrics (CD003 UNet-ResNet34)
                              </span>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                  <span className="text-xs text-slate-500">
                                    Change Status
                                  </span>
                                  <p className="text-base font-bold text-red-600 mt-0.5">
                                    {res.changeData.changed
                                      ? 'Significant Change Detected'
                                      : 'No Change'}
                                  </p>
                                </div>

                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                  <span className="text-xs text-slate-500">
                                    Surface Area Changed
                                  </span>
                                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                    {res.changeData.changePercent.toFixed(2)}%
                                  </p>
                                </div>
                              </div>

                              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                                <p>
                                  • Disconnected Change Zones:{' '}
                                  <strong>{res.changeData.numRegions}</strong>
                                </p>
                                <p>
                                  • Sigmoid Probability Cutoff Threshold:{' '}
                                  <strong>{res.changeData.threshold}</strong>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 3. Region Grounding Output Panel */}
                          {res.groundingData && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  EuroSAT Classification (RemoteCLIP ViT-B/32)
                                </span>
                                <span className="text-xs font-bold text-emerald-500">
                                  Top: {res.groundingData.topLabel.toUpperCase()} (
                                  {res.groundingData.similarityScore.toFixed(4)})
                                </span>
                              </div>

                              <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 max-h-48 overflow-y-auto">
                                {res.groundingData.classScores.map((c, i) => (
                                  <div key={i} className="space-y-0.5 text-xs">
                                    <div className="flex justify-between font-mono">
                                      <span
                                        className={
                                          c.label === res.groundingData?.topLabel
                                            ? 'font-bold text-blue-600 dark:text-blue-400'
                                            : 'text-slate-500'
                                        }
                                      >
                                        {c.label}
                                      </span>
                                      <span className="text-slate-400">
                                        {c.score.toFixed(4)}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          c.label === res.groundingData?.topLabel
                                            ? 'bg-blue-600'
                                            : 'bg-slate-400'
                                        }`}
                                        style={{
                                          width: `${Math.min(c.score * 300, 100)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback: no structured output */}
                          {!res.vqaAnswer &&
                            !res.changeData &&
                            !res.groundingData && (
                              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 space-y-2">
                                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                  <Info className="h-4 w-4" />
                                  <span>No Structured Output Available</span>
                                </div>
                                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                                  The backend routed this query to{' '}
                                  <strong>{res.specialist}</strong> but did not
                                  return a rendered payload. Check the
                                  limitations below or try a different paradigm.
                                </p>
                              </div>
                            )}

                          {/* Limitations Notice */}
                          {res.limitations.length > 0 && (
                            <div className="flex items-start space-x-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>{res.limitations[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Execution Audit Summary */}
                    <div
                      className={`rounded-2xl p-6 shadow-sm space-y-5 border transition-colors ${
                        darkMode
                          ? 'border-slate-800 bg-slate-900'
                          : 'border-slate-200 bg-white'
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
                          <span className="text-xs font-bold uppercase text-slate-400">
                            TASK SPECIALIST
                          </span>
                          <p className="text-sm sm:text-base font-bold mt-1 uppercase text-blue-600 dark:text-blue-400">
                            {res.specialist.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-400">
                            LATENCY
                          </span>
                          <p className="text-sm sm:text-base font-bold mt-1">
                            {res.latencyStr}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-400">
                            ROUTER CONFIDENCE
                          </span>
                          <p className="text-sm sm:text-base font-bold text-emerald-500 mt-1">
                            {res.routerConfidencePct}%
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
                          <span>Download Intelligence Briefing (PDF)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Failure state — no result payload */
                  <div className="flex items-start space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Analysis failed for this query. Please try again or
                      re-upload the imagery.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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
                      isUploading
                        ? 'border-blue-500 bg-blue-50/50 animate-pulse'
                        : darkMode
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
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <UploadCloud className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium">
                      {isUploading
                        ? 'Saving to Supabase & PostGIS...'
                        : 'Click or Drag & Drop satellite raster here'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (&le; 10MB)
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
                        className="h-7 w-7 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <span className="text-sm font-bold truncate">
                        {fileSlot1.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({fileSlot1.sizeMB})
                      </span>
                      <span className="flex items-center text-xs font-semibold text-emerald-500 shrink-0">
                        <Check className="h-3.5 w-3.5 mr-1 stroke-[3]" />
                        Supabase Persisted (
                        {fileSlot1.backendUUID.substring(0, 8)}...)
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
                      className={`flex items-center justify-center space-x-2 rounded-full border border-dashed py-2 px-3.5 cursor-pointer text-center ${
                        darkMode
                          ? 'border-amber-400/50 bg-amber-950/20'
                          : 'border-amber-300 bg-amber-50/40'
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
                        Date 1 (Before)
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between rounded-full border py-1.5 px-3.5 shadow-xs ${
                        darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-bold truncate">
                        {fileSlot1.name}
                      </span>
                      <button
                        onClick={() => setFileSlot1(null)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {!fileSlot2 ? (
                    <div
                      onClick={() => fileInputRef2.current?.click()}
                      className={`flex items-center justify-center space-x-2 rounded-full border border-dashed py-2 px-3.5 cursor-pointer text-center ${
                        darkMode
                          ? 'border-amber-400/50 bg-amber-950/20'
                          : 'border-amber-300 bg-amber-50/40'
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
                        Date 2 (After)
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between rounded-full border py-1.5 px-3.5 shadow-xs ${
                        darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-bold truncate">
                        {fileSlot2.name}
                      </span>
                      <button
                        onClick={() => setFileSlot2(null)}
                        className="text-slate-400 hover:text-red-500"
                      >
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
                  darkMode
                    ? 'text-white placeholder-slate-500'
                    : 'text-slate-800 placeholder-slate-400'
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
          </div>
        </div>
      </main>
    </div>
  );
};