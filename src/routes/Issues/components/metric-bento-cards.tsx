import React from 'react';
import { AlertTriangle, HelpCircle, Shield, Lightbulb } from 'lucide-react';

interface MetricBentoCardsProps {
  selectedFilter: 'all' | 'sop_error' | 'exception' | 'risk' | 'improvement';
  onSelectFilter: (filter: 'all' | 'sop_error' | 'exception' | 'risk' | 'improvement') => void;
  sopCount: number;
  exceptionCount: number;
  riskCount: number;
  improvementCount: number;
}

const MetricBentoCards = React.memo(function MetricBentoCards({
  selectedFilter,
  onSelectFilter,
  sopCount,
  exceptionCount,
  riskCount,
  improvementCount,
}: MetricBentoCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Lỗi SOP */}
      <div 
        onClick={() => onSelectFilter('sop_error')}
        className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
          selectedFilter === 'sop_error' 
            ? 'ring-2 ring-[#C21A1A] border-[#C21A1A] bg-red-50/10' 
            : 'border-slate-200 hover:border-[#C21A1A]/50 hover:shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nhóm chất lượng</span>
            <h4 className="font-extrabold text-slate-800 text-xs">Lỗi SOP</h4>
          </div>
          <span className="bg-red-50 p-2 rounded-xl text-[#C21A1A] group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-3xl font-black tracking-tight text-[#C21A1A]">{sopCount}</span>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Cần xử lý gấp</span>
        </div>
      </div>

      {/* 2. Ngoại lệ */}
      <div 
        onClick={() => onSelectFilter('exception')}
        className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
          selectedFilter === 'exception' 
            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/10' 
            : 'border-slate-200 hover:border-amber-500/50 hover:shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phê duyệt quy trình</span>
            <h4 className="font-extrabold text-slate-800 text-xs text-left">Ngoại lệ chờ duyệt</h4>
          </div>
          <span className="bg-amber-50 p-2 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5 stroke-[2.5]" />
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-3xl font-black tracking-tight text-amber-500">{exceptionCount}</span>
          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Chờ Quản lý duyệt</span>
        </div>
      </div>

      {/* 3. Rủi ro */}
      <div 
        onClick={() => onSelectFilter('risk')}
        className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
          selectedFilter === 'risk' 
            ? 'ring-2 ring-purple-600 border-purple-600 bg-purple-50/10' 
            : 'border-slate-200 hover:border-purple-500/50 hover:shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">An ninh & Phòng chống</span>
            <h4 className="font-extrabold text-slate-800 text-xs">Rủi ro cao</h4>
          </div>
          <span className="bg-purple-50 p-2 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-3xl font-black tracking-tight text-purple-600">{riskCount}</span>
          <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-md border border-purple-100">Phải chặn ngay</span>
        </div>
      </div>

      {/* 4. Cải tiến */}
      <div 
        onClick={() => onSelectFilter('improvement')}
        className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
          selectedFilter === 'improvement' 
            ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/10' 
            : 'border-slate-200 hover:border-emerald-500/50 hover:shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tối ưu hiệu quả</span>
            <h4 className="font-extrabold text-slate-800 text-xs">Cải tiến đang chạy</h4>
          </div>
          <span className="bg-emerald-50 p-2 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
            <Lightbulb className="w-5 h-5 stroke-[2.5]" />
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-3xl font-black tracking-tight text-emerald-600">{improvementCount}</span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Đang triển khai</span>
        </div>
      </div>
    </div>
  );
});

export default MetricBentoCards;
