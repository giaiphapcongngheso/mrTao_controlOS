import React from 'react';
import { Target, Star, CheckCircle2, AlertTriangle, Link2 } from 'lucide-react';
import type { PlanDocument } from '../../../types/plans.types';
import { PlanSummaryCard, PriorityTable, PriorityStatusBadge } from './plan-widgets';
import { MobileCard } from '@/src/components/custom/mobile-card';
import { useMonthSummary } from '../_hooks/use-plan-metrics';
import { formatCurrencyVN, getMonthLabel, REVIEW_FREQUENCY_LABELS, formatDateVN, PRIORITY_STATUS_CONFIG } from '../plan-utils';

interface PlanMonthViewProps {
  plans: PlanDocument[];
  onEditPlan: (plan: PlanDocument) => void;
}

/**
 * Monthly plan view — priorities list, plan table, week review grid.
 * Matches mockup Screen 3.
 * Standardized with custom div containers and increased text sizes.
 */
const PlanMonthView = React.memo(function PlanMonthView({ 
  plans,
  onEditPlan,
}: PlanMonthViewProps) {
  const { monthPlan, priorityCount, completedCount, warningCount } = useMonthSummary(plans);

  if (!monthPlan) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-slate-400">Chưa có kế hoạch tháng. Hãy tạo kế hoạch tháng mới.</p>
      </div>
    );
  }

  const priorities = monthPlan.priorities ?? [];

  // Find parent quarter plan
  const parentPlan = plans.find((p) => p.id === monthPlan.parentPlanId);

  return (
    <div className="space-y-4 text-slate-700">
      {/* Header action panel */}
      <div className="flex items-center justify-between bg-white border border-slate-100/80 rounded-2xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#C21A1A]" />
          <div>
            <h3 className="text-sm font-black text-slate-800 leading-tight">{monthPlan.name}</h3>
            {parentPlan && (
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1 mt-0.5">
                <Link2 className="w-3 h-3" /> Thuộc: {parentPlan.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PlanSummaryCard icon={Target} label="Mục tiêu tháng" value={monthPlan.revenueTarget ? formatCurrencyVN(monthPlan.revenueTarget) : '—'} subValue="triệu" />
        <PlanSummaryCard icon={Star} iconBg="bg-amber-50" iconColor="text-amber-500" label="Trọng tâm tháng" value={priorityCount} subValue="ưu tiên" />
        <PlanSummaryCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Đúng tiến độ" value={`${completedCount} / ${priorityCount}`} subValue="hạng mục" />
        <PlanSummaryCard icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" label="Cảnh báo" value={warningCount} subValue="hạng mục chậm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_260px] gap-4">
        {/* Left: Priority list */}
        <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-700">{priorityCount} ưu tiên tháng</h4>
          <div className="space-y-3">
            {priorities.map((p, idx) => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-700 line-clamp-2 leading-snug">{p.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {p.ownerName?.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-slate-440 truncate">{p.ownerName}</span>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 pl-7">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${p.progress}%`,
                        backgroundColor: p.progress >= 75 ? '#10b981' : p.progress >= 40 ? '#f59e0b' : '#C21A1A',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 w-8 text-right">{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Priority table */}
        <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-700 mb-2">Bảng kế hoạch tháng</h4>
          <div className="hidden md:block">
            <PriorityTable priorities={priorities} showLinkedTasks />
          </div>
          <div className="block md:hidden space-y-3">
            {priorities.map((p, idx) => {
              const statusConfig = PRIORITY_STATUS_CONFIG[p.status];
              const linkedCount = p.linkedTaskIds?.length ?? 0;
              return (
                <MobileCard key={p.id} delayIndex={idx} variant="bordered">
                  <MobileCard.Header
                    title={p.title}
                    avatar={
                      <div className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {p.order}
                      </div>
                    }
                    badge={{
                      text: statusConfig.label,
                      variant: p.status === 'completed' ? 'success' : p.status === 'in_progress' ? 'warning' : p.status === 'warning' ? 'error' : 'info'
                    }}
                  />
                  <MobileCard.Body className="p-3 space-y-2">
                    <MobileCard.Grid
                      cols={2}
                      items={[
                        { label: 'Chủ trì', value: p.ownerName },
                        { label: 'Hạn chốt', value: formatDateVN(p.deadline) },
                        { label: 'Kết quả cần đạt', value: p.expectedResult, fullWidth: true },
                        ...(linkedCount > 0 ? [{
                          label: 'Công việc liên kết',
                          value: (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                              <Link2 className="w-3.5 h-3.5" />
                              {linkedCount} công việc
                            </span>
                          ),
                          fullWidth: true
                        }] : [])
                      ]}
                    />
                    <MobileCard.ProgressBar value={p.progress} label="Tiến độ" />
                  </MobileCard.Body>
                </MobileCard>
              );
            })}
          </div>
        </div>

        {/* Right: Week review & Control settings */}
        <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-700">Review tuần trong tháng</h4>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((weekNum) => (
              <div key={weekNum} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/50 border border-slate-100">
                <span className="text-xs font-bold text-slate-500 min-w-[50px] shrink-0">Tuần {weekNum}</span>
                <div className="flex-1">
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, weekNum * 25)}%` }}
                    />
                  </div>
                </div>
                <PriorityStatusBadge status={weekNum <= 2 ? 'in_progress' : weekNum === 3 ? 'warning' : 'not_started'} size="sm" />
              </div>
            ))}
          </div>

          {/* Control Settings Info */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-500">
            <div className="flex items-center justify-between">
              <span>Người review</span>
              <span className="text-slate-800 font-bold">{monthPlan.reviewerName || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tần suất review</span>
              <span className="text-slate-800 font-bold">{REVIEW_FREQUENCY_LABELS[monthPlan.reviewFrequency] || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ngưỡng cảnh báo</span>
              <span className="text-amber-600 font-bold">≥ {monthPlan.alertThreshold}%</span>
            </div>
          </div>

          {/* Rules */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <h5 className="text-xs font-bold text-slate-600">Nguyên tắc sử dụng</h5>
            {[
              'Chỉ giữ 5–7 ưu tiên',
              'Không biến tab này thành danh sách công việc',
              'Mỗi ưu tiên phải có kết quả đo được',
              'Công việc chi tiết nằm ở module Công việc',
            ].map((rule) => (
              <div key={rule} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <span className="text-xs font-semibold text-slate-400 leading-normal">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PlanMonthView;
