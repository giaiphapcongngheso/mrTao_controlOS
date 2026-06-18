import React, { useCallback, useMemo } from 'react';
import {
  X,
  Award,
  Clock,
  User,
  AlertCircle,
  Download,
  Bookmark,
  Share2,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  ScrollArea,
  Card,
  CardContent,
} from '../../../../share/ui';
import type { ProcessDocument } from '../../../types/checklist.types';
import { cn } from '../../../../share/lib/utils';
import { getChecklistColorMeta, resolveChecklistIcon } from '../checklist-meta';
import { toastSuccess } from '../../../shared/lib/toast';

interface ProcessDetailSheetProps {
  process: ProcessDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export const ProcessDetailSheet = React.memo(function ProcessDetailSheet({
  process,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: ProcessDetailSheetProps) {
  const colorMeta = useMemo(() => {
    return getChecklistColorMeta(process?.colorKey || 'rose');
  }, [process?.colorKey]);

  const ProcessIcon = useMemo(() => {
    return resolveChecklistIcon(process?.iconName || 'Layers');
  }, [process?.iconName]);

  const handleShareClick = useCallback(() => {
    if (!process) return;
    const shareText = `Quy trình SOP: ${process.title} (Vai trò: ${process.roleCode})`;
    void navigator.clipboard.writeText(window.location.href);
    toastSuccess('Đã sao chép liên kết quy trình vào bộ nhớ tạm!');
  }, [process]);

  const handleBookmarkClick = useCallback(() => {
    toastSuccess('Đã lưu quy trình này vào danh mục yêu thích!');
  }, []);

  if (!process) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[60vw] sm:max-w-[55vw] p-0 font-sans border-l border-slate-200 bg-white flex flex-col h-full focus:outline-none"
      >
        {/* Header Toolbar */}
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
              <ProcessIcon className={cn("w-4 h-4", colorMeta.iconColor)} />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-sm font-black text-slate-800 uppercase tracking-wider truncate max-w-[280px]" title={process.title}>
                {process.title}
              </SheetTitle>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5 leading-none">
                Cập nhật: {process.updatedAt ? new Date(process.updatedAt).toLocaleDateString('vi-VN') : '17/05/2025'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Bookmark & Share */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleBookmarkClick}
              className="w-7.5 h-7.5 rounded-lg border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              tooltip="Lưu yêu thích"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleShareClick}
              className="w-7.5 h-7.5 rounded-lg border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              tooltip="Chia sẻ"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>

            {/* Edit & Delete */}
            {canUpdate && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onEdit}
                className="w-7.5 h-7.5 rounded-lg border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 flex items-center justify-center"
                tooltip="Chỉnh sửa quy trình"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onDelete}
                className="w-7.5 h-7.5 rounded-lg border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 flex items-center justify-center"
                tooltip="Xóa quy trình"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-7.5 h-7.5 rounded-lg text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </Button>
          </div>
        </div>

        {/* Body content with ScrollArea */}
        <ScrollArea className="flex-1 overflow-x-hidden" viewportClassName="p-6 space-y-6">
          {/* Top Section: Two Columns (General Info vs Core Steps) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: General Info (Mục tiêu, Khi nào dùng, Trách nhiệm) */}
            <div className="lg:col-span-5 space-y-6 text-left select-none pr-2">
              {/* Mục tiêu */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-slate-800">
                  <span className="w-7 h-7 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                    <Award className="w-4 h-4" />
                  </span>
                  <span className="text-[13px] font-bold tracking-tight">Mục tiêu quy trình</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed pl-9.5">
                  {process.objective || 'Đảm bảo mỗi ca làm việc hoặc quy trình nghiệp vụ được thực hiện trơn tru, đúng tiêu chuẩn.'}
                </p>
              </div>

              {/* Khi nào dùng */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-slate-800">
                  <span className="w-7 h-7 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                    <Clock className="w-4 h-4" />
                  </span>
                  <span className="text-[13px] font-bold tracking-tight">Khi nào dùng</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed pl-9.5">
                  {process.whenToUse || 'Áp dụng cho mọi hoạt động nghiệp vụ tại showroom/cửa hàng theo vai trò được giao.'}
                </p>
              </div>

              {/* Người chịu trách nhiệm chính */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-slate-800">
                  <span className="w-7 h-7 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="text-[13px] font-bold tracking-tight">Người chịu trách nhiệm chính</span>
                </div>
                <p className="text-xs text-slate-650 font-bold leading-relaxed pl-9.5 capitalize">
                  {process.responsibleRole || process.roleCode || 'Nhân viên cửa hàng'}
                </p>
              </div>
            </div>

            {/* Right Column: Core Steps */}
            <div className="lg:col-span-7 space-y-4 text-left lg:border-l lg:border-slate-100 lg:pl-6">
              <h4 className="text-[13px] font-bold text-slate-800 tracking-tight">Các bước thực hiện</h4>
              
              <div className="space-y-4.5">
                {process.steps.map((step, stepIndex) => (
                  <div key={step.id} className="flex items-start gap-3.5 text-left">
                    {/* Circle Step Number - Red solid */}
                    <span className="w-5 h-5 rounded-full bg-[#C21A1A] text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                      {stepIndex + 1}
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-black text-slate-800 leading-tight">
                        {step.title}
                      </h5>

                      {/* Step core tasks list (Flat text joined by comma) */}
                      {(step.tasks || []).length > 0 && (
                        <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          {(step.tasks || []).join(', ')}
                        </p>
                      )}

                      {/* Child sub steps */}
                      {(step.steps || []).length > 0 && (
                        <div className="mt-2.5 pl-3 border-l border-slate-200 space-y-2">
                          {(step.steps || []).map((subStep, subIndex) => (
                            <div key={subStep.id} className="text-[11px] text-slate-500 leading-relaxed">
                              <span className="font-bold text-slate-700">{stepIndex + 1}.{subIndex + 1} {subStep.title}:</span>
                              {subStep.tasks && subStep.tasks.length > 0 && (
                                <span className="font-semibold text-slate-500 ml-1">
                                  {subStep.tasks.join(', ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Section: Mandatory controls (Full-width card layout) */}
          {process.mandatoryControls && process.mandatoryControls.length > 0 && (
            <div className="border border-slate-200/75 rounded-2xl p-4.5 bg-white text-left space-y-3.5 shadow-3xs">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-bold tracking-tight">Điểm kiểm soát bắt buộc</span>
              </div>
              <div className="space-y-2.5 pl-1.5">
                {process.mandatoryControls.map((control, idx) => (
                  <div key={idx} className="text-xs font-bold text-slate-650 flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C21A1A] shrink-0 mt-2" />
                    <span>{control}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Section: Attached Files (Full-width documents grid layout) */}
          {process.attachments && process.attachments.length > 0 && (
            <div className="border border-slate-200/75 rounded-2xl p-4.5 bg-white text-left space-y-4 shadow-3xs">
              <div className="flex items-center gap-2 text-slate-850">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-bold tracking-tight">Biểu mẫu / tài liệu liên quan</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {process.attachments.map((file, idx) => {
                  const FileIcon = file.type === 'excel' ? FileSpreadsheet : FileText;
                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 hover:border-slate-350 rounded-xl p-3 flex items-center justify-between gap-3 bg-white hover:shadow-3xs transition-all select-none text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn(
                          "w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border",
                          file.type === 'excel' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
                        )}>
                          <FileIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-black text-slate-700 block truncate leading-tight" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase leading-none block mt-1">
                            ({file.type.toUpperCase()})
                          </span>
                        </div>
                      </div>
                      <a
                        href={file.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="w-6.5 h-6.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-650 hover:bg-slate-100 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
                        title="Tải xuống tài liệu"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});
