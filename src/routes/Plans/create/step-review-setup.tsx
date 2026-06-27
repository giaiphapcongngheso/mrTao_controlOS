import React, { useCallback } from 'react';
import type { PlanFormData } from './plan-create-wizard';
import type { ReviewFrequency, DeviationAction } from '../../../types/plans.types';
import { REVIEW_FREQUENCY_LABELS } from '../constants/plan-constants';

interface StepReviewSetupProps {
  formData: PlanFormData;
  staffMembers: Array<{ id: string; fullName: string }>;
  onUpdate: <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void;
}

const DEVIATION_OPTIONS: Array<{ value: DeviationAction; label: string }> = [
  { value: 'adjust_plan', label: 'Họp điều chỉnh kế hoạch' },
  { value: 'escalate', label: 'Báo cáo lên cấp trên' },
  { value: 'custom', label: 'Tùy chỉnh hành động' },
];

/**
 * Step 4: Review rhythm — frequency, reviewer, alert threshold, deviation action.
 */
const StepReviewSetup = React.memo(function StepReviewSetup({
  formData,
  staffMembers,
  onUpdate,
}: StepReviewSetupProps) {
  const handleReviewerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const staff = staffMembers.find((s) => s.id === e.target.value);
    onUpdate('reviewerId', staff?.id ?? '');
    onUpdate('reviewerName', staff?.fullName ?? '');
  }, [staffMembers, onUpdate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-[12px] font-black flex items-center justify-center">4</span>
        <h3 className="text-[14px] font-black text-slate-800">Nhịp review</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Review frequency */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Tần suất review <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.reviewFrequency}
            onChange={(e) => onUpdate('reviewFrequency', e.target.value as ReviewFrequency)}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all appearance-none cursor-pointer"
          >
            {(Object.keys(REVIEW_FREQUENCY_LABELS) as ReviewFrequency[]).map((freq) => (
              <option key={freq} value={freq}>{REVIEW_FREQUENCY_LABELS[freq]}</option>
            ))}
          </select>
        </div>

        {/* Reviewer */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Người review <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.reviewerId}
            onChange={handleReviewerChange}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all appearance-none cursor-pointer"
          >
            <option value="">Chọn người review</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>

        {/* Alert threshold */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Ngưỡng cảnh báo <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-400">≥</span>
            <input
              type="number"
              value={formData.alertThreshold}
              onChange={(e) => onUpdate('alertThreshold', Number(e.target.value))}
              min={0}
              max={100}
              className="w-24 px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all"
            />
            <span className="text-[12px] font-semibold text-slate-400">% mục tiêu</span>
          </div>
        </div>

        {/* Deviation action */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Hành động khi lệch <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.deviationAction}
            onChange={(e) => onUpdate('deviationAction', e.target.value as DeviationAction)}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all appearance-none cursor-pointer"
          >
            {DEVIATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

export default StepReviewSetup;
