import React, { useCallback, useMemo } from 'react';
import {
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
  X,
} from 'lucide-react';
import { Button } from '../../../../share/ui';
import type { ProcessDocument } from '../../../types/checklist.types';
import { cn } from '../../../../share/lib/utils';
import { getChecklistColorMeta, resolveChecklistIcon } from '../checklist-meta';
import { toastSuccess } from '../../../shared/lib/toast';

interface ProcessDetailCardProps {
  process: ProcessDocument | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export const ProcessDetailCard = React.memo(function ProcessDetailCard({
  process,
  onClose,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: ProcessDetailCardProps) {
  const colorMeta = useMemo(() => {
    return getChecklistColorMeta(process?.colorKey || 'rose');
  }, [process?.colorKey]);

  const ProcessIcon = useMemo(() => {
    return resolveChecklistIcon(process?.iconName || 'Layers');
  }, [process?.iconName]);

  const handleShareClick = useCallback(() => {
    if (!process) return;
    void navigator.clipboard.writeText(window.location.href);
    toastSuccess('Đã sao chép liên kết quy trình vào bộ nhớ tạm!');
  }, [process]);

  const handleBookmarkClick = useCallback(() => {
    toastSuccess('Đã lưu quy trình này vào danh mục yêu thích!');
  }, []);

  if (!process) return null;

  return (
    <div className="bg-white border border-slate-200/95 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full select-none text-left">
      {/* Header Toolbar */}
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
            <ProcessIcon className={cn("w-4 h-4", colorMeta.iconColor)} />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider truncate max-w-[200px] md:max-w-[260px]" title={process.title}>
              {process.title}
            </h4>
            <span className="text-[10px] font-bold text-slate-400 block mt-0.5 leading-none">
              Cập nhật: {process.updatedAt ? new Date(process.updatedAt).toLocaleDateString('vi-VN') : '17/05/2025'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleBookmarkClick}
            className="w-7 h-7 rounded-lg border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
            title="Lưu yêu thích"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShareClick}
            className="w-7 h-7 rounded-lg border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
            title="Chia sẻ"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>

          {canUpdate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onEdit}
              className="w-7 h-7 rounded-lg border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-100 flex items-center justify-center cursor-pointer"
              title="Chỉnh sửa quy trình"
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
              className="w-7 h-7 rounded-lg border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-100 flex items-center justify-center cursor-pointer"
              title="Xóa quy trình"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-450 hover:text-slate-700 p-1 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            title="Đóng chi tiết"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[72vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
        {/* Two columns layout: Left is Info, Right is Steps */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: general info */}
          <div className="md:col-span-5 space-y-5.5 text-left">
            {/* Mục tiêu */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="w-6.5 h-6.5 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                  <Award className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold tracking-tight">Mục tiêu quy trình</span>
              </div>
              <p className="text-[11px] text-slate-550 font-medium leading-relaxed pl-8.5">
                {process.objective || 'Chưa cấu hình mục tiêu cho quy trình này.'}
              </p>
            </div>

            {/* Khi nào dùng */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="w-6.5 h-6.5 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold tracking-tight">Khi nào dùng</span>
              </div>
              <p className="text-[11px] text-slate-550 font-medium leading-relaxed pl-8.5">
                {process.whenToUse || 'Chưa cấu hình trường hợp áp dụng.'}
              </p>
            </div>

            {/* Người phụ trách */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="w-6.5 h-6.5 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                  <User className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold tracking-tight">Trách nhiệm chính</span>
              </div>
              <p className="text-[11px] text-slate-650 font-bold leading-relaxed pl-8.5 capitalize">
                {process.responsibleRole || process.roleCode || 'Nhân viên cửa hàng'}
              </p>
            </div>
          </div>

          {/* Right Column: steps */}
          <div className="md:col-span-7 space-y-3.5 text-left border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5">
            <h5 className="text-xs font-bold text-slate-800 tracking-tight">Các bước thực hiện</h5>
            
            <div className="space-y-4">
              {process.steps.map((step, stepIndex) => (
                <div key={step.id} className="flex items-start gap-3 text-left">
                  <span className="w-4.5 h-4.5 rounded-full bg-[#C21A1A] text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                    {stepIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h6 className="text-[11px] font-black text-slate-800 leading-tight">
                      {step.title}
                    </h6>
                    {(step.tasks || []).length > 0 && (
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                        {(step.tasks || []).join(', ')}
                      </p>
                    )}

                    {/* Child steps */}
                    {(step.steps || []).length > 0 && (
                      <div className="mt-2 pl-2.5 border-l border-slate-200 space-y-1.5">
                        {(step.steps || []).map((subStep, subIndex) => (
                          <div key={subStep.id} className="text-[10px] text-slate-500 leading-relaxed">
                            <span className="font-bold text-slate-700">{stepIndex + 1}.${subIndex + 1} {subStep.title}:</span>
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

        {/* Mandatory Controls */}
        {process.mandatoryControls && process.mandatoryControls.length > 0 && (
          <div className="border border-slate-200/60 rounded-2xl p-4 bg-slate-50/20 text-left space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="w-6.5 h-6.5 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold tracking-tight">Điểm kiểm soát bắt buộc</span>
            </div>
            <div className="space-y-2 pl-1.5">
              {process.mandatoryControls.map((control, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-slate-650 flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C21A1A] shrink-0 mt-1.5" />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {process.attachments && process.attachments.length > 0 && (
          <div className="border border-slate-200/60 rounded-2xl p-4 bg-slate-50/20 text-left space-y-3">
            <div className="flex items-center gap-2 text-slate-850">
              <span className="w-6.5 h-6.5 rounded-lg bg-red-50 text-[#C21A1A] flex items-center justify-center shrink-0 border border-red-100/50">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold tracking-tight">Biểu mẫu / tài liệu liên quan</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {process.attachments.map((file, idx) => {
                const FileIcon = file.type === 'excel' ? FileSpreadsheet : FileText;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 hover:border-slate-350 rounded-xl p-2.5 flex items-center justify-between gap-2.5 bg-white hover:shadow-3xs transition-all select-none text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        file.type === 'excel' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
                      )}>
                        <FileIcon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-700 block truncate leading-tight" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[8px] font-semibold text-slate-400 uppercase leading-none block mt-0.5">
                          ({file.type.toUpperCase()})
                        </span>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="w-6 h-6 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-650 hover:bg-slate-100 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
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
      </div>
    </div>
  );
});
