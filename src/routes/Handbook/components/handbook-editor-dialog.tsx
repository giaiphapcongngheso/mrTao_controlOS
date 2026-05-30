import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import { CreatableCombobox } from '@shared/components/custom/creatable-combobox';
import type { HandbookFormFieldErrors } from '../handbook-form-schema';
import type { HandbookFormState } from '../handbook-view.types';

interface HandbookEditorDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  editingDocId: string | null;
  formState: HandbookFormState;
  canManageCategories: boolean;
  categoryOptions: string[];
  errors: HandbookFormFieldErrors;
  onClose: () => void;
  onSave: () => void;
  onFormPatch: (patch: Partial<HandbookFormState>) => void;
  onAddCategory: (name: string) => Promise<void>;
}

export default function HandbookEditorDialog({
  isOpen,
  isSaving,
  editingDocId,
  formState,
  canManageCategories,
  categoryOptions,
  errors,
  onClose,
  onSave,
  onFormPatch,
  onAddCategory,
}: HandbookEditorDialogProps) {
  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ title: event.target.value });
    },
    [onFormPatch],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      onFormPatch({ category: value });
    },
    [onFormPatch],
  );

  const handleCategoryKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ categoryKey: event.target.value });
    },
    [onFormPatch],
  );

  const handleDriveLinkChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ driveLink: event.target.value });
    },
    [onFormPatch],
  );

  const handleSummaryChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onFormPatch({ summary: event.target.value });
    },
    [onFormPatch],
  );

  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onFormPatch({ content: event.target.value });
    },
    [onFormPatch],
  );

  const handleRequiredReadChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ requiredRead: event.target.checked });
    },
    [onFormPatch],
  );

  const handleUpdatedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ isUpdated: event.target.checked });
    },
    [onFormPatch],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
            {editingDocId ? 'Cập nhật tài liệu sổ tay' : 'Thêm tài liệu sổ tay'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tiêu đề</label>
            <input
              type="text"
              value={formState.title}
              onChange={handleTitleChange}
              className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.title}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Danh mục</label>
            <CreatableCombobox
              value={formState.category}
              onValueChange={handleCategoryChange}
              options={categoryOptions}
              onAddNew={canManageCategories ? onAddCategory : undefined}
              placeholder="Chọn hoặc nhập danh mục"
              emptyHint="Gõ để tìm hoặc thêm danh mục mới"
              addNewText="Thêm danh mục"
              containerClassName={`h-9 rounded-xl ${errors.category ? 'border-rose-400 bg-rose-50/30' : ''}`}
              className="text-xs"
            />
            {errors.category && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.category}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Nhóm lọc</label>
            <input
              type="text"
              value={formState.categoryKey}
              onChange={handleCategoryKeyChange}
              placeholder="Ví dụ: văn hóa, quy chế, đào tạo"
              className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                errors.categoryKey ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.categoryKey && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.categoryKey}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Link Drive (nếu có)</label>
            <input
              type="text"
              value={formState.driveLink}
              onChange={handleDriveLinkChange}
              className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                errors.driveLink ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.driveLink && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.driveLink}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tóm tắt</label>
          <textarea
            rows={3}
            value={formState.summary}
            onChange={handleSummaryChange}
            className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
              errors.summary ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
            }`}
          />
          {errors.summary && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.summary}</p>}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Nội dung</label>
          <textarea
            rows={10}
            value={formState.content}
            onChange={handleContentChange}
            className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
              errors.content ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
            }`}
          />
          {errors.content && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.content}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={formState.requiredRead} onChange={handleRequiredReadChange} />
            Bắt buộc đọc
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={formState.isUpdated} onChange={handleUpdatedChange} />
            Đánh dấu mới cập nhật
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-[#C21A1A] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#A81515] disabled:opacity-60"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu tài liệu'}
          </button>
        </div>
      </div>
    </div>
  );
}
