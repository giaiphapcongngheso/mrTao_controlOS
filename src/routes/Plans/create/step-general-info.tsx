import React, { useCallback } from 'react';
import type { PlanFormData } from './plan-create-wizard';
import type { PlanLevel } from '../../../types/plans.types';
import { PLAN_LEVEL_LABELS } from '../constants/plan-constants';

interface StepGeneralInfoProps {
  formData: PlanFormData;
  staffMembers: Array<{ id: string; fullName: string; avatar?: string }>;
  onUpdate: <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void;
}

const LEVEL_OPTIONS: PlanLevel[] = ['quarter', 'month', 'week', 'day'];

/**
 * Step 1: General information — name, level, department, owner, dates.
 */
const StepGeneralInfo = React.memo(function StepGeneralInfo({
  formData,
  staffMembers,
  onUpdate,
}: StepGeneralInfoProps) {
  const handleOwnerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const staff = staffMembers.find((s) => s.id === e.target.value);
    onUpdate('ownerId', staff?.id ?? '');
    onUpdate('ownerName', staff?.fullName ?? '');
  }, [staffMembers, onUpdate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-[12px] font-black flex items-center justify-center">1</span>
        <h3 className="text-[14px] font-black text-slate-800">Thông tin chung</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan name */}
        <div className="md:col-span-1 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Tên kế hoạch <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            placeholder="Nhập tên kế hoạch"
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Level selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Cấp độ <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1.5">
            {LEVEL_OPTIONS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onUpdate('level', level)}
                className={`px-3.5 py-2 text-[12px] font-bold rounded-xl border transition-all cursor-pointer ${
                  formData.level === level
                    ? 'bg-[#C21A1A] text-white border-[#C21A1A]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {PLAN_LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">Phòng ban</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => onUpdate('department', e.target.value)}
            placeholder="Ví dụ: Kinh doanh, Marketing..."
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Owner */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Owner <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.ownerId}
            onChange={handleOwnerChange}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all appearance-none cursor-pointer"
          >
            <option value="">Chọn owner</option>
            {staffMembers.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.fullName}</option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Thời gian bắt đầu <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => onUpdate('startDate', e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all cursor-pointer"
          />
        </div>

        {/* End date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500">
            Thời gian kết thúc <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => onUpdate('endDate', e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
});

export default StepGeneralInfo;
