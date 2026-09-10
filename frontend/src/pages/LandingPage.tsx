import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Satellite,
  Globe,
  X,
  Volume2,
  VolumeX,
  Layers,
  Cpu,
  MapPin,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  SplitSquareHorizontal,
  Check,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020510] text-white flex flex-col select-none scroll-smooth">
      
      {/* ================= HERO SECTION ================= */}
      <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden">
        
        {/* 4K BACKGROUND VIDEO */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            poster="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
            className="h-full w-full object-cover"
          >
            <source src="/earth-4k.mp4" type="video/mp4" />
            <source src="/earth-4k.webm" type="video/webm" />
            <source
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              type="video/mp4"
            />
          </video>

          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/75 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#020510] to-transparent pointer-events-none" />
        </div>

        {/* HEADER NAVBAR */}
        <header className="relative z-30 w-full px-6 sm:px-10 pt-6 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/70 bg-slate-950/80 shadow-[0_0_15px_rgba(0,210,255,0.4)]">
              <Globe className="h-6 w-6 text-cyan-300" />
              <Satellite className="absolute -top-1 -right-1 h-4 w-4 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-black tracking-wider text-white uppercase font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                SATQUERY AI
              </span>
              <span className="block text-[11px] font-semibold tracking-wide text-cyan-400 -mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Satellite Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Glowing Glassmorphic Pill */}
          <nav className="flex items-center space-x-4 sm:space-x-7 rounded-full border border-cyan-500/40 bg-slate-950/75 px-6 py-2.5 backdrop-blur-md shadow-[0_0_20px_rgba(0,180,255,0.25)]">
            <Link to="/" className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-white transition">
              HOME
            </Link>
            <a href="#features" className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-cyan-400 transition">
              FEATURES
            </a>
            <a
              href="#pricing"
              onClick={(e) => { e.preventDefault(); alert('Enterprise pricing launching soon!'); }}
              className="hidden md:inline-block text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-cyan-400 transition"
            >
              PRICING
            </a>
            <Link to="/about" className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-cyan-400 transition">
              ABOUT
            </Link>
            <button
              onClick={() => setShowDemoModal(true)}
              className="rounded-full border border-cyan-400 bg-cyan-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:bg-cyan-400 hover:text-slate-950 transition cursor-pointer"
            >
              REQUEST DEMO
            </button>
          </nav>
        </header>

        {/* HERO TITLE & CTA */}
        <main className="relative z-30 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto my-auto py-12">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_20px_rgba(0,0,0,1)] leading-tight">
            WELCOME TO SATQUERY AI
          </h1>
          <h2 className="mt-2 sm:mt-3 text-base sm:text-2xl lg:text-3xl font-extrabold uppercase tracking-wide text-white drop-shadow-[0_3px_12px_rgba(0,0,0,1)]">
            UNLOCK GLOBAL INSIGHTS WITH SATELLITE INTELLIGENCE
          </h2>
          <p className="mt-4 sm:mt-5 max-w-3xl text-xs sm:text-sm md:text-base text-slate-100 font-normal leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            Revolutionize your data analysis with AI-powered geospatial intelligence. SatQuery AI provides
            real-time monitoring, predictive analytics, and actionable solutions for agriculture, environment,
            defense, and beyond, transforming satellite data into precise insights.
          </p>

          <div className="mt-8 sm:mt-10">
            <Link
              to="/analyze"
              className="group inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-[#00D2FF] to-[#00b4d8] px-9 py-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 shadow-[0_0_35px_rgba(0,210,255,0.85)] hover:shadow-[0_0_55px_rgba(0,210,255,1)] transition-all transform hover:scale-105 active:scale-95"
            >
              <span>GET STARTED</span>
              <ArrowUpRight className="h-5 w-5 text-slate-950 stroke-[2.5] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </main>

        {/* BOTTOM HERO BAR */}
        <div className="relative z-30 px-8 pb-6 flex items-center justify-between">
          <a
            href="#features"
            className="flex items-center space-x-2 text-xs font-semibold text-cyan-400/90 hover:text-cyan-300 transition animate-bounce"
          >
            <ChevronDown className="h-4 w-4" />
            <span>Explore Core Capabilities</span>
          </a>

          <button
            onClick={toggleMute}
            className="flex items-center space-x-1.5 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition backdrop-blur-sm cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-slate-400" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-400" />}
            <span className="text-[10px] uppercase font-mono">{isMuted ? 'Muted' : 'Audio ON'}</span>
          </button>
        </div>
      </div>

      {/* ================= MINIMAL & CLEAN FEATURES SECTION ================= */}
      <section id="features" className="relative z-20 bg-[#020510] py-20 px-6 sm:px-12 border-t border-slate-800/80">
        
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-6xl space-y-12">
          
          {/* Section Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">
              End-to-End Autonomous GeoAI Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Modular remote sensing intelligence pipeline from raster ingestion to evidence-grounded synthesis.
            </p>
          </div>

          {/* 6 Clean, Minimal, Point-wise Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* 1. Imagery Intake System */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Imagery Intake System
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>GeoTIFF, TIFF, PNG, and JPEG ingestion (up to 100MB)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Optical (RGB / NIR) and SAR radar backscatter</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Automated CRS (EPSG:4326) and pixel resolution extraction</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Bi-temporal (T1/T2) and cross-modal sensor tagging</span>
                </li>
              </ul>
            </div>

            {/* 2. Natural Language Queries */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Natural Language Queries
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Plain English queries without complex GIS scripts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Autonomous routing: VQA, Grounding, and Change Detection</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>One-click suggested templates for flood, urban, and ports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Persistent session history with instant re-run capability</span>
                </li>
              </ul>
            </div>

            {/* 3. AI Specialist Models */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <Cpu className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. AI Specialist Models
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Qwen2-VL & Qwen3-VL vision-language foundations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>RemoteCLIP zero-shot remote sensing classification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>CD003 U-Net Siamese networks for pixel change masks</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Optical + SAR cross-attention for cloud penetration</span>
                </li>
              </ul>
            </div>

            {/* 4. Interactive Spatial Grounding */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <MapPin className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  4. Interactive Spatial Grounding
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Leaflet canvas with Esri high-res satellite tiles</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Bounding box object localization with veracity metrics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Vectorized GeoJSON masks for water bodies and structures</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Customizable confidence sensitivity threshold filter</span>
                </li>
              </ul>
            </div>

            {/* 5. Bi-Temporal Visual Diffing */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <SplitSquareHorizontal className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  5. Bi-Temporal Visual Diffing
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Real-time before-and-after split swipe slider</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>3-card view: Pre-event, Post-event, and Detected Shift</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Quantified area change metrics and cluster counts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Surface classification: Built-up, Water, Forest, and Soil</span>
                </li>
              </ul>
            </div>

            {/* 6. Intelligence Reports & Export */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xs hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  6. Intelligence Reports & Export
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>One-click mission-ready PDF briefings via jsPDF</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Embedded visual evidence, crops, and coordinates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Execution telemetry: Backbone model, latency, and veracity</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Raw telemetry JSON export for enterprise GIS pipelines</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Clean Bottom Callout */}
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xs">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Ready to inspect satellite scenes?
              </h3>
              <p className="text-xs text-slate-400">
                Upload your GeoTIFF rasters or explore by coordinates with autonomous GeoAI agents.
              </p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center space-x-2 rounded-full bg-cyan-400 px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 transition shadow-[0_0_20px_rgba(0,210,255,0.5)]"
            >
              <span>Launch Console</span>
              <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-20 border-t border-slate-900 bg-[#020510] py-5 px-6 text-center text-[11px] text-slate-500">
        SatQuery AI &copy; 2026. Autonomous Vision-Language Satellite Intelligence Platform.
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Request an Enterprise Demo</h3>
            <p className="text-xs text-slate-400 mt-1">Experience live multimodal VQA inference on your own GeoTIFF granules.</p>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="Work Email (e.g. name@agency.gov)"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Organization / Government Entity"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                onClick={() => { alert('Demo requested! Our engineering team will contact you.'); setShowDemoModal(false); }}
                className="w-full rounded-xl bg-cyan-400 py-2.5 text-xs font-extrabold uppercase text-slate-950 hover:bg-cyan-300 transition cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
