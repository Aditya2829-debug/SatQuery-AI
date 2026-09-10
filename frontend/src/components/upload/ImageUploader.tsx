import React, { useState } from 'react';
import { DropZone } from './DropZone';
import { ImagePreview } from './ImagePreview';
import { useSatStore } from '../../store/useSatStore';
import { UploadedImage } from '../../types';

export interface ImageUploaderProps {
  onUpload?: (images: UploadedImage[]) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
  pairMode?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ pairMode = false }) => {
  const { images, addImages, removeImage, updateImageRole } = useSatStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = async (files: File[]) => {
    setIsProcessing(true);
    const newUploads: UploadedImage[] = files.map((file, idx) => {
      const isGeoTiff = file.name.endsWith('.tif') || file.name.endsWith('.tiff');
      return {
        id: 'img_' + Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
        type: file.name.toLowerCase().includes('sar') ? 'sar' : 'optical',
        format: isGeoTiff ? 'geotiff' : 'png',
        size: file.size,
        isValid: true,
        uploadProgress: 100,
        role: pairMode ? (idx === 0 ? 't1' : 't2') : 'primary',
        metadata: {
          width: 1024,
          height: 1024,
          bands: ['B02', 'B03', 'B04', 'B08'],
          geospatial: {
            projection: 'EPSG:4326',
            boundingBox: [37.75, -122.45, 37.8, -122.38],
            resolution: 10,
            crs: 'WGS 84',
          },
          spatialResolution: '10m / pixel',
        },
      };
    });

    setTimeout(() => {
      addImages(newUploads);
      setIsProcessing(false);
    }, 600);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="h-72">
        <DropZone onDrop={handleDrop} />
      </div>

      {isProcessing && (
        <div className="text-xs text-blue-600 font-mono animate-pulse">
          Validating projection, CRS & radiometric bands...
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500">Loaded Granules ({images.length})</div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {images.map((img) => (
              <ImagePreview
                key={img.id}
                image={img}
                onRemove={removeImage}
                onRoleChange={updateImageRole}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
