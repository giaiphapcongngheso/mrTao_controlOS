import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistHeaderProps {
  subTab: 'today' | 'process' | 'completed';
  canCreate: boolean;
  onOpenCreateDialog: () => void;
}

/**
 * Header component for the Checklist module.
 * Displays page title, context-based description, and single unified CTA button.
 */
const ChecklistHeader = React.memo(function ChecklistHeader({
  subTab,
  canCreate,
  onOpenCreateDialog,
}: ChecklistHeaderProps) {
  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
      {/* Decorative ambient background accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-slate-200/40 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="relative z-10 flex gap-3 items-start text-left">
        <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-sm sm:text-lg shrink-0 select-none flex items-center justify-center">
          CL
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight break-words">
            Checklist &amp; Quy trình vận hành
          </h1>
          <p className="hidden sm:block text-base text-slate-400 font-bold mt-1 max-w-none leading-relaxed">
            {subTab === 'today' && 'Thực thi daily các đầu việc đúng mốc giờ quy định và chụp hình minh chứng ca trực.'}
            {subTab === 'process' && 'Cấu hình và chuẩn hóa quy trình template checklist cho từng vai trò nhân sự.'}
            {subTab === 'completed' && 'Lịch sử lưu trữ đầu việc đã kiểm định hoàn thành theo ngày và tuần.'}
          </p>
        </div>
      </div>

      {/* Unified create button for both today and process tabs */}
      <div className="relative z-10 shrink-0 self-start sm:self-auto">
        {(subTab === 'today' || subTab === 'process') && canCreate && (
          <Button
            onClick={onOpenCreateDialog}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{subTab === 'process' ? 'Thêm quy trình' : 'Thêm checklist'}</span>
          </Button>
        )}
      </div>
    </div>
  );
});

export default ChecklistHeader;
