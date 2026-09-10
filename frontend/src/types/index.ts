// ==========================================
// 1. IMAGE & GEOSPATIAL TYPES
// ==========================================
export type ImageType = 'optical' | 'sar' | 'multispectral';
export type ImageFormat = 'geotiff' | 'tiff' | 'png' | 'jpeg';

export interface GeospatialMetadata {
  projection: string;
  boundingBox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  resolution: number;
  crs: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  bands?: string[];
  geospatial?: GeospatialMetadata;
  spatialResolution?: string;
  acquisitionDate?: string;
  satellite?: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  type: ImageType;
  format: ImageFormat;
  metadata: ImageMetadata;
  size: number;
  isValid: boolean;
  validationErrors?: string[];
  uploadProgress: number;
  role?: 'primary' | 't1' | 't2' | 'optical' | 'sar';
}

// ==========================================
// 2. QUERY TYPES
// ==========================================
export type QueryTaskType = 
  | 'vqa' 
  | 'captioning' 
  | 'grounding' 
  | 'change' 
  | 'cross-modal'
  | 'auto';

export type QueryStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Query {
  id: string;
  text: string;
  timestamp: Date;
  imageIds: string[];
  taskType: QueryTaskType;
  status: QueryStatus;
  priority?: 'low' | 'medium' | 'high';
}

// ==========================================
// 3. ANNOTATIONS & RESULTS
// ==========================================
export interface Annotation {
  id: string;
  type: 'boundingBox' | 'mask' | 'point' | 'polygon';
  label: string;
  confidence: number;
  coordinates: number[]; // e.g. [minLat, minLng, maxLat, maxLng]
  color: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'raster' | 'vector' | 'heatmap';
  url?: string;
  visible: boolean;
}

export interface VisualEvidence {
  image: string;
  annotations: Annotation[];
  mapOverlay?: any;
  layers?: MapLayer[];
  changeHeatmapUrl?: string;
}

export interface ResultMetadata {
  modelUsed: string;
  modelVersion: string;
  executionTime: number;
  parameters: Record<string, string | number | boolean>;
  confidenceBreakdown?: Record<string, number>;
}

export interface Result {
  id: string;
  queryId: string;
  text: string;
  confidence: number;
  visualEvidence?: VisualEvidence;
  metadata: ResultMetadata;
  timestamp: Date;
  evidencePoints?: string[];
  analytics?: LandCoverDistribution[];
}

export interface LandCoverDistribution {
  category: string;
  percentage: number;
  areaHa: number;
  color: string;
}

// ==========================================
// 4. AGENT & EXECUTION TRACE TYPES
// ==========================================
export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  timestamp: Date;
  progress?: number;
  duration?: number;
}

export interface ExecutionTrace {
  id: string;
  task: string;
  model: string;
  parameters: Record<string, string | number | boolean>;
  steps: ExecutionStep[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  progress?: number;
}

export interface Model {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'busy' | 'offline';
  accuracy: number;
  latency: string;
  description: string;
}

// ==========================================
// 5. REPORT TYPES
// ==========================================
export interface ImageInfo {
  id: string;
  name: string;
  format: string;
  size: number;
  resolution?: string;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: Date;
  query: {
    text: string;
    type: string;
    timestamp: Date;
  };
  images: ImageInfo[];
  results: Result[];
  executionSummary: {
    task: string;
    models: string[];
    parameters: Record<string, string | number | boolean>;
    totalTime: number;
  };
  confidence: {
    overall: number;
    breakdown?: Record<string, number>;
  };
  visualEvidence: string[];
  metadata: {
    version: string;
    generatedBy: string;
  };
}

// ==========================================
// 6. UI & SETTINGS TYPES
// ==========================================
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultView: 'upload' | 'explore' | 'history' | 'reports';
  autoProcess: boolean;
  showTrace: boolean;
  confidenceThreshold: number;
  defaultModelId?: string;
  language: string;
}

export interface UIState {
  isLoading: boolean;
  activeTab: string;
  sidebarOpen: boolean;
  selectedImageIds: string[];
  activeQueryId: string | null;
  notifications: string[];
}

export type AnalysisStage = 'dashboard' | 'analyzing' | 'results';

export interface DatasetItem {
  id: string;
  name: string;
  description: string;
  imageCount: string;
  qaCount?: string;
  classesCount?: string;
  thumbnail: string;
}

export interface ModelItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'Active' | 'Experimental';
}

export interface TeamMember {
  name: string;
  role: string;
  initial: string;
  color: string;
}
