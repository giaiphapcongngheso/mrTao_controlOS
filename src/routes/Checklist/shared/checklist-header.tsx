import React from 'react';
import { Plus, ClipboardList, Play } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistHeaderProps {
  subTab: 'today' | 'checklist_template' | 'process' | 'history';
  canCreate: boolean;
  onOpenCreateDialog: () => void;
}

const getSubTabName = (tab: 'today' | 'checklist_template' | 'process' | 'history') => {
  switch (tab) {
    case 'today':
      return 'Hôm nay';
    case 'checklist_template':
      return 'Checklist mẫu';
    case 'process':
      return 'Quy trình SOP';
    case 'history':
      return 'Lịch sử';
    default:
      return '';
  }
};

/**
 * Header component for the Checklist module.
 * Displays page title with breadcrumbs, context-based description, and CTAs.
 */
const ChecklistHeader = React.memo(function ChecklistHeader({
  subTab,
  canCreate,
  onOpenCreateDialog,
}: ChecklistHeaderProps) {
  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
      {/* Decorative ambient background accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-1 text-left">
        
        <div className="flex gap-3.5 items-center mt-1">
          <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 border border-red-100/50 text-[#C21A1A] shrink-0 select-none flex items-center justify-center">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-black text-slate-800 leading-tight break-words">
              Quy trình &amp; Checklist vận hành
            </h1>
            <p className="hidden sm:block text-xs font-semibold text-slate-400 mt-1 max-w-none leading-relaxed">
              {subTab === 'today' && 'Checklist hàng ngày tự sinh theo vai trò, giúp nhân sự làm đúng việc đúng giờ.'}
              {subTab === 'checklist_template' && 'Cấu hình và chuẩn hóa checklist mẫu và đầu việc của từng vai trò.'}
              {subTab === 'process' && 'Quy trình SOP chuẩn hóa cho từng vai trò và bộ phận nhân sự.'}
              {subTab === 'history' && 'Lịch sử lưu trữ và đối soát checklist toàn bộ nhân sự theo thời gian.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative z-10 shrink-0 flex items-center gap-2 self-start sm:self-auto">


        {(subTab === 'today' || subTab === 'process') && canCreate && (
          <Button
            onClick={onOpenCreateDialog}
            className="inline-flex items-center gap-1.5 px-4.5 h-9 bg-[#C21A1A] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>
              {subTab === 'process' ? 'Thêm quy trình' : 'Thêm checklist'}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
});

export default ChecklistHeader;
