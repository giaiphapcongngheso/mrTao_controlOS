import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui';
import type { HandbookCategoryColorKey, HandbookCategoryRequestType } from '../../../types/handbook.types';
import {
  DEFAULT_HANDBOOK_CATEGORY_COLOR,
  DEFAULT_HANDBOOK_CATEGORY_ICON,
  HANDBOOK_CATEGORY_COLOR_META,
  HANDBOOK_CATEGORY_ICON_OPTIONS,
  getHandbookCategoryColorMeta,
  resolveHandbookCategoryIcon,
} from '../handbook-category-meta';

interface CategoryCreateMetaDialogProps {
  open: boolean;
  name: string;
  onConfirm: (payload: HandbookCategoryRequestType) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryCreateMetaDialog({
  open,
  name,
  onConfirm,
  onCancel,
}: CategoryCreateMetaDialogProps) {
  const [iconName, setIconName] = useState(DEFAULT_HANDBOOK_CATEGORY_ICON);
  const [colorKey, setColorKey] = useState<HandbookCategoryColorKey>(DEFAULT_HANDBOOK_CATEGORY_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIconName(DEFAULT_HANDBOOK_CATEGORY_ICON);
      setColorKey(DEFAULT_HANDBOOK_CATEGORY_COLOR);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [open]);

  const PreviewIcon = useMemo(() => resolveHandbookCategoryIcon(iconName), [iconName]);
  const colorMeta = getHandbookCategoryColorMeta(colorKey);

  const handleConfirm = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm({
        name: trimmedName,
        iconName,
        colorKey,
      });
    } catch {
      setErrorMessage('Không thể thêm danh mục. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [colorKey, iconName, isSubmitting, name, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Thêm danh mục
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {name.trim()}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${colorMeta.iconBg}`}>
              <PreviewIcon className={`h-7 w-7 ${colorMeta.iconColor}`} />
            </div>
            <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Preview
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Icon
              </label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {HANDBOOK_CATEGORY_ICON_OPTIONS.map((option) => {
                  const Icon = resolveHandbookCategoryIcon(option.name);
                  const isSelected = iconName === option.name;
                  return (
                    <Button
                      key={option.name}
                      type="button"
                      variant="ghost"
                      onClick={() => setIconName(option.name)}
                      title={option.label}
                      className={`h-10 rounded-xl border p-0 ${
                        isSelected
                          ? 'border-[#C21A1A] bg-red-50 text-[#C21A1A]'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Màu
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(HANDBOOK_CATEGORY_COLOR_META) as HandbookCategoryColorKey[]).map((key) => {
                  const meta = HANDBOOK_CATEGORY_COLOR_META[key];
                  const isSelected = colorKey === key;
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="ghost"
                      onClick={() => setColorKey(key)}
                      title={meta.label}
                      className={`h-9 rounded-xl border p-0 ${
                        isSelected ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                      } ${meta.filterIdleClass}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-[#C21A1A] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#A81515] disabled:opacity-60"
          >
            {isSubmitting ? 'Đang thêm...' : 'Thêm danh mục'}
          </Button>
        </div>
      </div>
    </div>
  );
}
