import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ExternalLink, ImageIcon, Upload, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui';
import { CreatableCombobox } from '@shared/components/custom/creatable-combobox';
import type { HandbookCategoryRequestType } from '../../../types/handbook.types';
import type { HandbookFormFieldErrors } from '../handbook-form-schema';
import type { HandbookFormState } from '../handbook-view.types';
import CategoryCreateMetaDialog from './category-create-meta-dialog';

interface HandbookEditorDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  isUploadingImages: boolean;
  editingDocId: string | null;
  formState: HandbookFormState;
  canManageCategories: boolean;
  categoryOptions: string[];
  errors: HandbookFormFieldErrors;
  onClose: () => void;
  onSave: () => void;
  onFormPatch: (patch: Partial<HandbookFormState>) => void;
  onUploadImages: (files: File[]) => Promise<void>;
  onAddCategory: (payload: HandbookCategoryRequestType) => Promise<void>;
  onDeleteCategory?: (name: string) => Promise<void>;
}

export default function HandbookEditorDialog({
  isOpen,
  isSaving,
  isUploadingImages,
  editingDocId,
  formState,
  canManageCategories,
  categoryOptions,
  errors,
  onClose,
  onSave,
  onFormPatch,
  onUploadImages,
  onAddCategory,
  onDeleteCategory,
}: HandbookEditorDialogProps) {
  const [isCategoryMetaOpen, setIsCategoryMetaOpen] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const pendingCategoryResolver = useRef<{
    resolve: () => void;
    reject: (error?: unknown) => void;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<HandbookFormState>({
    values: formState,
  });

  const { setError, clearErrors } = form;

  // Đồng bộ hóa lỗi từ props vào react-hook-form
  useEffect(() => {
    clearErrors();
    Object.entries(errors).forEach(([key, message]) => {
      if (message) {
        setError(key as keyof HandbookFormState, {
          type: 'manual',
          message,
        });
      }
    });
  }, [errors, setError, clearErrors]);

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
  const handleOpenImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = '';
      if (!selectedFiles.length) {
        return;
      }
      void onUploadImages(selectedFiles);
    },
    [onUploadImages],
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      onFormPatch({
        imageUrls: formState.imageUrls.filter((_, itemIndex) => itemIndex !== index),
      });
    },
    [formState.imageUrls, onFormPatch],
  );

  const handleAddCategoryRequest = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return Promise.reject(new Error('EMPTY_CATEGORY_NAME'));
    }

    setPendingCategoryName(trimmedName);
    setIsCategoryMetaOpen(true);

    return new Promise<void>((resolve, reject) => {
      pendingCategoryResolver.current = { resolve, reject };
    });
  }, []);

  const handleConfirmCategoryMeta = useCallback(async (payload: HandbookCategoryRequestType) => {
    await onAddCategory(payload);
    pendingCategoryResolver.current?.resolve();
    pendingCategoryResolver.current = null;
    setIsCategoryMetaOpen(false);
    setPendingCategoryName('');
  }, [onAddCategory]);

  const handleCancelCategoryMeta = useCallback(() => {
    pendingCategoryResolver.current?.reject(new Error('CATEGORY_CREATE_CANCELLED'));
    pendingCategoryResolver.current = null;
    setIsCategoryMetaOpen(false);
    setPendingCategoryName('');
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSave();
    },
    [onSave],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <Form {...form}>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              {editingDocId ? 'Cập nhật tài liệu sổ tay' : 'Thêm tài liệu sổ tay'}
            </h3>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onClose}
              className="rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus:outline-hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tiêu đề</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                        errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                      {...field}
                      onChange={handleTitleChange}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Danh mục</FormLabel>
                  <FormControl>
                    <CreatableCombobox
                      value={field.value}
                      onValueChange={handleCategoryChange}
                      options={categoryOptions}
                      onAddNew={canManageCategories ? handleAddCategoryRequest : undefined}
                      onDeleteOption={canManageCategories ? onDeleteCategory : undefined}
                      placeholder="Chọn hoặc nhập danh mục"
                      emptyHint="Gõ để tìm hoặc thêm danh mục mới"
                      addNewText="Thêm danh mục"
                      containerClassName={`h-9 rounded-xl ${errors.category ? 'border-rose-400 bg-rose-50/30' : ''}`}
                      className="text-xs"
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryKey"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Nhóm lọc</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      placeholder="Ví dụ: văn hóa, quy chế, đào tạo"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                        errors.categoryKey ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                      {...field}
                      onChange={handleCategoryKeyChange}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driveLink"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Link Drive (nếu có)</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                        errors.driveLink ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                      {...field}
                      onChange={handleDriveLinkChange}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                  {formState.driveLink && /^https?:\/\/\S+$/i.test(formState.driveLink) && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-slate-400">Xem thử liên kết:</span>
                      <a
                        href={formState.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline max-w-[280px]"
                        title={formState.driveLink}
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formState.driveLink}</span>
                      </a>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tóm tắt</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                      errors.summary ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    {...field}
                    onChange={handleSummaryChange}
                  />
                </FormControl>
                <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Nội dung</FormLabel>
                <FormControl>
                  <textarea
                    rows={10}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                      errors.content ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    {...field}
                    onChange={handleContentChange}
                  />
                </FormControl>
                <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
              </FormItem>
            )}
          />

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                <ImageIcon className="h-3.5 w-3.5" />
                Hình ảnh handbook ({formState.imageUrls.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingImages}
                onClick={handleOpenImagePicker}
                className="h-8 rounded-lg px-2.5 text-[11px] font-black"
              >
                {isUploadingImages ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang tải...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Upload ảnh
                  </span>
                )}
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelection}
                className="hidden"
              />
            </div>
            {errors.imageUrls && (
              <p className="text-[10px] font-semibold text-rose-600">{errors.imageUrls}</p>
            )}
            {formState.imageUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {formState.imageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200">
                    <img src={url} alt={`Ảnh đã upload ${index + 1}`} className="h-14 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Gỡ ảnh"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FormField
              control={form.control}
              name="requiredRead"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={handleRequiredReadChange}
                    />
                  </FormControl>
                  <FormLabel className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Bắt buộc đọc
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isUpdated"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={handleUpdatedChange}
                    />
                  </FormControl>
                  <FormLabel className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Đánh dấu mới cập nhật
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
            >
              Hủy
            </Button>

            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#C21A1A] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#A81515] disabled:opacity-60"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu tài liệu'}
            </Button>
          </div>
        </form>
      </Form>
      <CategoryCreateMetaDialog
        open={isCategoryMetaOpen}
        name={pendingCategoryName}
        onConfirm={handleConfirmCategoryMeta}
        onCancel={handleCancelCategoryMeta}
      />
    </div>
  );
}
