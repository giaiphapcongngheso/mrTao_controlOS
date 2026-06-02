import React from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Edit2,
  FileText,
  Image,
  Info,
  Plus,
  Smile,
  Trash2,
  X,
  Camera,
  Upload,
  User,
  Loader2,
} from 'lucide-react';
import { Button, Card, ScrollArea, Textarea, Tooltip, TooltipTrigger, TooltipContent } from '../../../../share/ui';
import { DeleteConfirm } from '../../../../share/components/delete-confirm';
import { Badge } from '../../../../share/ui/badge';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import { toastError } from '../../../shared/lib/toast';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import { Dialog, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { uploadChecklistItemImage } from '../../../services/firebase-storage-service';
import type {
  ChecklistPermissions,
  ChecklistSubTab,
  ChecklistViewCategory,
} from './checklist-view.types';
import { isItemLate, formatCheckedAt } from '../checklist-utils';
import { cn } from '../../../../share/lib/utils';
import type { ChecklistItem } from '../../../types/checklist.types';
import { resolveChecklistIcon } from '../checklist-meta';

const parseTimeToDate = (timeStr: string) => {
  if (!timeStr) return undefined;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const formatDateToTime = (date: Date | undefined) => {
  if (!date) return '08:00';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

// ── Item Detail Dialog Component ────────────────────────────────────────────
interface ChecklistItemDetailDialogProps {
  item: ChecklistItem | null;
  isOpen: boolean;
  onClose: () => void;
  roleOptions: Array<{ code: string; name: string }>;
  onToggleItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  onConfirmDeleteItem: (itemId: string, title: string) => void;
}

const ChecklistItemDetailDialog = React.memo(function ChecklistItemDetailDialog({
  item,
  isOpen,
  onClose,
  roleOptions,
  onToggleItem,
  onUpdateItem,
  onConfirmDeleteItem,
}: ChecklistItemDetailDialogProps) {
  const [titleValue, setTitleValue] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [activeZoomUrl, setActiveZoomUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (item) {
      setTitleValue(item.title);
    }
  }, [item]);

  if (!item) return null;

  const roleName = roleOptions.find((r) => r.code === item.roleCode)?.name || item.roleCode || 'N/A';
  const imageUrls = item.imageUrls || [];

  const handleBlurSave = async () => {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === item.title) return;
    try {
      await onUpdateItem(item.id, { title: trimmed });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeLimitChange = async (date: Date | undefined) => {
    const newTime = formatDateToTime(date);
    if (newTime === item.timeLimit) return;
    try {
      await onUpdateItem(item.id, { timeLimit: newTime });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = () => {
    onToggleItem(item.id);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadChecklistItemImage(file, item.id);
      const nextUrls = [...imageUrls, url];
      await onUpdateItem(item.id, { imageUrls: nextUrls });
    } catch (error) {
      console.error('Lỗi khi tải ảnh lên:', error);
      toastError('Tải ảnh lên thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (urlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextUrls = imageUrls.filter((url) => url !== urlToDelete);
    try {
      await onUpdateItem(item.id, { imageUrls: nextUrls });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTaskClick = () => {
    onClose();
    onConfirmDeleteItem(item.id, item.title);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent
          showCloseButton={false}
          className="!p-0 !border-0 overflow-hidden max-w-lg rounded-2xl bg-white shadow-2xl font-sans"
        >
          {/* Header màu đỏ thương hiệu */}
          <div className="bg-[#C21A1A] p-5 text-white relative rounded-t-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 block mb-1">
              CHI TIẾT CHECKLIST
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 block mb-2">
              TÊN ĐẦU VIỆC (QUẢN LÝ SỬA)
            </span>
            
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Nhập tên đầu việc..."
              className="w-full bg-[#A31616] text-white placeholder-white/50 border-none outline-none focus:ring-1 focus:ring-white/25 rounded-xl px-3 py-2 text-sm font-bold leading-normal transition-colors"
            />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-none outline-none focus:outline-none"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 bg-white text-left">
            {/* Grid 2 cột */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                  VAI TRÒ CỦA NHÓM
                </span>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <User className="w-4 h-4 text-[#C21A1A] shrink-0" />
                  <span>{roleName}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                  GIỜ CHỐT HOÀN THÀNH
                </span>
                <div className="w-full">
                  <DatePicker
                    value={parseTimeToDate(item.timeLimit || '')}
                    onChange={handleTimeLimitChange}
                    timeOnly={true}
                    clearable={false}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Trạng thái công việc */}
            <div className="flex items-center justify-between py-2.5 border-y border-slate-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Trạng thái công việc</span>
                {item.isCompleted ? (
                  <span className="text-[10px] font-medium text-slate-400">
                    Đã hoàn thành bởi: <span className="font-semibold text-slate-600">{item.checkedByName || 'Hệ thống'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Chưa hoàn thành</span>
                )}
              </div>
              <Button
                type="button"
                onClick={handleToggleStatus}
                className={cn(
                  "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 border cursor-pointer h-9",
                  item.isCompleted
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                )}
              >
                {item.isCompleted ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}
              </Button>
            </div>

            {/* Bằng chứng hình ảnh */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>BẰNG CHỨNG HÌNH ẢNH ({imageUrls.length})</span>
                </div>
                <Button
                  type="button"
                  disabled={isUploading}
                  onClick={triggerFileInput}
                  variant="link"
                  className="text-xs font-extrabold text-[#C21A1A] hover:text-[#A81515] p-0 h-auto flex items-center gap-1 cursor-pointer focus:outline-none"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Tải ảnh lên</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {imageUrls.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <Camera className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-400">Chưa có ảnh bằng chứng</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Vui lòng tải ảnh lên làm minh chứng hoàn thành.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group animate-in fade-in duration-200"
                    >
                      <img
                        src={url}
                        alt={`Bằng chứng ${idx + 1}`}
                        onClick={() => setActiveZoomUrl(url)}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleDeleteImage(url, e)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer border-none outline-none"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
            <Button
              type="button"
              onClick={handleDeleteTaskClick}
              variant="ghost"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>XÓA ĐẦU VIỆC</span>
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="h-10 px-5 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 bg-white rounded-xl cursor-pointer"
            >
              ĐÓNG LẠI
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Zoom Dialog */}
      {activeZoomUrl && (
        <Dialog open={activeZoomUrl !== null} onOpenChange={(open) => { if (!open) setActiveZoomUrl(null); }}>
          <DialogContent
            showCloseButton={true}
            className="max-w-4xl p-2 bg-black border-none rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl"
          >
            <img
              src={activeZoomUrl}
              alt="Bằng chứng phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});

interface TaskEditState {
  editingItemId: string | null;
  editItemTitle: string;
  editItemTimeLimit: string;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string) => Promise<void>;
}

interface ChecklistTaskItemProps {
  item: ChecklistItem;
  subTab: ChecklistSubTab;
  permissions: ChecklistPermissions;
  editState: TaskEditState;
  onToggleItem: (itemId: string) => void;
  onConfirmDeleteItem: (itemId: string, title: string) => void;
  setUncheckTarget: React.Dispatch<React.SetStateAction<{ id: string; title: string; timeLimit: string } | null>>;
  onOpenDetail: (item: ChecklistItem) => void;
}

const ChecklistTaskItem = React.memo(function ChecklistTaskItem({
  item,
  subTab,
  permissions,
  editState,
  onToggleItem,
  onConfirmDeleteItem,
  setUncheckTarget,
  onOpenDetail,
}: ChecklistTaskItemProps) {
  const isLate = isItemLate(item);
  const isCurrentlyEditing = editState.editingItemId === item.id;
  const isReadOnlyCompletedTab = subTab === 'completed';

  const lastClickTimeRef = React.useRef<number>(0);
  const lastToggleTimeRef = React.useRef<number>(0);

  const handleRowClick = React.useCallback(() => {
    if (subTab === 'process' || isReadOnlyCompletedTab || isCurrentlyEditing) return;

    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    const isDoubleClick = now - lastClickTime < 500;

    if (isDoubleClick) {
      // Double Click
      if (item.isCompleted) {
        const lastToggleTime = lastToggleTimeRef.current;
        if (now - lastToggleTime < 500) {
          return;
        }

        const tempItem = { ...item, isCompleted: false, checkedAt: undefined };
        const isLateAfterUncheck = isItemLate(tempItem);

        if (isLateAfterUncheck) {
          setUncheckTarget({
            id: item.id,
            title: item.title,
            timeLimit: item.timeLimit || '',
          });
        } else {
          onToggleItem(item.id);
        }
      }
    } else {
      // Single Click
      if (!item.isCompleted) {
        onToggleItem(item.id);
        lastToggleTimeRef.current = Date.now();
      }
    }
  }, [subTab, isReadOnlyCompletedTab, isCurrentlyEditing, item, onToggleItem, setUncheckTarget]);

  const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editState.setEditItemTitle(e.target.value);
    e.target.style.height = '34px';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }, [editState.setEditItemTitle]);

  const handleDatePickerChange = React.useCallback((date: Date | undefined) => {
    editState.setEditItemTimeLimit(formatDateToTime(date));
  }, [editState.setEditItemTimeLimit]);

  const handleSaveClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    void editState.onInlineSave(item.id);
  }, [editState.onInlineSave, item.id]);

  const handleCancelClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    editState.setEditingItemId(null);
  }, [editState.setEditingItemId]);

  const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirmDeleteItem(item.id, item.title);
  }, [onConfirmDeleteItem, item.id, item.title]);

  const stopProp = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        "font-sans group/row px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3.5 transition-colors duration-150",
        subTab === 'today' ? "hover:bg-slate-50/80 cursor-pointer select-none" : "hover:bg-slate-50/80",
        isCurrentlyEditing ? "bg-slate-50 ring-1 ring-inset ring-slate-200" : ""
      )}
    >
      {/* Check / Status icon */}
      <span className="shrink-0 pointer-events-none">
        {subTab === 'process' ? (
          <FileText className="w-[18px] h-[18px] text-slate-300" />
        ) : item.isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle
            className={cn(
              "w-5 h-5 transition-colors",
              isLate ? "text-rose-400" : "text-slate-300 group-hover/row:text-slate-400"
            )}
          />
        )}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isCurrentlyEditing ? (
          <div
            className="flex flex-col sm:flex-row gap-2 w-full"
            onClick={stopProp}
          >
            <Textarea
              rows={1}
              value={editState.editItemTitle}
              onChange={handleTitleChange}
              ref={(el) => {
                if (el) {
                  el.style.height = '34px';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              placeholder="Nhập tên đầu việc..."
              className="font-sans flex-1 min-w-0 h-[34px] min-h-[34px] py-1.5 resize-none overflow-hidden text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
            />
            {subTab !== 'process' && (
              <div className="w-28 shrink-0">
                <DatePicker
                  value={parseTimeToDate(editState.editItemTimeLimit)}
                  onChange={handleDatePickerChange}
                  timeOnly={true}
                  clearable={false}
                  size="sm"
                />
              </div>
            )}
            <div className="flex gap-1 shrink-0 items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSaveClick}
                className="w-[30px] h-[30px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors active:scale-95 border-none"
                title="Lưu"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={handleCancelClick}
                className="w-[30px] h-[30px] bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors active:scale-95 border-none"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              className={cn(
                "text-sm leading-relaxed break-words min-w-0",
                subTab !== 'process' && item.isCompleted
                  ? "text-slate-400 line-through font-normal"
                  : "text-slate-600 font-medium"
              )}
            >
              {item.title}
            </span>

            {/* Meta tags / Badges */}
            {subTab === 'process' && item.checklistName && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-500 border-none shrink-0 animate-in fade-in duration-200"
              >
                {item.checklistName}
              </Badge>
            )}
            {subTab !== 'process' && isLate && (
              <Badge
                variant="destructive"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 items-center gap-0.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                <span>Trễ hạn</span>
              </Badge>
            )}
            {subTab !== 'process' && item.isCompleted && !isLate && item.timeLimit && (
              <Badge
                variant="success"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 animate-in fade-in duration-200"
              >
                Đúng hạn
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Right-side actions */}
      {!isCurrentlyEditing && (
        <div
          className="flex items-center gap-1.5 shrink-0 animate-in fade-in"
          onClick={stopProp}
        >
          {/* Delete */}
          {subTab === 'today' && permissions.canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDeleteClick}
              className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Time badge */}
          {subTab !== 'process' && item.timeLimit && (
            <span
              className={cn(
                "text-xs font-sans font-bold px-2 py-1 rounded-lg flex items-center gap-1 select-none",
                isLate
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-slate-50 text-slate-500 border border-slate-150"
              )}
            >
              <Clock className="w-3 h-3" />
              {item.timeLimit}
            </span>
          )}

          {/* Image evidence / Detail */}
          {(subTab === 'today' || subTab === 'completed') && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(item);
              }}
              className="flex w-7 h-7 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-slate-600 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer animate-in fade-in"
              title="Bằng chứng hình ảnh & Chi tiết"
            >
              <Image className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Checked Info Tooltip */}
          {subTab === 'today' && item.isCompleted && (item.checkedByName || item.checkedAt) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
                  title="Thông tin hoàn thành"
                >
                  <Award className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="w-56 p-3 bg-slate-900 text-white border border-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95"
              >
                <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 flex items-center gap-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã hoàn thành</span>
                </div>
                <div className="space-y-1 text-[11px] text-left">
                  <p className="text-slate-300">
                    Người thực hiện: <span className="font-semibold text-white">{item.checkedByName || 'N/A'}</span>
                  </p>
                  {item.checkedAt && (
                    <p className="text-slate-400">
                      Thời gian: <span className="font-semibold text-white">{formatCheckedAt(item.checkedAt)}</span>
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
});

// ── Memoized Category Card ──────────────────────────────────────────────────
interface CategoryCardProps {
  cat: ChecklistViewCategory;
  isExpanded: boolean;
  subTab: ChecklistSubTab;
  permissions: ChecklistPermissions;
  onToggleExpand: (categoryId: string) => void;
  onToggleItem: (itemId: string) => void;
  onConfirmDeleteCategory: (id: string, title: string) => void;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editState: TaskEditState;
  onConfirmDeleteItem: (itemId: string, title: string) => void;
  onAddInlineItem: (categoryId: string, categoryTitle: string, title: string, timeLimit?: string) => Promise<void>;
  onOpenDetail: (item: ChecklistItem) => void;
}

const ChecklistCategoryCard = React.memo(function ChecklistCategoryCard({
  cat,
  isExpanded,
  subTab,
  permissions,
  onToggleExpand,
  onToggleItem,
  onConfirmDeleteCategory,
  onOpenEditCategoryDialog,
  editState,
  onConfirmDeleteItem,
  onAddInlineItem,
  onOpenDetail,
}: CategoryCardProps) {
  const ratio = cat.countTotal > 0 ? (cat.countDone / cat.countTotal) : 0;
  const isFinishedList = cat.countTotal > 0 && cat.countDone === cat.countTotal;
  const CategoryIcon = resolveChecklistIcon(cat.iconName);
  const percentText = Math.round(ratio * 100);

  // States for adding inline task
  const [isAddingInline, setIsAddingInline] = React.useState(false);
  const [newItemTitle, setNewItemTitle] = React.useState('');
  const [newItemTimeLimit, setNewItemTimeLimit] = React.useState('08:00');
  const [isSubmittingNewItem, setIsSubmittingNewItem] = React.useState(false);
  const [uncheckTarget, setUncheckTarget] = React.useState<{ id: string; title: string; timeLimit: string } | null>(null);

  const handleSaveInlineItem = React.useCallback(async () => {
    const trimmed = newItemTitle.trim();
    if (!trimmed) return;
    setIsSubmittingNewItem(true);
    try {
      await onAddInlineItem(
        cat.id,
        cat.title,
        trimmed,
        subTab === 'today' ? newItemTimeLimit : undefined
      );
      setNewItemTitle('');
      setIsAddingInline(false);
    } catch (error) {
      console.error('Lỗi khi thêm inline item:', error);
      toastError('Không thể thêm công việc mới. Vui lòng thử lại.');
    } finally {
      setIsSubmittingNewItem(false);
    }
  }, [cat.id, cat.title, newItemTitle, subTab, newItemTimeLimit, onAddInlineItem]);

  const handleCancelInlineItem = React.useCallback(() => {
    setIsAddingInline(false);
    setNewItemTitle('');
  }, []);

  const handleHeaderClick = React.useCallback(() => {
    onToggleExpand(cat.id);
  }, [onToggleExpand, cat.id]);

  const handleEditClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenEditCategoryDialog(cat);
  }, [onOpenEditCategoryDialog, cat]);

  const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirmDeleteCategory(cat.id, cat.title);
  }, [onConfirmDeleteCategory, cat.id, cat.title]);

  const stopProp = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Card
      className={cn(
        "font-sans w-full bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col gap-0 py-0 shadow-none",
        isExpanded ? "border-slate-200 shadow-sm" : "border-slate-200/80 hover:shadow-sm"
      )}
    >
      {/* ── Category Header ─────────────────────────────────── */}
      <div
        onClick={handleHeaderClick}
        className="w-full min-w-0 px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-4 cursor-pointer select-none group/header animate-in fade-in"
      >
        {/* Icon */}
        <span
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/header:scale-105",
            cat.meta.iconBg
          )}
        >
          <CategoryIcon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5", cat.meta.iconColor)} />
        </span>

        {/* Title + Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-800 truncate" style={{ color: cat.meta.accentHex }}>
              {cat.meta.label}
            </h3>

            {subTab !== 'process' && isFinishedList && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded uppercase tracking-wider shrink-0 animate-in zoom-in-75">
                Xong
              </span>
            )}
          </div>

          {/* Progress bar row */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5">
            {subTab === 'process' ? (
              <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                {cat.countTotal} đầu việc chuẩn
              </span>
            ) : (
              <>
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 shrink-0">
                  {cat.countDone}/{cat.countTotal} <span className="hidden sm:inline">việc hoàn thành</span>
                </span>
                <div className="hidden sm:block w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500 ease-out", cat.meta.barColor)}
                    style={{ width: `${percentText}%` }}
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 shrink-0">
                  {percentText}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions & Toggle Expand */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={stopProp}>
          {subTab !== 'completed' && permissions.canUpdate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Chỉnh sửa nhóm"
              onClick={handleEditClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border-slate-150 text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          {subTab !== 'completed' && permissions.canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Xóa nhóm"
              onClick={handleDeleteClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 flex items-center justify-center transition-all select-none">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </span>
        </div>
      </div>

      {/* ── Expanded Task List ──────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {cat.tasks.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center font-medium">
              Chưa có công việc nào trong danh mục này.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {cat.tasks.map((item) => (
                <ChecklistTaskItem
                  key={item.id}
                  item={item}
                  subTab={subTab}
                  permissions={permissions}
                  editState={editState}
                  onToggleItem={onToggleItem}
                  onConfirmDeleteItem={onConfirmDeleteItem}
                  setUncheckTarget={setUncheckTarget}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          )}

          {isAddingInline && (
            <div
              className="px-4 py-3 flex items-center gap-3.5 bg-slate-50/80 border-t border-slate-100 ring-1 ring-inset ring-slate-200"
              onClick={stopProp}
            >
              <span className="shrink-0">
                <Plus className="w-[18px] h-[18px] text-slate-400" />
              </span>
              <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                <Textarea
                  rows={1}
                  value={newItemTitle}
                  onChange={(e) => {
                    setNewItemTitle(e.target.value);
                    e.target.style.height = '34px';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = '34px';
                      el.style.height = `${el.scrollHeight}px`;
                      el.focus();
                    }
                  }}
                  placeholder="Nhập tên đầu việc mới..."
                  className="font-sans flex-1 min-w-0 h-[34px] min-h-[34px] py-1.5 resize-none overflow-hidden text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
                />
                {subTab === 'today' && (
                  <div className="w-28 shrink-0">
                    <DatePicker
                      value={parseTimeToDate(newItemTimeLimit)}
                      onChange={(date) => setNewItemTimeLimit(formatDateToTime(date))}
                      timeOnly={true}
                      clearable={false}
                      size="sm"
                    />
                  </div>
                )}
                <div className="flex gap-1 shrink-0 items-center">
                  <Button
                    type="button"
                    disabled={isSubmittingNewItem || !newItemTitle.trim()}
                    onClick={handleSaveInlineItem}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white w-[30px] h-[30px] border-none"
                    title="Lưu"
                  >
                    {isSubmittingNewItem ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingNewItem}
                    onClick={handleCancelInlineItem}
                    variant="secondary"
                    className="w-[30px] h-[30px] border-none"
                    title="Hủy"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {subTab !== 'completed' && permissions.canCreate && !isAddingInline && (
            <div className="px-3 sm:px-4 py-3 border-t border-slate-100">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsAddingInline(true)}
                className="w-full sm:w-auto inline-flex items-center justify-start gap-1.5 text-left whitespace-normal break-words text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors p-0 h-auto active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Thêm đầu việc mới vào nhóm này</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Confirm Dialog for Unchecking late items */}
      <ActionConfirmDialog
        open={uncheckTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUncheckTarget(null);
        }}
        title="Bỏ hoàn thành công việc trễ hạn"
        description={`Bỏ hoàn thành công việc "${uncheckTarget?.title || ''}" lúc này sẽ làm nó bị TRỄ HẠN do thời gian hiện tại đã quá giờ quy định (${uncheckTarget?.timeLimit || ''}). Bạn có chắc chắn muốn bỏ hoàn thành?`}
        onConfirm={() => {
          if (uncheckTarget) {
            onToggleItem(uncheckTarget.id);
          }
          setUncheckTarget(null);
        }}
        variant="confirm"
      />
    </Card>
  );
});

// ── Main Content Area (Memoized) ────────────────────────────────────────────
interface ChecklistContentAreaProps {
  filteredCategories: ChecklistViewCategory[];
  subTab: ChecklistSubTab;
  isLoading?: boolean;
  expandedCategoryId: string | null;
  onToggleExpand: (categoryId: string) => void;
  permissions: ChecklistPermissions;
  onToggleItem: (itemId: string) => void;
  onDeleteCategory?: (id: string) => Promise<void>;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editState: TaskEditState;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddInlineItem: (categoryId: string, categoryTitle: string, title: string, timeLimit?: string) => Promise<void>;
  onResetFilters: () => void;
  kpiStats: {
    total: number;
    completedCount: number;
    onTimeCount: number;
    lateCount: number;
    onTimePercent: number;
    latePercent: number;
    completionPercent: number;
  };
  roleOptions: Array<{ code: string; name: string }>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
}

const ChecklistContentArea = React.memo(function ChecklistContentArea({
  filteredCategories,
  subTab,
  isLoading = false,
  expandedCategoryId,
  onToggleExpand,
  permissions,
  onToggleItem,
  onDeleteCategory,
  onOpenEditCategoryDialog,
  editState,
  onDeleteItem,
  onAddInlineItem,
  onResetFilters,
  kpiStats,
  roleOptions,
  onUpdateChecklistItem,
}: ChecklistContentAreaProps) {
  // States for delete confirmation
  const [deleteCategoryTarget, setDeleteCategoryTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [activeDetailItem, setActiveDetailItem] = React.useState<ChecklistItem | null>(null);

  const handleConfirmDeleteCategory = React.useCallback((id: string, title: string) => {
    setDeleteCategoryTarget({ id, title });
  }, []);

  const handleConfirmDeleteItem = React.useCallback((id: string, title: string) => {
    setDeleteItemTarget({ id, title });
  }, []);

  return (
    <div className="font-sans grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Detail Dialog */}
      {activeDetailItem && (
        <ChecklistItemDetailDialog
          item={activeDetailItem}
          isOpen={activeDetailItem !== null}
          onClose={() => setActiveDetailItem(null)}
          roleOptions={roleOptions}
          onToggleItem={onToggleItem}
          onUpdateItem={async (id, updates) => {
            if (onUpdateChecklistItem) {
              await onUpdateChecklistItem(id, updates);
              // Update local state in dialog to reflect updates
              setActiveDetailItem((prev) => {
                if (prev && prev.id === id) {
                  return { ...prev, ...updates };
                }
                return prev;
              });
            }
          }}
          onConfirmDeleteItem={handleConfirmDeleteItem}
        />
      )}

      {/* ── Category Cards Column ────────────────────────── */}
      <ScrollArea className="w-full lg:col-span-8 h-auto lg:h-[calc(100dvh-230px)] pr-0 lg:pr-1" viewportClassName="w-full pr-0 sm:pr-2 [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full overflow-x-hidden">
        <div className="w-full space-y-3 pb-4">
          {isLoading ? (
            <Card className="bg-white p-10 text-center rounded-2xl border border-slate-200 gap-3 py-10 shadow-none flex flex-col items-center justify-center animate-in fade-in">
              <span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
              <p className="text-sm font-semibold text-slate-500">Dang tai checklist...</p>
            </Card>
          ) : filteredCategories.length === 0 ? (
            <Card className="bg-white p-14 text-center rounded-2xl border border-dashed border-slate-200 gap-3 py-14 shadow-none flex flex-col items-center justify-center animate-in fade-in">
              <Smile className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-500">Không có dữ liệu checklist phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc vai trò để xem kết quả khác.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer active:scale-95 h-8 border-none"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          ) : (
            filteredCategories.map((cat) => (
              <ChecklistCategoryCard
                key={cat.id}
                cat={cat}
                isExpanded={expandedCategoryId === cat.id}
                subTab={subTab}
                permissions={permissions}
                onToggleExpand={onToggleExpand}
                onToggleItem={onToggleItem}
                onConfirmDeleteCategory={handleConfirmDeleteCategory}
                onOpenEditCategoryDialog={onOpenEditCategoryDialog}
                editState={editState}
                onConfirmDeleteItem={handleConfirmDeleteItem}
                onAddInlineItem={onAddInlineItem}
                onOpenDetail={setActiveDetailItem}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* ── KPI Sidebar ──────────────────────────────────── */}
      <div className="lg:col-span-4 space-y-3">
        {/* Stats card */}
        <Card className="bg-white rounded-2xl border border-slate-200/80 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-none">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-slate-400 via-slate-600 to-slate-800" />

          <div className="p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Thống kê tiến độ hôm nay
            </h3>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl">
                <span className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider block">Đúng hạn</span>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xl font-extrabold text-emerald-700 tabular-nums">{kpiStats.onTimeCount}</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded tabular-nums">{kpiStats.onTimePercent}%</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-100/80 rounded-xl">
                <span className="text-[11px] font-bold uppercase text-rose-600 tracking-wider block">Trễ hạn</span>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-xl font-extrabold text-rose-700 tabular-nums">{kpiStats.lateCount}</span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded tabular-nums">{kpiStats.latePercent}%</span>
                </div>
              </div>
            </div>

            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Tổng hoàn thành</span>
                <span className="tabular-nums">{kpiStats.completedCount}/{kpiStats.total} ({kpiStats.completionPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.onTimeCount / kpiStats.total) * 100 : 0}%` }}
                  title="Đúng hạn"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${kpiStats.total > 0 ? (kpiStats.lateCount / kpiStats.total) * 100 : 0}%` }}
                  title="Trễ hạn"
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 pt-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Đúng hạn</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Trễ hạn</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-200" />Chưa xong</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info note */}
        <Card className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 text-left flex flex-col gap-1.5 py-3.5 shadow-none">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Báo cáo đúng hạn checklist giúp tăng 15% điểm thưởng KPI chất lượng dịch vụ showroom. Các đầu việc tiền mặt và bàn giao két an toàn bắt buộc đính kèm minh chứng hình ảnh thực tế.
          </p>
        </Card>
      </div>

      {/* Delete Category Confirmation */}
      <DeleteConfirm
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="Xóa nhóm công việc"
        description={`Bạn có chắc chắn muốn xóa nhóm "${deleteCategoryTarget?.title || ''}"? Tất cả công việc bên trong cũng sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa nhóm"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteCategoryTarget && onDeleteCategory) {
            await onDeleteCategory(deleteCategoryTarget.id);
          }
          setDeleteCategoryTarget(null);
        }}
      />

      {/* Delete Item Confirmation */}
      <DeleteConfirm
        open={deleteItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null);
        }}
        title="Xóa công việc"
        description={`Bạn có chắc chắn muốn xóa công việc "${deleteItemTarget?.title || ''}"?`}
        confirmText="Xóa công việc"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteItemTarget && onDeleteItem) {
            await onDeleteItem(deleteItemTarget.id);
          }
          setDeleteItemTarget(null);
        }}
      />

    </div>
  );
});

export default ChecklistContentArea;
