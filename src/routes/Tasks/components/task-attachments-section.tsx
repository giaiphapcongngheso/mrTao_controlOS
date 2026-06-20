import React, { useCallback, useRef, useState } from 'react';
import { Upload, File, Image as ImageIcon, FileText, X, Download, Loader2 } from 'lucide-react';
import type { TaskAttachment } from '../../../types/tasks.types';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/ui';

interface TaskAttachmentsSectionProps {
  attachments: TaskAttachment[];
  onUpload: (file: File) => void | Promise<void>;
  onRemove: (attachmentId: string) => void;
  readOnly?: boolean;
  maxSizeMB?: number;
}

const fileTypeIcon: Record<string, React.ElementType> = {
  image: ImageIcon,
  pdf: FileText,
  document: FileText,
  default: File,
};

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) return 'document';
  return 'default';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TaskAttachmentsSection = React.memo(function TaskAttachmentsSection({
  attachments,
  onUpload,
  onRemove,
  readOnly = false,
  maxSizeMB = 20,
}: TaskAttachmentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File quá lớn. Tối đa ${maxSizeMB}MB.`);
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }, [onUpload, maxSizeMB]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) handleFileSelect(files[0]);
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFileSelect(files[0]);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-slate-400 uppercase">
        📎 Tệp đính kèm ({attachments.length})
      </label>

      {/* Dropzone */}
      {!readOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer min-h-[72px] flex flex-col items-center justify-center gap-1',
            dragOver
              ? 'border-[#C21A1A] bg-rose-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100',
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-[#C21A1A] animate-spin" />
          ) : (
            <>
              <Upload className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-semibold">
                Kéo thả file hoặc click để chọn (Tối đa {maxSizeMB}MB)
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const category = getFileCategory(att.type);
            const Icon = fileTypeIcon[category] || fileTypeIcon.default;
            const isImage = category === 'image';

            return (
              <div
                key={att.id}
                className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-150 rounded-lg group min-h-[44px]"
              >
                {/* Thumbnail or icon */}
                {isImage && att.url ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{att.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {formatFileSize(att.size)} • {att.uploadedBy}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {att.url && (
                    <a
                      href={att.url}
                      download={att.name}
                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded-md hover:bg-blue-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemove(att.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-rose-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
