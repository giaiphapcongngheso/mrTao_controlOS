import React, { useState, useCallback } from 'react';
import { BookText, Plus, Trash2, Check, ChevronRight, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '../../../../share/ui';
import { reportNoteTemplateService } from '../../../services/admin/report-note-template-service';
import type { ReportNoteTemplate } from '../../../types/report-note-template.types';

import { toastSuccess, toastError } from '../../../shared/lib/toast';

interface NoteTemplatePickerProps {
  /** Noi dung hien tai trong o soan thao */
  currentContent: string;
  /** Callback khi nguoi dung chon ap dung mau */
  onApply: (content: string) => void;
  /** Ten nguoi dung hien tai de gan createdBy */
  currentUserName?: string;
}

const QUERY_KEY = ['report-note-templates'];

export const NoteTemplatePicker = React.memo(function NoteTemplatePicker({
  currentContent,
  onApply,
  currentUserName = 'Hệ thống',
}: NoteTemplatePickerProps) {
  const safeContent = currentContent || '';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [justApplied, setJustApplied] = useState<string | null>(null);

  // Load danh sach mau
  const { data: templates = [], isLoading } = useQuery<ReportNoteTemplate[]>({
    queryKey: QUERY_KEY,
    queryFn: () => reportNoteTemplateService.getAll(),
    staleTime: 30_000,
  });

  // Them mau moi
  const addMutation = useMutation({
    mutationFn: (payload: Omit<ReportNoteTemplate, 'id'>) =>
      reportNoteTemplateService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setSavingMode(false);
      setNewTitle('');
      toastSuccess('Đã lưu mẫu soạn sẵn thành công!');
    },
    onError: (error: any) => {
      console.error('Error adding template:', error);
      toastError(`Lỗi khi lưu mẫu: ${error.message || 'Không rõ nguyên nhân'}`);
    }
  });

  // Xoa mau
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportNoteTemplateService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toastSuccess('Đã xóa mẫu thành công!');
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      toastError(`Lỗi khi xóa mẫu: ${error.message || 'Không rõ nguyên nhân'}`);
    }
  });

  const handleSaveNew = useCallback(() => {
    if (!newTitle.trim() || !safeContent.trim()) return;
    addMutation.mutate({
      title: newTitle.trim(),
      content: safeContent.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    });
  }, [newTitle, safeContent, currentUserName, addMutation]);

  const handleApply = useCallback(
    (template: ReportNoteTemplate) => {
      const result =
        applyMode === 'append' && safeContent.trim()
          ? safeContent.trimEnd() + '\n\n' + template.content
          : template.content;
      onApply(result);
      setJustApplied(template.id);
      setTimeout(() => setJustApplied(null), 1500);
    },
    [applyMode, safeContent, onApply]
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Xóa mẫu này?')) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const canSave = newTitle.trim().length > 0 && safeContent.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg gap-1.5 cursor-pointer"
        >
          <BookText className="w-3.5 h-3.5" />
          Mẫu soạn
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 p-0 rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
        sideOffset={6}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <BookText className="w-3.5 h-3.5 text-[#C21A1A]" />
            Mẫu soạn sẵn
          </span>
          {/* Che do ap dung */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
            {(['replace', 'append'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setApplyMode(mode)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  applyMode === mode
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode === 'replace' ? 'Thay thế' : 'Chèn thêm'}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sach mau */}
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                Đang tải...
              </div>
            ) : templates.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                Chưa có mẫu nào. Soạn nội dung rồi lưu lại!
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group flex items-start gap-2 rounded-xl px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleApply(tpl)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{tpl.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {tpl.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {justApplied === tpl.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#C21A1A] transition-colors" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(tpl.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all cursor-pointer"
                      title="Xóa mẫu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer: Luu mau moi */}
        <div className="border-t border-slate-100 p-3 bg-white">
          {!savingMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSavingMode(true)}
              disabled={!safeContent.trim()}
              className="w-full h-8 text-xs font-bold border-dashed border-slate-250 text-slate-500 hover:border-[#C21A1A] hover:text-[#C21A1A] hover:bg-rose-50/40 rounded-xl gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Lưu nội dung đang soạn làm mẫu
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Đặt tên cho mẫu
              </p>
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSave) handleSaveNew();
                    if (e.key === 'Escape') setSavingMode(false);
                  }}
                  placeholder="VD: Ca bình thường, Cuối tuần..."
                  className="flex-1 h-8 text-xs rounded-xl border-slate-200 focus:border-[#C21A1A]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!canSave || addMutation.isPending}
                  onClick={handleSaveNew}
                  className="h-8 px-3 bg-[#C21A1A] hover:bg-[#a51616] text-white rounded-xl text-xs font-bold cursor-pointer border-none"
                >
                  {addMutation.isPending ? '...' : 'Lưu'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setSavingMode(false); setNewTitle(''); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Nội dung đang soạn ({safeContent.length} ký tự) sẽ được lưu.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
