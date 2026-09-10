import React from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload } from 'lucide-react';

export interface DropZoneProps {
  onDrop: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  accept = {
    'image/tiff': ['.tif', '.tiff'],
    'image/x-tiff': ['.tif', '.tiff'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
  },
  maxSize = 100 * 1024 * 1024,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept,
  });

  return (
    <div
      {...getRootProps()}
      className={`h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 text-center ${
        isDragActive
          ? 'border-blue-500 bg-blue-50/30'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <CloudUpload className="h-8 w-8 stroke-[1.8]" />
      </div>
      <h3 className="text-base font-bold text-slate-800">
        Drag & drop satellite image(s) here
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        Supports: GeoTIFF, PNG, JPG (Optical, SAR, etc.) • Max 100MB
      </p>
      <div className="mt-5 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition">
        Choose Files
      </div>
    </div>
  );
};
