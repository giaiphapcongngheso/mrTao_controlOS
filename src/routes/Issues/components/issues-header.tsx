import React from 'react';
import { Layers, Plus } from 'lucide-react';

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
      <div className="font-sans">
        <div className="flex items-center gap-2">
          <span className="bg-[#C21A1A]/10 text-[#C21A1A] p-1.5 rounded-lg shrink-0">
            <Layers className="w-5 h-5 shrink-0 stroke-[2.5]" />
          </span>
          <h1 className="text-xl font-black font-display tracking-tight text-slate-900 uppercase">
            KIỂM SOÁT LỖI SOP &amp; NGOẠI LỆ
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 font-medium font-sans">
          Ghi nhận – theo dõi – xử lý – đóng vòng cải tiến sai lệch showroom định kỳ.
        </p>
      </div>

      {canCreate && (
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#C21A1A] hover:bg-[#A31414] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Ghi nhận phiếu phát sinh</span>
        </button>
      )}
    </div>
  );
});

export default IssuesHeader;
