import { LandCoverDistribution } from '../types';

export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    category: string;
    areaSqKm: number;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  coordinates: [number, number, number, number];
  color: string;
}

export const DUMMY_CENTER_COORDS: [number, number] = [37.7749, -122.4194];

// Sample GeoJSON water/change features
export const SAMPLE_GEOJSON_WATER_FEATURES: GeoJSONFeature[] = [
  {
    type: 'Feature',
    properties: {
      name: 'Main Reservoir & Estuary',
      category: 'Water Body',
      areaSqKm: 18.4,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.43, 37.78],
          [-122.41, 37.79],
          [-122.39, 37.77],
          [-122.4, 37.75],
          [-122.43, 37.78],
        ],
      ],
    },
  },
  {
    type: 'Feature',
    properties: {
      name: 'Sediment Expansion Zone',
      category: 'Wetland/Change',
      areaSqKm: 4.2,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.39, 37.77],
          [-122.37, 37.78],
          [-122.36, 37.76],
          [-122.38, 37.75],
          [-122.39, 37.77],
        ],
      ],
    },
  },
];

// Sample detection bounding boxes
export const SAMPLE_BOUNDING_BOXES: BoundingBox[] = [
  {
    id: 'box-1',
    label: 'Industrial Port Facilities',
    confidence: 0.94,
    coordinates: [37.782, -122.415, 37.795, -122.395],
    color: '#E74C3C',
  },
  {
    id: 'box-2',
    label: 'Primary Water Reservoir',
    confidence: 0.98,
    coordinates: [37.755, -122.428, 37.775, -122.401],
    color: '#3E92CC',
  },
  {
    id: 'box-3',
    label: 'Dense Urban Canopy',
    confidence: 0.89,
    coordinates: [37.76, -122.445, 37.772, -122.425],
    color: '#2ECC71',
  },
  {
    id: 'box-4',
    label: 'Recent Construction Zone (Expansion)',
    confidence: 0.91,
    coordinates: [37.74, -122.39, 37.752, -122.37],
    color: '#F5A623',
  },
];

// Sample land-cover analytics
export const SAMPLE_ANALYTICS: LandCoverDistribution[] = [
  {
    category: 'Built-Up / Urban',
    percentage: 46.2,
    areaHa: 4120,
    color: '#E74C3C',
  },
  {
    category: 'Water Bodies',
    percentage: 28.5,
    areaHa: 2540,
    color: '#3E92CC',
  },
  {
    category: 'Vegetation / Forest',
    percentage: 17.8,
    areaHa: 1588,
    color: '#2ECC71',
  },
  {
    category: 'Bare Soil / Exposed',
    percentage: 7.5,
    areaHa: 669,
    color: '#F5A623',
  },
];

export function determineTaskType(
  query: string
): 'vqa' | 'captioning' | 'grounding' | 'change' | 'cross-modal' {
  const q = query.toLowerCase();

  if (
    q.includes('change') ||
    q.includes('between these two') ||
    q.includes('increased') ||
    q.includes('decreased')
  ) {
    return 'change';
  }

  if (
    q.includes('highlight') ||
    q.includes('locate') ||
    q.includes('where is') ||
    q.includes('bounding')
  ) {
    return 'grounding';
  }

  if (
    q.includes('sar') ||
    q.includes('optical and') ||
    q.includes('cross-modal')
  ) {
    return 'cross-modal';
  }

  if (
    q.includes('describe') ||
    q.includes('caption') ||
    q.includes('summary')
  ) {
    return 'captioning';
  }

  return 'vqa';
}