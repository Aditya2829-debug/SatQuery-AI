import { Result, ExecutionTrace, TaskType, UploadedImage } from '../types';
import { SAMPLE_ANALYTICS, SAMPLE_BOUNDING_BOXES, SAMPLE_GEOJSON_WATER_FEATURES } from '../utils/geoUtils';

export class SatQueryApiService {
  static async uploadImage(file: File, type: UploadedImage['type']): Promise<UploadedImage> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate file parse & metadata read

    const isGeoTiff = file.name.endsWith('.tif') || file.name.endsWith('.tiff');
    return {
      id: 'img_' + Math.random().toString(36).substring(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type,
      format: isGeoTiff ? 'geotiff' : file.type.includes('png') ? 'png' : 'jpeg',
      isValid: true,
      metadata: {
        width: 2048,
        height: 2048,
        bands: isGeoTiff ? ['B02 (Blue)', 'B03 (Green)', 'B04 (Red)', 'B08 (NIR)'] : ['RGB'],
        spatialResolution: isGeoTiff ? '10m / pixel' : '0.5m / pixel',
        crs: 'EPSG:4326 - WGS 84',
        acquisitionDate: new Date().toISOString().split('T')[0],
        satellite: type === 'sar' ? 'Sentinel-1B (C-Band SAR)' : 'Sentinel-2A (MSI)',
      },
    };
  }

  static createExecutionPlan(task: TaskType, model: string): ExecutionTrace {
    return {
      id: 'exec_' + Math.random().toString(36).substring(2, 9),
      task,
      model,
      parameters: {
        temperature: 0.1,
        iouThreshold: 0.5,
        resolution: '10m',
        radiometricCalibration: true,
      },
      status: 'queued',
      progress: 5,
      steps: [
        { id: 's1', name: 'Input Preprocessing', description: 'Reprojecting CRS and calibrating radiometric values', status: 'pending' },
        { id: 's2', name: 'Prompt & Token Routing', description: 'Aligning multimodal embeddings with spatial query tokens', status: 'pending' },
        { id: 's3', name: 'Agentic Vision-Language Inference', description: `Executing ${model} cross-attention backbone`, status: 'pending' },
        { id: 's4', name: 'Post-Processing & Mask Vectorization', description: 'Generating spatial masks, bounding polygons and confidence scores', status: 'pending' },
      ],
    };
  }

  static async executeQueryWithProgress(
    queryText: string,
    taskType: TaskType,
    model: string,
    onProgress: (progress: number, stepIndex: number) => void
  ): Promise<Result> {
    // Step 1
    onProgress(20, 0);
    await new Promise((r) => setTimeout(r, 700));

    // Step 2
    onProgress(45, 1);
    await new Promise((r) => setTimeout(r, 800));

    // Step 3
    onProgress(75, 2);
    await new Promise((r) => setTimeout(r, 1100));

    // Step 4
    onProgress(95, 3);
    await new Promise((r) => setTimeout(r, 700));

    onProgress(100, 4);

    let answerText = '';
    if (taskType === 'change') {
      answerText =
        'Comparative bi-temporal synthesis demonstrates a net increase of +14.2% in urban built-up structures along the northeastern perimeter. Significant soil conversions and shoreline sedimentation were recognized. Water coverage decreased slightly by 2.1% due to seasonal shrinkage.';
    } else if (taskType === 'grounding') {
      answerText =
        'Identified and spatially bounded the requested primary reservoir (98.2% confidence) and adjoining estuary network. All localized coordinates have been overlaid on the cartographic canvas.';
    } else if (taskType === 'cross-modal') {
      answerText =
        'Optical multi-band data combined with SAR backscatter intensity reveals sharp boundaries between smooth flat surfaces (water bodies yielding low SAR backscatter) and double-bounce urban structures (high cross-polarization HV/VV reflection).';
    } else {
      answerText =
        'The satellite scene encompasses high-density metropolitan infrastructure, maritime docks, and an expansive estuary reservoir. Vegetation belts are maintained along northwestern ridges with an overall scene NDVI average of 0.48.';
    }

    return {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      queryId: 'q_' + Math.random().toString(36).substring(2, 9),
      text: answerText,
      confidence: 0.942,
      visualEvidence: {
        image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
        annotations: SAMPLE_BOUNDING_BOXES,
        mapOverlay: {
          type: 'FeatureCollection',
          features: SAMPLE_GEOJSON_WATER_FEATURES,
        },
        changeHeatmapUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=800&q=80',
      },
      analytics: SAMPLE_ANALYTICS,
      metadata: {
        modelUsed: model,
        executionTime: 3300,
        resolutionMeters: 10,
        detectedObjectsCount: SAMPLE_BOUNDING_BOXES.length,
      },
    };
  }
}