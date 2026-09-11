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

export type QueryStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

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
  coordinates: number[];
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
  mapOverlay?: unknown;
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
// 4. HISTORY TYPES
// ==========================================

export type HistoryItemStatus =
  | 'Completed'
  | 'Failed'
  | 'Processing';

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  taskType: string;
  status: HistoryItemStatus;
  thumbnail: string;
}

// ==========================================
// 5. AGENT & EXECUTION TRACE TYPES
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
// 6. REPORT TYPES
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
// 7. UI & SETTINGS TYPES
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

export type AnalysisStage =
  | 'dashboard'
  | 'analyzing'
  | 'results';

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

// ============================================================================
// SATQUERY AI MODEL OUTPUT SCHEMAS
// Matches Model Output Documentation v1.0
// ============================================================================

// ==========================================
// 8. CHANGE DETECTION
// CD003 UNet-ResNet34
// ==========================================

export interface CD003Region {
  bbox: [number, number, number, number];
  // [x1, y1, x2, y2] in 256x256 mask space

  area_pixels: number;

  center: [number, number];
  // [cx, cy]
}

export interface CD003Result {
  changed: boolean;
  change_percent: number;
  threshold: number;
  num_regions: number;
  regions: CD003Region[];

  source_size?: {
    width: number;
    height: number;
  };

  mask_size?: {
    width: number;
    height: number;
  };
}

// ==========================================
// 9. VISUAL QUESTION ANSWERING
// Qwen3-VL-2B-Instruct
// ==========================================

export interface VQAResult {
  answer: string;
  raw_answer?: string;
  model?: string;
  confidence?: number | null;
}

// ==========================================
// 10. REGION GROUNDING
// RemoteCLIP ViT-B/32
// ==========================================

export interface RemoteCLIPClassification {
  top_label: string;

  top_label_index?: number;

  confidence_score: number;
  // Cosine similarity (typically 0.15 - 0.35)

  class_scores: Record<string, number>;
  // EuroSAT class scores
}

export interface RemoteCLIPRetrieval {
  rank: number;
  index: number;
  score: number;
  label: string;
}

export interface RemoteCLIPResult {
  classification: RemoteCLIPClassification;

  retrieval?: RemoteCLIPRetrieval[];

  predicted_class?: string;

  similarity_score?: number;
}

// ==========================================
// 11. UNIVERSAL MODEL RESULT CONTAINER
// ==========================================

export type BackendModelResult =
  | CD003Result
  | VQAResult
  | RemoteCLIPResult;

export interface BackendModelResultEnvelope {
  status:
    | 'success'
    | 'error'
    | 'NOT_IMPLEMENTED'
    | string;

  result: BackendModelResult;

  confidence?: number | null;

  model_name?: string;

  model_version?: string;

  limitations?: string[];

  processing_time_ms?: number | null;
}

// ==========================================
// 12. COMMON SATQUERY API RESPONSE
// ==========================================

export type SpecialistType =
  | 'vqa'
  | 'region_grounding'
  | 'change_detection'
  | 'optical_sar_fusion'
  | string;

export interface SatQueryApiResponseEnvelope {
  status: 'success' | 'error';

  message: string;

  data: {
    analysis_id: string;
    // UUID

    query: string;

    selected_specialist: SpecialistType;

    confidence: number;
    // Gemini router confidence (0.0 to 1.0)

    reason: string;
    // Gemini explanation

    model_result: BackendModelResultEnvelope;
  };
}