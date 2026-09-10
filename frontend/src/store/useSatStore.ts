import { create } from 'zustand';
import {
  UploadedImage,
  Query,
  Result,
  ExecutionTrace,
  Report,
  AppSettings,
  UIState,
  AnalysisStage,
  Model,
  HistoryItem,
} from '../types';

export const AVAILABLE_MODELS: Model[] = [
  {
    id: 'm1',
    name: 'RS-VQA-Specialist v2.1',
    type: 'VQA',
    status: 'online',
    accuracy: 87.5,
    latency: '1.2s',
    description: 'Vision-language model optimized for high-resolution optical remote sensing.',
  },
  {
    id: 'm2',
    name: 'Change-Detector v3.0',
    type: 'Change Detection',
    status: 'busy',
    accuracy: 92.1,
    latency: '0.8s',
    description: 'Siamese U-Net network for pixel-level bi-temporal surface change detection.',
  },
  {
    id: 'm3',
    name: 'Optical-SAR-Fusion v1.4',
    type: 'Cross-modal',
    status: 'online',
    accuracy: 81.3,
    latency: '2.1s',
    description: 'Joint optical RGB and radar backscatter cross-attention model.',
  },
];

interface SatStoreState {
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Images
  images: UploadedImage[];
  addImages: (newImages: UploadedImage[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  updateImageRole: (id: string, role: UploadedImage['role']) => void;

  // Queries
  queries: Query[];
  addQuery: (query: Query) => void;
  deleteQuery: (id: string) => void;
  clearQueries: () => void;

  // Dynamic History
  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;

  // Navigation
  stage: AnalysisStage;
  setStage: (stage: AnalysisStage) => void;
  activeQueryText: string;
  setActiveQueryText: (text: string) => void;
  selectedExample: (exampleType: string) => void;

  // Models
  models: Model[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  currentTrace: ExecutionTrace | null;
  setCurrentTrace: (trace: ExecutionTrace | null) => void;
  updateTraceProgress: (progress: number, stepIndex: number) => void;
  cancelTrace: () => void;

  // Results
  results: Result[];
  currentResult: Result | null;
  setCurrentResult: (result: Result | null) => void;

  // Reports
  reports: Report[];
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;

  // Settings & UI
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  ui: UIState;
  setUIState: (newUI: Partial<UIState>) => void;
}

// Initial theme check from storage
const isInitialDark = typeof window !== 'undefined' && localStorage.getItem('satquery_theme') === 'dark';
if (isInitialDark && typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
  document.body.classList.add('dark');
}

export const useSatStore = create<SatStoreState>((set) => ({
  darkMode: isInitialDark,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      if (typeof document !== 'undefined') {
        if (next) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
          localStorage.setItem('satquery_theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
          localStorage.setItem('satquery_theme', 'light');
        }
      }
      return { darkMode: next };
    }),

  images: [],
  addImages: (newImages) => set((state) => ({ images: [...state.images, ...newImages] })),
  removeImage: (id) =>
    set((state) => ({ images: state.images.filter((img) => img.id !== id) })),
  clearImages: () => set({ images: [] }),
  updateImageRole: (id, role) =>
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, role } : img)),
    })),

  queries: [],
  addQuery: (query) => set((state) => ({ queries: [query, ...state.queries] })),
  deleteQuery: (id) =>
    set((state) => ({ queries: state.queries.filter((q) => q.id !== id) })),
  clearQueries: () => set({ queries: [] }),

  history: [],
  addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
  deleteHistoryItem: (id) =>
    set((state) => ({ history: state.history.filter((h) => h.id !== id) })),
  clearHistory: () => set({ history: [] }),

  stage: 'dashboard',
  setStage: (stage) => set({ stage }),
  activeQueryText: '',
  setActiveQueryText: (activeQueryText) => set({ activeQueryText }),

  selectedExample: (exampleType: string) => {
    let q = 'What changed between these two dates, and where did the change occur?';
    if (exampleType === 'flood') q = 'Identify flood zones using Optical and SAR data.';
    if (exampleType === 'urban') q = 'Locate all built-up areas and roads in this image.';
    if (exampleType === 'landcover') q = 'Describe the land-cover and major objects visible in this image.';
    set({ activeQueryText: q, stage: 'analyzing' });
  },

  models: AVAILABLE_MODELS,
  selectedModelId: 'm1',
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),

  currentTrace: null,
  setCurrentTrace: (currentTrace) => set({ currentTrace }),
  updateTraceProgress: (progress, stepIndex) =>
    set((state) => {
      if (!state.currentTrace) return state;
      const updatedSteps = state.currentTrace.steps.map((step, idx) => {
        if (idx < stepIndex) return { ...step, status: 'completed' as const };
        if (idx === stepIndex) return { ...step, status: 'running' as const };
        return { ...step, status: 'pending' as const };
      });
      return {
        currentTrace: {
          ...state.currentTrace,
          progress,
          steps: updatedSteps,
        },
      };
    }),
  cancelTrace: () =>
    set((state) => ({
      currentTrace: state.currentTrace
        ? { ...state.currentTrace, status: 'failed' }
        : null,
      stage: 'dashboard',
    })),

  results: [],
  currentResult: null,
  setCurrentResult: (currentResult) =>
    set((state) => ({
      currentResult,
      results: currentResult ? [currentResult, ...state.results] : state.results,
    })),

  reports: [],
  addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })),
  deleteReport: (id) =>
    set((state) => ({ reports: state.reports.filter((r) => r.id !== id) })),

  settings: {
    theme: 'light',
    defaultView: 'upload',
    autoProcess: true,
    showTrace: true,
    confidenceThreshold: 0.85,
    defaultModelId: 'm1',
    language: 'en',
  },
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  ui: {
    isLoading: false,
    activeTab: 'text',
    sidebarOpen: true,
    selectedImageIds: [],
    activeQueryId: null,
    notifications: ['Model weights loaded', 'EPSG:4326 verified'],
  },
  setUIState: (newUI) => set((state) => ({ ui: { ...state.ui, ...newUI } })),
}));
