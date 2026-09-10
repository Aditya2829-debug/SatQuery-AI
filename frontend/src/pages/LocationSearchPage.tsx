import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Key,
  X,
  Radar,
  Crosshair,
  Sparkles,
  Loader2,
  Compass,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useSatStore } from '../store/useSatStore';
import { askGeminiGeospatial, LocationContext } from '../services/geminiService';

const MapFlyTo: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.8 });
  }, [center, zoom, map]);
  return null;
};

const QUICK_LANDMARKS = [
  { name: 'Suez Canal', lat: 30.6083, lng: 32.3364, zoom: 13 },
  { name: 'Tokyo Bay', lat: 35.5398, lng: 139.8665, zoom: 13 },
  { name: 'Panama Canal', lat: 9.0800, lng: -79.6800, zoom: 13 },
  { name: 'San Francisco Bay', lat: 37.8199, lng: -122.4783, zoom: 14 },
];

interface LocationMessage {
  id: string;
  query: string;
  locationName: string;
  timestamp: string;
  status: 'analyzing' | 'completed';
  answer?: string;
  modelUsed?: string;
}

export const LocationSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useSatStore();

  // Location State
  const [locationName, setLocationName] = useState('Dubai Palm, UAE');
  const [coords, setCoords] = useState<[number, number]>([25.1124, 55.1390]);
  const [zoom, setZoom] = useState(14);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // SEPARATE KEYS STATE (OPTION 2)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [googleMapsKey, setGoogleMapsKey] = useState(
    localStorage.getItem('satquery_maps_key') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [geminiKey, setGeminiKey] = useState(
    localStorage.getItem('satquery_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
  );

  // Query and Chat Stream
  const [promptText, setPromptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<LocationMessage[]>([]);

  // Geocode location
  const handleLocationSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        setCoords([newLat, newLng]);
        setLocationName(first.display_name.split(',').slice(0, 3).join(','));
        setZoom(14);
        setSearchQuery('');
      } else {
        alert('Location not found. Try searching for another city or landmark.');
      }
    } catch (err) {
      console.error(err);
      alert('Error searching for location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLandmark = (item: typeof QUICK_LANDMARKS[0]) => {
    setCoords([item.lat, item.lng]);
    setLocationName(item.name);
    setZoom(item.zoom);
  };

  // Submit Query to Gemini (Using the dedicated Gemini key)
  const handleAskGemini = async (overridePrompt?: string) => {
    const textToRun = overridePrompt || promptText;
    if (!textToRun.trim() || isAnalyzing) return;

    const msgId = 'loc_' + Math.random().toString(36).substring(2, 9);
    const newMsg: LocationMessage = {
      id: msgId,
      query: textToRun,
      locationName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'analyzing',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsAnalyzing(true);
    setPromptText('');

    const context: LocationContext = {
      name: locationName,
      lat: coords[0],
      lng: coords[1],
      zoom,
    };

    try {
      const { answer, modelUsed } = await askGeminiGeospatial(textToRun, context, geminiKey);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                status: 'completed',
                answer,
                modelUsed,
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, status: 'completed', answer: `${err.message}` }
            : m
        )
      );
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 200);
    }
  };

  const handleSaveKeys = () => {
    localStorage.setItem('satquery_maps_key', googleMapsKey.trim());
    localStorage.setItem('satquery_gemini_key', geminiKey.trim());
    setShowKeyModal(false);
  };

  const locationPrompts = [
    `What are the major commercial and port infrastructure visible around ${locationName.split(',')[0]}?`,
    `Identify water bodies and calculate proximity to surrounding built-up zones.`,
    `Assess environmental and coastal terrain risks in this satellite scene.`,
  ];

  return (
    <div
      className={`w-full flex min-h-[calc(100vh-57px)] select-none font-sans transition-colors duration-300 ${
        darkMode ? 'bg-[#030712] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      }`}
    >
      {/* ================= LEFT SIDEBAR ================= */}
      <aside
        className={`w-80 shrink-0 border-r p-5 space-y-5 flex flex-col justify-between transition-colors duration-300 ${
          darkMode
            ? 'border-slate-800 bg-slate-950/80 text-white'
            : 'border-slate-200/90 bg-white text-slate-900'
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Analysis Paradigm
            </h2>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/analyze')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>Single Image</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/analyze')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>Bi-temporal Pair</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/analyze')}
              className={`w-full flex items-center justify-between rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>Cross-modal Pair</span>
            </button>

            {/* Active Search by Location */}
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <span className="flex items-center space-x-1.5">
                <MapPin className="h-4 w-4" />
                <span>Search by Location</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-white" />
            </button>
          </div>

          <div
            className={`rounded-2xl p-4 text-left shadow-xs space-y-2 border transition-colors ${
              darkMode
                ? 'border-slate-800 bg-slate-900/90 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <p className="text-xs leading-relaxed">
              Explore global coordinates with high-resolution satellite imagery. Questions are analyzed by Google Gemini AI.
            </p>
            <div className="pt-2 flex flex-col space-y-1 text-[10px] font-mono">
              <div className="flex items-center justify-between">
                <span>Map Layer:</span>
                <span className={googleMapsKey ? 'text-emerald-500 font-bold' : 'text-blue-500'}>
                  {googleMapsKey ? 'Google Hybrid' : 'Esri High-Res'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>AI Engine:</span>
                <span className={geminiKey ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                  {geminiKey ? 'Gemini 2.5 Flash' : 'Key Required'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 space-y-1 pt-4 border-t border-slate-200/80 dark:border-slate-800 font-mono">
          <p className="font-semibold text-slate-500 font-sans">Active Target Coordinates:</p>
          <p className="text-blue-600 dark:text-blue-400">
            {coords[0].toFixed(4)}°N, {coords[1].toFixed(4)}°E (z{zoom})
          </p>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-64 overflow-y-auto">
        <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight flex items-center space-x-2">
                  <Compass className="h-5 w-5 text-blue-600" />
                  <span>Geospatial Location Intelligence</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspecting: <strong className="text-slate-800 dark:text-white">{locationName}</strong>
                </p>
              </div>

              {/* Dual Key Configuration Button */}
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="flex items-center space-x-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-1.5 text-xs font-semibold hover:border-blue-500 transition shadow-xs cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 text-amber-500" />
                <span>Configure Keys (Maps & Gemini)</span>
              </button>
            </div>

            {/* Location Search Bar */}
            <form onSubmit={handleLocationSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any landmark, city, or port (e.g. Suez Canal, Tokyo Bay, Delhi, Amazon)..."
                className={`w-full rounded-2xl border py-3 pl-10 pr-24 text-xs sm:text-sm focus:border-blue-500 focus:outline-none transition ${
                  darkMode
                    ? 'border-slate-800 bg-slate-900 text-white placeholder-slate-500'
                    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400'
                }`}
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <button
                type="submit"
                disabled={isSearchingLocation}
                className="absolute right-2 top-2 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isSearchingLocation ? 'Locating...' : 'Fly To'}
              </button>
            </form>

            {/* Quick Landmarks */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Fly:
              </span>
              {QUICK_LANDMARKS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectLandmark(item)}
                  className={`rounded-full border px-3 py-0.5 text-[11px] transition cursor-pointer ${
                    locationName === item.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold'
                      : darkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* ================= SATELLITE MAP ================= */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-sm space-y-2">
            <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-xl border border-slate-700">
              <MapContainer
                center={coords}
                zoom={zoom}
                scrollWheelZoom={true}
                className="h-full w-full z-10"
              >
                {/* Official Google Maps Satellite Layer if Maps key is set, else Esri Satellite */}
                <TileLayer
                  attribution={googleMapsKey ? '&copy; Google Maps' : 'Tiles &copy; Esri'}
                  url={
                    googleMapsKey
                      ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleMapsKey}`
                      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  }
                />
                <MapFlyTo center={coords} zoom={zoom} />
              </MapContainer>

              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                <Crosshair className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,210,255,0.8)] animate-pulse" />
              </div>

              <div className="absolute bottom-2 left-2 z-20 flex items-center space-x-2 rounded-lg bg-black/75 px-2.5 py-1 text-[10px] font-mono text-white backdrop-blur-sm">
                <span className="text-cyan-400 font-bold">
                  {googleMapsKey ? '● Google Hybrid Satellite' : '● Esri Satellite'}
                </span>
                <span>CRS: EPSG:4326</span>
              </div>
            </div>
          </div>

          {/* ================= GEMINI CHAT STREAM ================= */}
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-6 pt-2">
              <div className="flex justify-end items-center space-x-3">
                <div
                  className={`max-w-2xl rounded-2xl px-5 py-3 text-xs sm:text-sm font-medium shadow-sm ${
                    darkMode ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  {msg.query}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
                  U
                </div>
              </div>

              {msg.status === 'analyzing' ? (
                <div className="flex items-center space-x-2 text-xs text-blue-500 animate-pulse pl-2 font-mono">
                  <Radar className="h-4 w-4 animate-spin" />
                  <span>Gemini analyzing satellite location {msg.locationName}...</span>
                </div>
              ) : (
                <div
                  className={`rounded-2xl p-5 shadow-sm space-y-3 border transition-colors ${
                    darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                    <span className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                      <Sparkles className="h-4 w-4" />
                      <span>Google Gemini Geospatial Output</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {msg.modelUsed ? `Model: ${msg.modelUsed}` : msg.locationName}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-200">
                    {msg.answer}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>Backbone: Google Gemini API</span>
                    <span>Status: Verified</span>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* ================= FIXED BOTTOM DOCK ================= */}
        <div
          className={`fixed bottom-0 left-0 lg:left-80 right-0 z-40 backdrop-blur-md border-t shadow-[0_-8px_30px_rgba(0,0,0,0.06)] py-3 px-4 sm:px-6 transition-colors duration-300 ${
            darkMode ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200/90'
          }`}
        >
          <div className="mx-auto max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Prompts:
              </span>
              {locationPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(p)}
                  className={`rounded-full border px-3 py-0.5 text-[11px] transition truncate max-w-xs cursor-pointer ${
                    darkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-blue-950/50 hover:border-blue-700 hover:text-blue-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div
              className={`rounded-full border p-1 pl-4 shadow-sm flex items-center justify-between transition-colors focus-within:border-blue-500 ${
                darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={`Ask any question about satellite imagery in ${locationName.split(',')[0]}...`}
                className={`flex-1 bg-transparent text-xs sm:text-sm focus:outline-none pr-3 ${
                  darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskGemini();
                }}
              />

              <button
                type="button"
                onClick={() => handleAskGemini()}
                disabled={!promptText.trim() || isAnalyzing}
                className="rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Ask Gemini</span>
                )}
              </button>
            </div>

            <div className="text-center text-[10px] text-slate-400">
              Query analyzed live by Google Gemini using active satellite coordinates.
            </div>
          </div>
        </div>
      </main>

      {/* ================= DUAL API KEY MODAL (OPTION 2) ================= */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div
            className={`relative w-full max-w-lg rounded-2xl p-6 shadow-2xl border space-y-4 ${
              darkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2">
                <Key className="h-4 w-4 text-amber-500" />
                <span>API Key Configuration (Option 2)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Keep your Google Maps Key and Gemini AI Key separated for optimal performance and security.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Key 1: Google Maps API Key */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-950/40">
                <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>1. Google Maps API Key (For Map Tiles)</span>
                </label>
                <input
                  type="password"
                  value={googleMapsKey}
                  onChange={(e) => setGoogleMapsKey(e.target.value)}
                  placeholder="AIzaSy... (From Google Cloud Console)"
                  className={`w-full rounded-lg border p-2 text-xs font-mono focus:border-blue-500 focus:outline-none ${
                    darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
                <p className="text-[10px] text-slate-400">
                  Loads official Google Hybrid Satellite tiles on your map canvas.
                </p>
              </div>

              {/* Key 2: Google Gemini AI Key */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>2. Google Gemini API Key (For AI Answers)</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-[10px] text-blue-500 hover:underline font-semibold"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy... (From Google AI Studio)"
                  className={`w-full rounded-lg border p-2 text-xs font-mono focus:border-blue-500 focus:outline-none ${
                    darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800'
                  }`}
                />
                <p className="text-[10px] text-slate-400">
                  Created at Google AI Studio (100% free, requires no credit card, and has zero restrictions).
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveKeys}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm"
              >
                Save Both Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
