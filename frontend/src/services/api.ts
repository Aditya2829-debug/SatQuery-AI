import axios from 'axios';
import {
  SatQueryApiResponseEnvelope,
  BackendModelResultEnvelope,
  CD003Result,
  VQAResult,
  RemoteCLIPResult,
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ==========================================
// UI NORMALIZED TYPES
// ==========================================

export interface ScaledBoundingBox {
  id: string;
  label: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  heightPct: number;
  areaPixels: number;
  color: string;
}

export interface ParsedAnalysisPayload {
  analysisId: string;
  query: string;

  specialist:
    | 'vqa'
    | 'region_grounding'
    | 'change_detection'
    | 'optical_sar_fusion'
    | string;

  routerConfidencePct: number;
  routerReason: string;

  modelName: string;
  modelVersion: string;

  limitations: string[];
  latencyStr: string;

  // ========================================
  // Model-specific parsed data
  // ========================================

  vqaAnswer?: string;

  changeData?: {
    changed: boolean;
    changePercent: number;
    threshold: number;
    numRegions: number;
    regions: ScaledBoundingBox[];
  };

  groundingData?: {
    topLabel: string;
    similarityScore: number;
    classScores: Array<{
      label: string;
      score: number;
    }>;
    retrievalMatches: Array<{
      rank: number;
      label: string;
      score: number;
    }>;
  };
}

// ==========================================
// BACKEND RESPONSE HELPERS
// ==========================================

interface ImageUploadResponse {
  image_id?: string;
  id?: string;
  data?: {
    image_id?: string;
    id?: string;
  };
}

interface CreateAnalysisResponse {
  analysis_id?: string;
  id?: string;
  data?: {
    analysis_id?: string;
    id?: string;
  };
}

// ==========================================
// SATQUERY BACKEND SERVICE
// ==========================================

export class SatQueryBackendService {
  /**
   * Phase 1:
   * Upload image to the backend/Supabase and
   * return the real image UUID.
   */
  static async uploadImage(file: File): Promise<string> {
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    if (!file) {
      throw new Error('No image file was provided.');
    }

    if (file.size > MAX_BYTES) {
      throw new Error(
        `File "${file.name}" exceeds the 10MB limit.`
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post<ImageUploadResponse>(
        '/api/v1/images/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = res.data;

      const realId =
        data?.image_id ??
        data?.id ??
        data?.data?.image_id ??
        data?.data?.id;

      if (!realId) {
        throw new Error(
          'Backend failed to return an image UUID.'
        );
      }

      console.log(
        'Image persisted in Supabase. Real UUID:',
        realId
      );

      return String(realId);
    } catch (error) {
      throw this.normalizeApiError(
        error,
        'Failed to upload image.'
      );
    }
  }

  /**
   * Phase 2:
   * Create an analysis record.
   */
  static async createAnalysis(
    imageIds: string[],
    query: string
  ): Promise<string> {
    if (!imageIds || imageIds.length === 0) {
      throw new Error(
        'At least one image is required to create an analysis.'
      );
    }

    if (!query || !query.trim()) {
      throw new Error(
        'A query is required to create an analysis.'
      );
    }

    const payload = {
      image_ids: imageIds,
      query: query.trim(),
    };

    try {
      const res =
        await apiClient.post<CreateAnalysisResponse>(
          '/api/v1/analyses',
          payload
        );

      const data = res.data;

      const realAnalysisId =
        data?.analysis_id ??
        data?.id ??
        data?.data?.analysis_id ??
        data?.data?.id;

      if (!realAnalysisId) {
        throw new Error(
          'Backend failed to return an analysis UUID.'
        );
      }

      return String(realAnalysisId);
    } catch (error) {
      throw this.normalizeApiError(
        error,
        'Failed to create analysis.'
      );
    }
  }

  /**
   * Phase 3:
   * Execute the model pipeline for an analysis.
   *
   * ✅ FIXED:
   *  - Does NOT throw on `model_result.status === 'NOT_IMPLEMENTED'`.
   *    Instead, returns the envelope so the UI can display an
   *    informational limitation message.
   *  - Does NOT throw on backend messages that contain the word
   *    "success" (fixes the "Analysis executed successfully"
   *    false-positive alert).
   *  - Returns a placeholder envelope if `model_result` is missing.
   */
  static async runAnalysis(
    analysisId: string
  ): Promise<SatQueryApiResponseEnvelope> {
    if (!analysisId || !analysisId.trim()) {
      throw new Error(
        'A valid analysis ID is required to run the analysis.'
      );
    }

    try {
      const res =
        await apiClient.post<SatQueryApiResponseEnvelope>(
          `/api/v1/analyses/${encodeURIComponent(
            analysisId
          )}/run`
        );

      const envelope = res.data;

      // ----------------------------------------
      // 1. Validate envelope exists
      // ----------------------------------------
      if (!envelope) {
        throw new Error(
          'Backend returned an empty analysis response.'
        );
      }

      // ----------------------------------------
      // 2. Only fail on explicit top-level error
      // ----------------------------------------
      if (envelope.status === 'error') {
        throw new Error(
          envelope.message ||
            'The backend reported an analysis error.'
        );
      }

      // ----------------------------------------
      // 3. Validate data envelope structure
      // ----------------------------------------
      if (!envelope.data) {
        throw new Error(
          'Backend response is missing analysis data.'
        );
      }

      // ----------------------------------------
      // 4. Handle missing model_result gracefully
      //    (e.g. specialist not yet wired up)
      // ----------------------------------------
      if (!envelope.data.model_result) {
        console.warn(
          'SatQuery: backend returned no model_result. ' +
            'Returning placeholder envelope.'
        );

        return {
          ...envelope,
          data: {
            ...envelope.data,
            model_result: {
              status: 'NOT_IMPLEMENTED',
              result: {} as BackendModelResultEnvelope['result'],
              model_name:
                envelope.data.selected_specialist ||
                'Unknown',
              model_version: '0.0.0',
              limitations: [
                envelope.message ||
                  'This specialist model is not yet implemented.',
              ],
              processing_time_ms: 0,
            },
          },
        };
      }

      // ----------------------------------------
      // 5. Handle NOT_IMPLEMENTED / error model status
      //    WITHOUT throwing — return envelope as-is.
      //    The UI will show `limitations` gracefully.
      // ----------------------------------------
      const modelStatus =
        envelope.data.model_result.status;

      if (
        modelStatus === 'error' ||
        modelStatus === 'NOT_IMPLEMENTED'
      ) {
        console.warn(
          `SatQuery: model status = "${modelStatus}". ` +
            `Message: "${envelope.message}". ` +
            `Returning envelope for informational display.`
        );
        return envelope;
      }

      return envelope;
    } catch (error) {
      // ----------------------------------------
      // 6. Avoid masking successful messages as errors
      // ----------------------------------------
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              detail?: string;
              message?: string;
              error?: string;
              data?: unknown;
            }
          | undefined;

        const backendMsg =
          responseData?.detail ||
          responseData?.message ||
          responseData?.error;

        // If the backend "error" message actually contains
        // "success", it's a false positive — recover.
        if (
          typeof backendMsg === 'string' &&
          backendMsg.toLowerCase().includes('success') &&
          responseData?.data
        ) {
          console.warn(
            'SatQuery: detected false-positive error from backend:',
            backendMsg
          );
          return responseData.data as SatQueryApiResponseEnvelope;
        }
      }

      throw this.normalizeApiError(
        error,
        'Failed to run analysis.'
      );
    }
  }

  /**
   * End-to-end execution:
   *
   * 1. Create analysis
   * 2. Run analysis
   * 3. Normalize backend output for the UI
   */
  static async executeFullAnalysisPipeline(
    imageIds: string[],
    query: string
  ): Promise<ParsedAnalysisPayload> {
    const analysisId = await this.createAnalysis(
      imageIds,
      query
    );

    const envelope = await this.runAnalysis(
      analysisId
    );

    return this.parseModelOutput(envelope);
  }

  /**
   * Translate the backend envelope into the normalized
   * UI payload consumed by AnalyzePage.
   */
  private static parseModelOutput(
    envelope: SatQueryApiResponseEnvelope
  ): ParsedAnalysisPayload {
    if (!envelope?.data) {
      throw new Error(
        'Invalid backend response: missing data.'
      );
    }

    const { data } = envelope;

    if (!data.model_result) {
      throw new Error(
        'Invalid backend response: missing model result.'
      );
    }

    const modelResult: BackendModelResultEnvelope =
      data.model_result;

    const specialist =
      data.selected_specialist;

    // ----------------------------------------
    // Router information
    // ----------------------------------------

    const routerConfidencePct = Math.round(
      Math.max(
        0,
        Math.min(1, Number(data.confidence) || 0)
      ) * 100
    );

    const modelName =
      modelResult.model_name ||
      specialist ||
      'Unknown Model';

    const modelVersion =
      modelResult.model_version ||
      '1.0.0';

    const limitations =
      Array.isArray(modelResult.limitations)
        ? [...modelResult.limitations]
        : [];

    // ----------------------------------------
    // Processing latency
    // ----------------------------------------

    let latencyStr = 'N/A';

    if (
      typeof modelResult.processing_time_ms ===
        'number' &&
      Number.isFinite(
        modelResult.processing_time_ms
      )
    ) {
      latencyStr = `${(
        modelResult.processing_time_ms / 1000
      ).toFixed(2)}s`;
    }

    // ----------------------------------------
    // Base normalized payload
    // ----------------------------------------

    const parsed: ParsedAnalysisPayload = {
      analysisId: data.analysis_id,
      query: data.query,
      specialist,
      routerConfidencePct,
      routerReason: data.reason || '',
      modelName,
      modelVersion,
      limitations,
      latencyStr,
    };

    const result = modelResult.result;

    // ----------------------------------------
    // ✅ NEW: Handle NOT_IMPLEMENTED / empty result
    // ----------------------------------------
    if (
      !result ||
      typeof result !== 'object' ||
      Object.keys(result).length === 0
    ) {
      parsed.limitations = [
        ...parsed.limitations,
        `Specialist "${specialist}" returned no result payload. ` +
          `Status: ${modelResult.status}.`,
      ];
      return parsed;
    }

    // ========================================
    // 1. CHANGE DETECTION
    // CD003 UNet-ResNet34
    // ========================================

    if (
      specialist === 'change_detection' ||
      this.isCD003Result(result)
    ) {
      const cd = result as CD003Result;

      const scaledRegions: ScaledBoundingBox[] =
        Array.isArray(cd.regions)
          ? cd.regions.map((region, index) => {
              const [x1, y1, x2, y2] = region.bbox;

              // CD003 outputs coordinates in 256x256
              // mask space. Convert to percentages
              // for the frontend viewport.

              const leftPct = (x1 / 256) * 100;
              const topPct = (y1 / 256) * 100;

              const widthPct = Math.max(
                ((x2 - x1) / 256) * 100,
                2
              );
              const heightPct = Math.max(
                ((y2 - y1) / 256) * 100,
                2
              );

              return {
                id: `cd_box_${index}`,
                label: `Zone #${index + 1}`,
                leftPct,
                topPct,
                widthPct,
                heightPct,
                areaPixels:
                  Number(region.area_pixels) || 0,
                color: '#EF4444',
              };
            })
          : [];

      parsed.changeData = {
        changed: Boolean(cd.changed),

        changePercent:
          Number(cd.change_percent) || 0,

        threshold:
          typeof cd.threshold === 'number'
            ? cd.threshold
            : 0.75,

        numRegions:
          typeof cd.num_regions === 'number'
            ? cd.num_regions
            : scaledRegions.length,

        regions: scaledRegions,
      };

      return parsed;
    }

    // ========================================
    // 2. VISUAL QUESTION ANSWERING
    // Qwen3-VL-2B-Instruct
    // ========================================

    if (
      specialist === 'vqa' ||
      this.isVQAResult(result)
    ) {
      const vqa = result as VQAResult;

      parsed.vqaAnswer =
        vqa.answer ||
        vqa.raw_answer ||
        'No direct text answer generated.';

      return parsed;
    }

    // ========================================
    // 3. REGION GROUNDING
    // RemoteCLIP ViT-B/32
    // ========================================

    if (
      specialist === 'region_grounding' ||
      this.isRemoteCLIPResult(result)
    ) {
      const rg = result as RemoteCLIPResult;

      const classification = rg.classification;

      const classScoresList = Object.entries(
        classification.class_scores || {}
      )
        .map(([label, score]) => ({
          label,
          score: Number(score) || 0,
        }))
        .sort((a, b) => b.score - a.score);

      const retrievalMatches = Array.isArray(
        rg.retrieval
      )
        ? rg.retrieval.map((match) => ({
            rank: match.rank,
            label: match.label,
            score: Number(match.score) || 0,
          }))
        : [];

      parsed.groundingData = {
        topLabel:
          classification.top_label ||
          rg.predicted_class ||
          'Unknown',

        similarityScore:
          typeof classification.confidence_score ===
          'number'
            ? classification.confidence_score
            : Number(rg.similarity_score) || 0,

        classScores: classScoresList,

        retrievalMatches,
      };

      return parsed;
    }

    // ========================================
    // Unknown / future specialist
    // ========================================

    console.warn(
      'SatQuery: received an unsupported specialist result:',
      specialist
    );

    return parsed;
  }

  // ==========================================
  // TYPE GUARDS
  // ==========================================

  private static isCD003Result(
    result: unknown
  ): result is CD003Result {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const value = result as Partial<CD003Result>;

    return (
      typeof value.changed === 'boolean' &&
      typeof value.change_percent === 'number' &&
      Array.isArray(value.regions)
    );
  }

  private static isVQAResult(
    result: unknown
  ): result is VQAResult {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const value = result as Partial<VQAResult>;

    return typeof value.answer === 'string';
  }

  private static isRemoteCLIPResult(
    result: unknown
  ): result is RemoteCLIPResult {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const value = result as Partial<RemoteCLIPResult>;

    return (
      !!value.classification &&
      typeof value.classification === 'object' &&
      typeof value.classification.top_label ===
        'string' &&
      typeof value.classification
        .confidence_score === 'number'
    );
  }

  // ==========================================
  // ERROR NORMALIZATION
  // ==========================================

  private static normalizeApiError(
    error: unknown,
    fallbackMessage: string
  ): Error {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;

      if (
        responseData &&
        typeof responseData === 'object'
      ) {
        const data = responseData as {
          detail?: string;
          message?: string;
          error?: string;
        };

        const backendMessage =
          data.detail || data.message || data.error;

        if (backendMessage) {
          return new Error(String(backendMessage));
        }
      }

      if (error.code === 'ECONNABORTED') {
        return new Error(
          'The analysis request timed out. The model may still be processing.'
        );
      }

      if (error.response?.status === 404) {
        return new Error(
          'The requested API endpoint was not found.'
        );
      }

      if (error.response?.status === 500) {
        return new Error(
          'The backend encountered an internal server error.'
        );
      }

      if (!error.response) {
        return new Error(
          'Unable to connect to the SatQuery backend. Make sure the backend server is running.'
        );
      }

      return new Error(
        error.message || fallbackMessage
      );
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(fallbackMessage);
  }
}