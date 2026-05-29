import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistHeaderProps {
  subTab: 'today' | 'process' | 'completed';
  canCreate: boolean;
  onOpenCreateDialog: () => void;
  isCreatingCategory: boolean;
  setIsCreatingCategory: (val: boolean) => void;
  newCategoryTitle: string;
  setNewCategoryTitle: (val: string) => void;
  onCreateCategory?: (title: string, categoryType: 'today' | 'process') => Promise<void>;
}

/**
 * Header component for the Checklist module.
 * Displays page title, context-based description, and call-to-action buttons.
 */
const ChecklistHeader = React.memo(function ChecklistHeader({
  subTab,
  canCreate,
  onOpenCreateDialog,
  isCreatingCategory,
  setIsCreatingCategory,
  newCategoryTitle,
  setNewCategoryTitle,
  onCreateCategory,
}: ChecklistHeaderProps) {
  const activeCategoryType: 'today' | 'process' = subTab === 'process' ? 'process' : 'today';

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
      {/* Decorative ambient background accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-slate-200/40 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="relative z-10 flex gap-3 items-start text-left">
        <span className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-lg shrink-0 select-none flex items-center justify-center">
          CL
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
            Checklist &amp; Quy trình vận hành
          </h1>
          <p className="text-base text-slate-400 font-bold mt-1 max-w-none leading-relaxed">
            {subTab === 'today' && 'Thực thi daily các đầu việc đúng mốc giờ quy định và chụp hình minh chứng ca trực.'}
            {subTab === 'process' && 'Cấu hình và chuẩn hóa quy trình template checklist cho từng vai trò nhân sự.'}
            {subTab === 'completed' && 'Lịch sử lưu trữ đầu việc đã kiểm định hoàn thành theo ngày và tuần.'}
          </p>
        </div>
      </div>

      {/* Action Button checked with permissions */}
      <div className="relative z-10 flex flex-wrap gap-2 shrink-0 self-start sm:self-auto items-center">
        {/* Dynamic Category Creator Form */}
        {(subTab === 'today' || subTab === 'process') && canCreate && (
          <div className="flex items-center gap-2">
            {isCreatingCategory ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newCategoryTitle.trim() && onCreateCategory) {
                    void onCreateCategory(newCategoryTitle.trim(), activeCategoryType);
                    setNewCategoryTitle('');
                    setIsCreatingCategory(false);
                  }
                }}
                className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150"
              >
                <input
                  type="text"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  placeholder="Tên nhóm mới..."
                  autoFocus
                  required
                  className="bg-white border border-slate-200 focus:outline-slate-800 focus:ring-1 focus:ring-slate-800 px-2.5 py-1.5 rounded-lg text-sm font-bold w-36 shadow-2xs focus:outline-none"
                />
                <Button
                  type="submit"
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-black uppercase tracking-wider cursor-pointer shadow-xs transition-all"
                >
                  Lưu
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setNewCategoryTitle('');
                    setIsCreatingCategory(false);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-sm font-bold cursor-pointer transition-all"
                >
                  Hủy
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-sm font-extrabold tracking-wide transition-all cursor-pointer uppercase"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>{subTab === 'process' ? 'Thêm nhóm quy trình' : 'Thêm nhóm checklist'}</span>
              </Button>
            )}
          </div>
        )}

        {subTab === 'today' && canCreate && (
          <Button
            onClick={onOpenCreateDialog}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#C21A1A] hover:bg-red-800 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm checklist hôm nay</span>
          </Button>
        )}

        {subTab === 'process' && canCreate && (
          <Button
            onClick={onOpenCreateDialog}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm quy trình chuẩn</span>
          </Button>
        )}
      </div>
    </div>
  );
});

export default ChecklistHeader;
