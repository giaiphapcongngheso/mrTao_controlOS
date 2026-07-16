import React from 'react';
import { AlertCircle, Award, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Edit2, FileText, Image, Info, Plus, Smile, Trash2, X, Camera, Upload, User, Loader2, Paperclip } from 'lucide-react';
import { Button, Card, ScrollArea, Textarea, Input, Sheet, SheetContent, SheetTitle } from '../../../../share/ui';
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
  HistoryDateGroup,
} from '../checklist-view.types';
import { isItemLate, formatCheckedAt } from '../checklist-utils';
import { cn } from '../../../../share/lib/utils';
import type { ChecklistItem } from '../../../types/checklist.types';
import { resolveChecklistIcon } from '../checklist-meta';
import HistoryDateGroupCard from './_history-date-group';
import { ChecklistFlatTable } from './_flat-table';

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
  onToggleItem: (itemId: string, dateKey?: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
  onConfirmDeleteItem: (itemId: string, title: string, dateKey?: string) => void;
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

  const handleBlurSave = React.useCallback(async () => {
    if (!item) return;
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === item.title) return;
    try {
      await onUpdateItem(item.id, { title: trimmed }, item.dateKey);
    } catch (err) {
      console.error(err);
    }
  }, [item, titleValue, onUpdateItem]);

  const handleTimeLimitChange = React.useCallback(async (date: Date | undefined) => {
    if (!item) return;
    const newTime = formatDateToTime(date);
    if (newTime === item.timeLimit) return;
    try {
      await onUpdateItem(item.id, { timeLimit: newTime }, item.dateKey);
    } catch (err) {
      console.error(err);
    }
  }, [item, onUpdateItem]);

  const handleToggleStatus = React.useCallback(() => {
    if (!item) return;
    onToggleItem(item.id, item.dateKey);
  }, [item, onToggleItem]);

  const triggerFileInput = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map((file) => uploadChecklistItemImage(file, item.id));
      const urls = await Promise.all(uploadPromises);
      const imageUrls = item.imageUrls || [];
      const nextUrls = [...imageUrls, ...urls];
      await onUpdateItem(item.id, { imageUrls: nextUrls }, item.dateKey);
    } catch (error) {
      console.error('Lỗi khi tải ảnh lên:', error);
      toastError('Tải ảnh lên thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [item, onUpdateItem]);

  const handleDeleteImage = React.useCallback(async (urlToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item) return;
    const imageUrls = item.imageUrls || [];
    const nextUrls = imageUrls.filter((url) => url !== urlToDelete);
    try {
      await onUpdateItem(item.id, { imageUrls: nextUrls }, item.dateKey);
    } catch (err) {
      console.error(err);
    }
  }, [item, onUpdateItem]);

  const handleDeleteTaskClick = React.useCallback(() => {
    if (!item) return;
    onClose();
    onConfirmDeleteItem(item.id, item.title, item.dateKey);
  }, [item, onClose, onConfirmDeleteItem]);

  if (!item) return null;

  const roleName = roleOptions.find((r) => r.code === item.roleCode)?.name || item.roleCode || 'N/A';
  const imageUrls = item.imageUrls || [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg !p-0 !border-0 overflow-visible bg-white shadow-2xl font-sans h-full flex flex-col"
        >
          <SheetTitle className="sr-only">Checklist Details</SheetTitle>
          
          {/* Header with red brand gradient */}
          <div className="bg-gradient-to-br from-[#C21A1A] via-[#B01717] to-[#9A1212] p-6 text-white relative rounded-t-none shadow-inner shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 block mb-1">
              CHI TIẾT CHECKLIST
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 block mb-2.5">
              NỘI DUNG CÔNG VIỆC
            </span>
            
            <div className="w-full bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold leading-normal select-text">
              {titleValue}
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 hover:rotate-90 text-white flex items-center justify-center transition-all duration-300 cursor-pointer border-none outline-none focus:outline-none"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 bg-white text-left flex-1 overflow-y-auto">
            {/* 2-column Grid of Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Role Info Card */}
              <div className="bg-gradient-to-b from-slate-50/50 to-slate-100/50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300/60 transition-colors duration-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                  VAI TRÒ CỦA NHÓM
                </span>
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-[#C21A1A]/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#C21A1A]" />
                  </div>
                  <span className="truncate">{roleName}</span>
                </div>
              </div>

              {/* Time Limit Picker Card */}
              <div className="bg-gradient-to-b from-slate-50/50 to-slate-100/50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300/60 transition-colors duration-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                  GIỜ CHỐT HOÀN THÀNH
                </span>
                <div className="w-full flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center">
                    <span className="text-slate-700 font-extrabold text-sm select-text">
                      {item.timeLimit || '08:00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Status Control */}
            <div className="flex items-center justify-between py-4 border-y border-slate-100/80 bg-slate-50/20 px-1 rounded-xl">
              <div className="flex items-center gap-3">
                {item.isCompleted ? (
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Circle className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Trạng thái công việc</span>
                  {item.isCompleted ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-[8px] font-black uppercase">
                        {(item.checkedByName || 'H').trim().charAt(0)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        Đã hoàn thành bởi: <span className="font-bold text-slate-700">{item.checkedByName || 'Hệ thống'}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">Chưa hoàn thành</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                onClick={handleToggleStatus}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 border cursor-pointer h-9 active:scale-95 shadow-xs",
                  item.isCompleted
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-emerald-100/50 hover:shadow-emerald-200/50"
                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 hover:border-slate-300"
                )}
              >
                {item.isCompleted ? '✓ Đã xong' : 'Đánh dấu xong'}
              </Button>
            </div>

            {/* Evidence Image Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <Camera className="w-4.5 h-4.5 text-[#C21A1A]" />
                  <span>BẰNG CHỨNG HÌNH ẢNH</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {imageUrls.length}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={isUploading}
                  onClick={triggerFileInput}
                  variant="link"
                  className="text-xs font-black text-[#C21A1A] hover:text-[#A81515] p-0 h-auto flex items-center gap-1.5 cursor-pointer focus:outline-none transition-colors duration-200"
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
                  multiple
                  className="hidden"
                />
              </div>

              {imageUrls.length === 0 ? (
                <div 
                  onClick={triggerFileInput}
                  className="border border-dashed border-slate-200 hover:border-[#C21A1A]/40 rounded-2xl py-8 flex flex-col items-center justify-center text-center bg-slate-50/40 hover:bg-slate-50/80 cursor-pointer transition-all duration-300 group/upload"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 group-hover/upload:bg-rose-50 flex items-center justify-center mb-3 transition-colors duration-300">
                    <Camera className="w-6 h-6 text-slate-400 group-hover/upload:text-[#C21A1A] group-hover/upload:scale-110 transition-all duration-300" />
                  </div>
                  <p className="text-xs font-extrabold text-slate-500 group-hover/upload:text-slate-700 transition-colors">Nhấp để tải ảnh bằng chứng</p>
                  <p className="text-[10px] text-slate-400 mt-1">Định dạng JPG, PNG để làm minh chứng hoàn thành</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-150 bg-slate-50 shadow-2xs group/img animate-in fade-in duration-300"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        onClick={() => setActiveZoomUrl(url)}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Black overlay on hover */}
                      <div 
                        onClick={() => setActiveZoomUrl(url)}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                      />

                      <Button
                        type="button"
                        onClick={(e) => handleDeleteImage(url, e)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 hover:bg-[#C21A1A] text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-200 hover:scale-105 cursor-pointer border-none outline-none shadow-xs"
                        tooltip="Xóa hình ảnh"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-5 border-t border-slate-100/80 flex items-center justify-between bg-slate-50/30 rounded-b-none shrink-0">
            <Button
              type="button"
              onClick={handleDeleteTaskClick}
              variant="ghost"
              className="text-xs font-black tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl px-4 py-2.5 flex items-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-95 border border-transparent hover:border-rose-100/50"
            >
              <Trash2 className="w-4 h-4" />
              <span>XÓA ĐẦU VIỆC</span>
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="h-10 px-6 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/80 bg-white rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95"
            >
              ĐÓNG LẠI
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox Zoom Dialog */}
      {activeZoomUrl && (
        <Dialog open={activeZoomUrl !== null} onOpenChange={(open) => { if (!open) setActiveZoomUrl(null); }}>
          <DialogContent
            showCloseButton={true}
            className="max-w-4xl p-2 bg-black/95 border-none rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl backdrop-blur-md"
          >
            <DialogTitle className="sr-only">Evidence Image Zoomed</DialogTitle>
            <img
              src={activeZoomUrl}
              alt="Evidence zoomed"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
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
  onInlineSave: (itemId: string, dateKey?: string) => Promise<void>;
}

interface ChecklistTaskItemProps {
  item: ChecklistItem;
  subTab: ChecklistSubTab;
  permissions: ChecklistPermissions;
  editState: TaskEditState;
  onToggleItem: (itemId: string, dateKey?: string) => void;
  onConfirmDeleteItem: (itemId: string, title: string, dateKey?: string) => void;
  setUncheckTarget: React.Dispatch<React.SetStateAction<{ id: string; title: string; timeLimit: string; dateKey?: string } | null>>;
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
  const isReadOnlyCompletedTab = subTab === 'history';

  const handleRowClick = React.useCallback(() => {
    if (subTab === 'process' || isReadOnlyCompletedTab || isCurrentlyEditing) return;

    if (item.isCompleted) {
      // Single Click to uncheck
      const tempItem = { ...item, isCompleted: false, checkedAt: undefined };
      const isLateAfterUncheck = isItemLate(tempItem);

      if (isLateAfterUncheck) {
        setUncheckTarget({
          id: item.id,
          title: item.title,
          timeLimit: item.timeLimit || '',
          dateKey: item.dateKey,
        });
      } else {
        onToggleItem(item.id, item.dateKey);
      }
    } else {
      // Single Click to check completed
      onToggleItem(item.id, item.dateKey);
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
    void editState.onInlineSave(item.id, item.dateKey);
  }, [editState.onInlineSave, item.id, item.dateKey]);

  const handleCancelClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    editState.setEditingItemId(null);
  }, [editState.setEditingItemId]);

  const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirmDeleteItem(item.id, item.title, item.dateKey);
  }, [onConfirmDeleteItem, item.id, item.title, item.dateKey]);

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
          className="flex items-center gap-2.5 sm:gap-4 shrink-0 animate-in fade-in"
          onClick={stopProp}
        >
          {/* 1. Time Limit (Hour) */}
          {subTab !== 'process' && item.timeLimit && (
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 select-none tabular-nums",
                isLate
                  ? "bg-rose-50 text-rose-600 border border-rose-100/50"
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              )}
            >
              <Clock className="w-3 h-3" />
              {item.timeLimit}
            </span>
          )}

          {/* 2. Performer (Avatar + Name) */}
          {subTab !== 'process' && item.isCompleted && item.checkedByName && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-100/80 px-2 py-1 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-black uppercase">
                {item.checkedByName.trim().charAt(0)}
              </span>
              <span className="text-[11px] font-bold text-slate-500 truncate max-w-[100px]" title={item.checkedByName}>
                {item.checkedByName}
              </span>
            </div>
          )}

          {/* 3. Evidence / Paperclip attachment with counter */}
          {(subTab === 'today' || subTab === 'history') && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(item);
              }}
              className={cn(
                "flex h-7.5 items-center justify-center transition-all duration-200 cursor-pointer border rounded-xl gap-1.5 px-2.5 w-auto shadow-2xs select-none active:scale-95",
                (item.imageUrls || []).length > 0
                  ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100/70"
                  : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              tooltip="Bằng chứng hình ảnh & Chi tiết"
            >
              <Paperclip className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[10px] font-black">{(item.imageUrls || []).length}</span>
            </Button>
          )}

          {/* 4. Status Badge */}
          {subTab !== 'process' && (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl text-center min-w-[70px] select-none",
                item.isCompleted
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                  : isLate
                  ? "bg-rose-50 text-rose-600 border border-rose-100/50 animate-pulse"
                  : "bg-slate-100 text-slate-500 border border-slate-200/50"
              )}
            >
              {item.isCompleted ? 'Đã xong' : isLate ? 'Quá hạn' : 'Chưa làm'}
            </span>
          )}

          {/* 5. Delete and Checkmark info Tooltip */}
          <div className="flex items-center gap-1">
            {subTab === 'today' && permissions.canDelete && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDeleteClick}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100"
                tooltip="Xóa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {subTab === 'today' && item.isCompleted && (item.checkedByName || item.checkedAt) && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
                tooltip={
                  <>
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
                  </>
                }
                tooltipClassName="w-56 p-3 rounded-xl shadow-xl animate-in fade-in zoom-in-95"
              >
                <Award className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
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
  onToggleItem: (itemId: string, dateKey?: string) => void;
  onConfirmDeleteCategory: (id: string, title: string) => void;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editState: TaskEditState;
  onConfirmDeleteItem: (itemId: string, title: string, dateKey?: string) => void;
  onAddInlineItem: (categoryId: string, categoryTitle: string, title: string, timeLimit?: string) => Promise<void>;
  onOpenDetail: (item: ChecklistItem) => void;
  roleOptions: Array<{ code: string; name: string }>;
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
  roleOptions,
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
  const [uncheckTarget, setUncheckTarget] = React.useState<{ id: string; title: string; timeLimit: string; dateKey?: string } | null>(null);

  const roleName = React.useMemo(() => {
    return roleOptions.find((r) => r.code?.toUpperCase() === cat.roleCode?.toUpperCase())?.name || cat.title || 'Checklist vai trò';
  }, [cat.roleCode, cat.title, roleOptions]);

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
        "font-sans w-full bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col gap-0 py-0 shadow-none border-slate-200/80 hover:shadow-sm border-l-4",
        isExpanded ? "border-slate-200 shadow-2xs" : ""
      )}
      style={{ borderLeftColor: cat.meta.accentHex }}
    >
      {/* ── Category Header ─────────────────────────────────── */}
      <div
        onClick={handleHeaderClick}
        className={cn(
          "w-full min-w-0 px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-4 cursor-pointer select-none group/header animate-in fade-in transition-colors",
          isExpanded ? "bg-slate-50/40" : "hover:bg-slate-50/30"
        )}
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
              {roleName}
            </h3>

            {subTab !== 'process' && isFinishedList && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded uppercase tracking-wider shrink-0 animate-in zoom-in-75">
                Xong
              </span>
            )}
          </div>

          {/* Minimalist Task count metadata (No horizontal progress bar to match template) */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              {subTab === 'process' || subTab === 'checklist_template' ? (
                `${cat.countTotal} đầu việc`
              ) : (
                `${cat.countDone}/${cat.countTotal} hoàn thành`
              )}
            </span>
            {subTab !== 'process' && subTab !== 'checklist_template' && cat.countTotal > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100/80">
                Hiệu suất: {percentText}%
              </span>
            )}
          </div>
        </div>

        {/* Actions & Toggle Expand */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={stopProp}>
          {subTab !== 'history' && permissions.canUpdate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleEditClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border-slate-150 text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-100 flex items-center justify-center transition-colors cursor-pointer"
              tooltip="Chỉnh sửa checklist mẫu"
            >
              <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          {subTab !== 'history' && permissions.canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDeleteClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center transition-colors cursor-pointer"
              tooltip="Xóa checklist mẫu"
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

          {subTab !== 'history' && permissions.canCreate && !isAddingInline && (
            <div className="px-3 sm:px-4 py-3 border-t border-slate-100">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsAddingInline(true)}
                className="w-full sm:w-auto inline-flex items-center justify-start gap-1.5 text-left whitespace-normal break-words text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors p-0 h-auto active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Thêm đầu việc mới cho vai trò này</span>
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
            onToggleItem(uncheckTarget.id, uncheckTarget.dateKey);
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
  onToggleItem: (itemId: string, dateKey?: string) => void;
  onDeleteCategory?: (id: string) => Promise<void>;
  onOpenEditCategoryDialog: (cat: ChecklistViewCategory) => void;
  editState: TaskEditState;
  onDeleteItem: (itemId: string, dateKey?: string) => Promise<void>;
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
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
  historyDateGroups?: HistoryDateGroup[];
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
  historyDateGroups = [],
}: ChecklistContentAreaProps) {
  const [deleteCategoryTarget, setDeleteCategoryTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<{ id: string; title: string; dateKey?: string } | null>(null);
  const [activeDetailItem, setActiveDetailItem] = React.useState<ChecklistItem | null>(null);

  React.useEffect(() => {
    const handleOpenDetailEvent = (e: Event) => {
      const task = (e as CustomEvent).detail as ChecklistItem;
      if (task) {
        setActiveDetailItem(task);
      }
    };
    window.addEventListener('open-checklist-item-detail', handleOpenDetailEvent);
    return () => {
      window.removeEventListener('open-checklist-item-detail', handleOpenDetailEvent);
    };
  }, []);

  // Sync activeDetailItem with the updated state from parent (filteredCategories & historyDateGroups)
  React.useEffect(() => {
    if (!activeDetailItem) return;

    let found: ChecklistItem | undefined;
    // Look up in filteredCategories first
    for (const cat of filteredCategories) {
      found = cat.tasks?.find((t) => t.id === activeDetailItem.id);
      if (found) break;
    }

    // Look up in historyDateGroups if not found (e.g. History Tab)
    if (!found && historyDateGroups) {
      for (const group of historyDateGroups) {
        for (const cat of group.categories) {
          found = cat.tasks?.find((t) => t.id === activeDetailItem.id);
          if (found) break;
        }
        if (found) break;
      }
    }

    if (found) {
      const isChanged =
        found.isCompleted !== activeDetailItem.isCompleted ||
        found.title !== activeDetailItem.title ||
        found.timeLimit !== activeDetailItem.timeLimit ||
        JSON.stringify(found.imageUrls) !== JSON.stringify(activeDetailItem.imageUrls) ||
        found.checkedByName !== activeDetailItem.checkedByName ||
        found.checkedAt !== activeDetailItem.checkedAt;

      if (isChanged) {
        setActiveDetailItem(found);
      }
    }
  }, [filteredCategories, historyDateGroups, activeDetailItem]);

  // State for expanded date groups in history view (default: all expanded)
  const [expandedDates, setExpandedDates] = React.useState<Set<string>>(() => {
    return new Set(historyDateGroups.map((g) => g.dateKey));
  });

  // Sync expandedDates when historyDateGroups changes (new dates arrive)
  React.useEffect(() => {
    if (historyDateGroups.length > 0) {
      setExpandedDates((prev) => {
        const next = new Set(prev);
        for (const g of historyDateGroups) {
          if (!prev.has(g.dateKey)) {
            next.add(g.dateKey);
          }
        }
        return next;
      });
    }
  }, [historyDateGroups]);

  const handleToggleDateGroup = React.useCallback((dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }, []);

  const handleConfirmDeleteCategory = React.useCallback((id: string, title: string) => {
    setDeleteCategoryTarget({ id, title });
  }, []);

  const handleConfirmDeleteItem = React.useCallback((id: string, title: string, dateKey?: string) => {
    setDeleteItemTarget({ id, title, dateKey });
  }, []);

  return (
    <div className="font-sans w-full space-y-3.5 text-left">
      {/* Detail Dialog */}
      {activeDetailItem && (
        <ChecklistItemDetailDialog
          item={activeDetailItem}
          isOpen={activeDetailItem !== null}
          onClose={() => setActiveDetailItem(null)}
          roleOptions={roleOptions}
          onToggleItem={onToggleItem}
          onUpdateItem={async (id, updates, dateKey) => {
            if (onUpdateChecklistItem) {
              await onUpdateChecklistItem(id, updates, dateKey);
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

      {/* Category Cards Column */}
      <ScrollArea className="w-full h-auto lg:h-[calc(100dvh-260px)] pr-0 overflow-x-hidden" viewportClassName="w-full [&>div]:w-full">
        <div className="w-full space-y-3 pb-4">
          {isLoading ? (
            <Card className="bg-white p-10 text-center rounded-2xl border border-slate-200 gap-3 py-10 shadow-none flex flex-col items-center justify-center animate-in fade-in">
              <span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
              <p className="text-sm font-semibold text-slate-500">Đang tải checklist...</p>
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
          ) : subTab === 'today' ? (
            <ChecklistFlatTable
              filteredCategories={filteredCategories}
              permissions={permissions}
              onToggleItem={onToggleItem}
              editState={editState}
              onDeleteItem={onDeleteItem}
              onOpenDetail={setActiveDetailItem}
            />
          ) : subTab === 'history' && historyDateGroups.length > 0 ? (
            historyDateGroups.map((group) => (
              <HistoryDateGroupCard
                key={group.dateKey}
                group={group}
                isExpanded={expandedDates.has(group.dateKey)}
                onToggle={handleToggleDateGroup}
              >
                {group.categories.map((cat) => (
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
                    roleOptions={roleOptions}
                  />
                ))}
              </HistoryDateGroupCard>
            ))
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
                roleOptions={roleOptions}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Category Confirmation */}
      <DeleteConfirm
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategoryTarget(null);
        }}
        title="Xóa checklist mẫu"
        description={`Bạn có chắc chắn muốn xóa checklist mẫu của vai trò "${deleteCategoryTarget?.title || ''}"? Tất cả công việc bên trong cũng sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa checklist"
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
            await onDeleteItem(deleteItemTarget.id, deleteItemTarget.dateKey);
          }
          setDeleteItemTarget(null);
        }}
      />
    </div>
  );
});

export default ChecklistContentArea;
