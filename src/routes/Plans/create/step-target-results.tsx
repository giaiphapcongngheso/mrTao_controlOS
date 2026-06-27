import React, { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { PlanFormData } from './plan-create-wizard';

interface StepTargetResultsProps {
  formData: PlanFormData;
  onUpdate: <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void;
}

/**
 * Step 2: Target results — description, revenue target, profit margin, custom targets.
 */
const StepTargetResults = React.memo(function StepTargetResults({
  formData,
  onUpdate,
}: StepTargetResultsProps) {
  const handleAddCustomTarget = useCallback(() => {
    onUpdate('customTargets', [...formData.customTargets, { label: '', value: '' }]);
  }, [formData.customTargets, onUpdate]);

  const handleUpdateCustomTarget = useCallback((index: number, field: 'label' | 'value', val: string) => {
    const updated = formData.customTargets.map((t, i) =>
      i === index ? { ...t, [field]: val } : t
    );
    onUpdate('customTargets', updated);
  }, [formData.customTargets, onUpdate]);

  const handleRemoveCustomTarget = useCallback((index: number) => {
    onUpdate('customTargets', formData.customTargets.filter((_, i) => i !== index));
  }, [formData.customTargets, onUpdate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-[12px] font-black flex items-center justify-center">2</span>
        <h3 className="text-[14px] font-black text-slate-800">Kết quả cần đạt</h3>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500">Mô tả ngắn gọn kết quả cốt lõi cần đạt trong kỳ kế hoạch</label>
        <textarea
          value={formData.description}
          onChange={(e) => onUpdate('description', e.target.value)}
          placeholder="Mô tả ngắn gọn kết quả cốt lõi cần đạt trong kỳ kế hoạch..."
          rows={3}
          className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300 resize-none"
        />
        <p className="text-[10px] font-semibold text-slate-300">
          Gợi ý: Kết quả càng cụ thể, kế hoạch càng dễ thành công
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue target */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">Mục tiêu doanh thu (VND)</label>
          <input
            type="number"
            value={formData.revenueTarget || ''}
            onChange={(e) => onUpdate('revenueTarget', Number(e.target.value))}
            placeholder="Ví dụ: 2.200.000.000"
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Profit margin */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">Mục tiêu lợi nhuận / biên (%)</label>
          <input
            type="number"
            value={formData.profitMarginTarget || ''}
            onChange={(e) => onUpdate('profitMarginTarget', Number(e.target.value))}
            placeholder="Ví dụ: 20%"
            min={0}
            max={100}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Custom targets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">Mục tiêu khác (tùy chọn)</label>
          <button
            type="button"
            onClick={handleAddCustomTarget}
            className="w-full px-3 py-2.5 text-[12px] font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm mục tiêu
          </button>
        </div>
      </div>

      {/* Custom target list */}
      {formData.customTargets.length > 0 && (
        <div className="space-y-2 pt-2">
          {formData.customTargets.map((target, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={target.label}
                onChange={(e) => handleUpdateCustomTarget(idx, 'label', e.target.value)}
                placeholder="Tên mục tiêu (ví dụ: Thị phần)"
                className="flex-1 px-3 py-2 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
              />
              <input
                type="text"
                value={target.value}
                onChange={(e) => handleUpdateCustomTarget(idx, 'value', e.target.value)}
                placeholder="Giá trị (ví dụ: 15%)"
                className="w-32 px-3 py-2 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => handleRemoveCustomTarget(idx)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default StepTargetResults;
