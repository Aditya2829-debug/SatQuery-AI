import React, { useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, LayersControl } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import { Annotation } from '../../types';
import { Eye, Layers } from 'lucide-react';

export interface LeafletMapViewProps {
  annotations?: Annotation[];
  height?: string;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  annotations = [],
  height = '420px',
}) => {
  const [showDetections, setShowDetections] = useState(true);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200 shadow-inner"
      style={{ height }}
    >
      <div className="absolute top-3 right-3 z-[400] flex items-center space-x-2 rounded-lg bg-white/90 p-1.5 shadow-md backdrop-blur">
        <button
          onClick={() => setShowDetections(!showDetections)}
          className={`flex items-center space-x-1 rounded px-2 py-1 text-xs font-medium transition ${
            showDetections ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          <Eye className="h-3 w-3" />
          <span>Bounding Boxes</span>
        </button>
      </div>

      <MapContainer
        center={[37.7749, -122.4194]}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="Satellite High-Res">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {showDetections &&
          annotations.map((box) => {
            const bounds: LatLngBoundsExpression = [
              [box.coordinates[0], box.coordinates[1]],
              [box.coordinates[2], box.coordinates[3]],
            ];
            return (
              <Rectangle
                key={box.id}
                bounds={bounds}
                pathOptions={{
                  color: box.color || '#E74C3C',
                  weight: 2,
                  fillOpacity: 0.2,
                }}
              >
                <Tooltip permanent direction="top">
                  <span className="font-bold">{box.label}</span> ({(box.confidence * 100).toFixed(0)}%)
                </Tooltip>
              </Rectangle>
            );
          })}
      </MapContainer>
    </div>
  );
};
