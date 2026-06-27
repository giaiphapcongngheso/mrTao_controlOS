import React, { useCallback } from 'react';
import { CheckSquare, ListTodo, Award, BarChart4 } from 'lucide-react';
import type { PlanFormData } from './plan-create-wizard';
import type { PlanLinkedModules } from '../../../types/plans.types';
import { LINKED_MODULE_CONFIG } from '../constants/plan-constants';

interface StepModuleLinksProps {
  formData: PlanFormData;
  onUpdate: <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => void;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  checklist: CheckSquare,
  tasks: ListTodo,
  kpi: Award,
  reports: BarChart4,
};

/**
 * Step 5: Module links — toggle connections to Checklist, Tasks, KPI, Reports.
 */
const StepModuleLinks = React.memo(function StepModuleLinks({
  formData,
  onUpdate,
}: StepModuleLinksProps) {
  const handleToggle = useCallback((moduleKey: keyof PlanLinkedModules) => {
    onUpdate('linkedModules', {
      ...formData.linkedModules,
      [moduleKey]: !formData.linkedModules[moduleKey],
    });
  }, [formData.linkedModules, onUpdate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-[12px] font-black flex items-center justify-center">5</span>
        <h3 className="text-[14px] font-black text-slate-800">Liên kết module</h3>
      </div>

      <p className="text-[12px] font-semibold text-slate-400">
        Chỉ dùng để theo dõi hướng mục tiêu, triển khai chi tiết nằm ở các module bên dưới.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LINKED_MODULE_CONFIG.map((mod) => {
          const Icon = MODULE_ICONS[mod.key] ?? CheckSquare;
          const isActive = formData.linkedModules[mod.key];

          return (
            <button
              key={mod.key}
              type="button"
              onClick={() => handleToggle(mod.key)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[#C21A1A]/5 border-[#C21A1A]/20'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-[#C21A1A]/10' : 'bg-slate-50'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#C21A1A]' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {mod.label}
                  </span>
                  {/* Toggle switch */}
                  <div className={`w-9 h-5 rounded-full transition-colors ${
                    isActive ? 'bg-[#C21A1A]' : 'bg-slate-200'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                      isActive ? 'translate-x-4.5 ml-0' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5 line-clamp-1">
                  {mod.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Differentiation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">🎯</span>
            <span className="text-[11px] font-black text-slate-600">Kế hoạch = hướng đi</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">Xác định mục tiêu và ưu tiên cần đạt.</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">📋</span>
            <span className="text-[11px] font-black text-slate-600">Công việc = việc phải làm</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">Là các nhiệm vụ để triển khai kế hoạch.</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">📊</span>
            <span className="text-[11px] font-black text-slate-600">KPI = số đo</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">Đo lường kết quả thực tế so với mục tiêu.</p>
        </div>
      </div>
    </div>
  );
});

export default StepModuleLinks;
