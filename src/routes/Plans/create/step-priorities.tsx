import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PlanFormData } from './plan-create-wizard';
import type { PlanPriority } from '../../../types/plans.types';
import { generateEntityId } from '../../../types/base.types';

interface StepPrioritiesProps {
  formData: PlanFormData;
  staffMembers: Array<{ id: string; fullName: string }>;
  onUpdate: <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void;
}

/**
 * Step 3: 3-5 key priorities with title, expected result, deadline, owner.
 */
const StepPriorities = React.memo(function StepPriorities({
  formData,
  staffMembers,
  onUpdate,
}: StepPrioritiesProps) {
  const handleAddPriority = useCallback(() => {
    if (formData.priorities.length >= 7) return;
    const newPriority: PlanPriority = {
      id: generateEntityId('pr'),
      order: formData.priorities.length + 1,
      title: '',
      expectedResult: '',
      deadline: formData.endDate || '',
      ownerId: '',
      ownerName: '',
      progress: 0,
      status: 'not_started',
    };
    onUpdate('priorities', [...formData.priorities, newPriority]);
  }, [formData.priorities, formData.endDate, onUpdate]);

  const handleUpdatePriority = useCallback((index: number, field: keyof PlanPriority, value: string) => {
    const updated = formData.priorities.map((p, i) => {
      if (i !== index) return p;
      if (field === 'ownerId') {
        const staff = staffMembers.find((s) => s.id === value);
        return { ...p, ownerId: value, ownerName: staff?.fullName ?? '' };
      }
      return { ...p, [field]: value };
    });
    onUpdate('priorities', updated);
  }, [formData.priorities, staffMembers, onUpdate]);

  const handleRemovePriority = useCallback((index: number) => {
    const updated = formData.priorities
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, order: i + 1 }));
    onUpdate('priorities', updated);
  }, [formData.priorities, onUpdate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-[12px] font-black flex items-center justify-center">3</span>
        <h3 className="text-[14px] font-black text-slate-800">3–5 ưu tiên chính</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-2 w-10">Ưu tiên</th>
              <th className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-2">Kết quả</th>
              <th className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-2 w-36">Deadline</th>
              <th className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-2 w-40">Owner</th>
              <th className="py-2.5 px-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {formData.priorities.map((priority, idx) => (
              <tr key={priority.id} className="border-b border-slate-50">
                <td className="py-2.5 px-2">
                  <span className="w-6 h-6 rounded-lg bg-[#C21A1A] text-white text-[11px] font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                </td>
                <td className="py-2.5 px-2 space-y-1.5">
                  <input
                    type="text"
                    value={priority.title}
                    onChange={(e) => handleUpdatePriority(idx, 'title', e.target.value)}
                    placeholder="Tên ưu tiên..."
                    className="w-full px-2.5 py-1.5 text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
                  />
                  <input
                    type="text"
                    value={priority.expectedResult}
                    onChange={(e) => handleUpdatePriority(idx, 'expectedResult', e.target.value)}
                    placeholder="Kết quả cụ thể cần đạt..."
                    className="w-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all placeholder:text-slate-300"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <input
                    type="date"
                    value={priority.deadline}
                    onChange={(e) => handleUpdatePriority(idx, 'deadline', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <select
                    value={priority.ownerId}
                    onChange={(e) => handleUpdatePriority(idx, 'ownerId', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C21A1A]/20 focus:border-[#C21A1A] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Chọn...</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 px-2">
                  <button
                    type="button"
                    onClick={() => handleRemovePriority(idx)}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {formData.priorities.length < 7 && (
        <button
          type="button"
          onClick={handleAddPriority}
          className="w-full py-2.5 text-[12px] font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl hover:border-[#C21A1A]/30 hover:text-[#C21A1A] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm ưu tiên
        </button>
      )}
    </div>
  );
});

export default StepPriorities;
