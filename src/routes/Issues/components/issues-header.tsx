import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface IssuesHeaderProps {
  canCreate: boolean;
  onOpenAddModal: () => void;
}

const IssuesHeader = React.memo(function IssuesHeader({
  canCreate,
  onOpenAddModal,
}: IssuesHeaderProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none text-left">
      <div className="flex gap-3 items-start text-left">
        <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#C21A1A]/10 text-[#C21A1A] flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 stroke-[2.5]" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-black font-display tracking-tight text-slate-900 uppercase leading-none">
            KIỂM SOÁT LỖI SOP &amp; NGOẠI LỆ
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium font-sans leading-relaxed">
            Ghi nhận – theo dõi – xử lý – đóng vòng cải tiến sai lệch showroom định kỳ.
          </p>
        </div>
      </div>

      {canCreate && (
        <Button
          onClick={onOpenAddModal}
          className="hidden sm:inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-[#C21A1A] hover:bg-[#A31414] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 self-start md:self-auto border-none h-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Ghi nhận phiếu phát sinh</span>
        </Button>
      )}
    </div>
  );
});

export default IssuesHeader;
