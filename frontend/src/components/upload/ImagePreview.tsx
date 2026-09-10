import React from 'react';
import { CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { UploadedImage } from '../../types';

export interface ImagePreviewProps {
  image: UploadedImage;
  onRemove: (id: string) => void;
  onView?: (id: string) => void;
  onRoleChange?: (id: string, role: UploadedImage['role']) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onRemove,
  onView,
  onRoleChange,
}) => {
  const formattedSize = (image.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="flex items-center space-x-3.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <img
        src={image.preview}
        alt="Preview"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80';
        }}
        className="h-14 w-14 rounded-lg object-cover border border-slate-200 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-1.5">
          <span className="truncate text-xs font-bold text-slate-800">{image.file.name}</span>
          {image.isValid ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{image.format.toUpperCase()}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{formattedSize} MB</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">
            {image.metadata.width}x{image.metadata.height}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">EPSG:4326</span>
        </div>
      </div>

      {onRoleChange && (
        <select
          value={image.role || 'primary'}
          onChange={(e) => onRoleChange(image.id, e.target.value as UploadedImage['role'])}
          aria-label="Assign Image Role"
          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700"
        >
          <option value="primary">Primary</option>
          <option value="t1">T1 (Before)</option>
          <option value="t2">T2 (After)</option>
          <option value="optical">Optical</option>
          <option value="sar">SAR</option>
        </select>
      )}

      <div className="flex items-center space-x-1">
        {onView && (
          <button
            onClick={() => onView(image.id)}
            aria-label="View Image Details"
            className="rounded p-1 text-slate-400 hover:text-slate-600"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onRemove(image.id)}
          aria-label="Remove Image"
          className="rounded p-1 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
