import React from 'react';
import { Star, DollarSign, Clock, CheckCircle2, Link2 } from 'lucide-react';
import type { PlanDocument } from '../../../types/plans.types';
import { PlanSummaryCard, PriorityTable } from './plan-widgets';
import { MobileCard } from '@/src/components/custom/mobile-card';
import { useWeekSummary } from '../_hooks/use-plan-metrics';
import { formatCurrencyVN, WEEK_DAYS, REVIEW_FREQUENCY_LABELS, formatDateVN, PRIORITY_STATUS_CONFIG } from '../plan-utils';

interface PlanWeekViewProps {
  plans: PlanDocument[];
  onEditPlan: (plan: PlanDocument) => void;
}

/**
 * Weekly plan view (20/80) — priority table, day grid, meeting sidebar.
 * Matches mockup Screen 5.
 * Standardized with custom div containers and increased text sizes.
 */
const PlanWeekView = React.memo(function PlanWeekView({ 
  plans,
  onEditPlan,
}: PlanWeekViewProps) {
  const { weekPlan, priorityCount, behindCount, commitPercentage } = useWeekSummary(plans);

  if (!weekPlan) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-slate-400">Chưa có kế hoạch tuần. Hãy tạo kế hoạch tuần mới.</p>
      </div>
    );
  }

  const priorities = weekPlan.priorities ?? [];

  // Find parent month plan
  const parentPlan = plans.find((p) => p.id === weekPlan.parentPlanId);

  return (
    <div className="space-y-4 text-slate-700">
      {/* Header action panel */}
      <div className="flex items-center justify-between bg-white border border-slate-100/80 rounded-2xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#C21A1A]" />
          <div>
            <h3 className="text-sm font-black text-slate-800 leading-tight">{weekPlan.name}</h3>
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
        <PlanSummaryCard icon={Star} label="Ưu tiên tuần" value={priorityCount} subValue="việc" />
        <PlanSummaryCard icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Kết quả tuần"
          value={weekPlan.revenueTarget ? `≥ ${formatCurrencyVN(weekPlan.revenueTarget)}` : '—'} />
        <PlanSummaryCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" label="Đang chậm" value={behindCount} subValue="việc" />
        <PlanSummaryCard icon={CheckCircle2} iconBg="bg-blue-50" iconColor="text-blue-500" label="Cam kết" value={`${commitPercentage}%`} subValue="đã có owner & deadline" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          {/* Priority table */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700 mb-2">Bảng ưu tiên tuần</h4>
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

          {/* Week day grid */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700 mb-2">Kế hoạch theo ngày trong tuần</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WEEK_DAYS.map((day) => (
                <div key={day.key} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2 min-h-[100px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-600">{day.short}</span>
                    <span className="text-xs font-semibold text-slate-400">{day.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-slate-200/65 rounded-full w-full animate-pulse" />
                    <div className="h-1.5 bg-slate-200/65 rounded-full w-3/4 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300 block pt-1">Chưa có việc</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Meeting 20/80 */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700">Họp tuần 20/80</h4>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-red-50">
                <span className="text-xs font-black text-[#C21A1A] block">1. Mục tiêu lớn nhất</span>
                <span className="text-xs font-semibold text-slate-600 mt-0.5 block leading-normal">
                  {weekPlan.revenueTarget ? `Đạt ${formatCurrencyVN(weekPlan.revenueTarget)} doanh thu tuần` : 'Chưa thiết lập'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50">
                <span className="text-xs font-black text-amber-600 block">2. Điểm nghẽn</span>
                <ul className="mt-1 space-y-0.5">
                  {behindCount > 0 ? (
                    <li className="text-xs font-semibold text-slate-500">• {behindCount} hạng mục đang chậm tiến độ</li>
                  ) : (
                    <li className="text-xs font-semibold text-slate-400">Không có điểm nghẽn</li>
                  )}
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50">
                <span className="text-xs font-black text-emerald-600 block">3. Quyết định tuần</span>
                <span className="text-xs font-semibold text-slate-400 mt-0.5 block">Cập nhật sau họp tuần...</span>
              </div>
            </div>
          </div>

          {/* Control Settings Info */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-2.5 text-xs font-semibold text-slate-500">
            <h4 className="text-xs font-bold text-slate-750 block mb-1">Kiểm soát & Review</h4>
            <div className="flex items-center justify-between">
              <span>Người review</span>
              <span className="text-slate-800 font-bold">{weekPlan.reviewerName || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tần suất review</span>
              <span className="text-slate-800 font-bold">{REVIEW_FREQUENCY_LABELS[weekPlan.reviewFrequency] || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ngưỡng cảnh báo</span>
              <span className="text-amber-600 font-bold">≥ {weekPlan.alertThreshold}%</span>
            </div>
          </div>

          {/* Week rules */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-600">Luật tuần</h4>
            <div className="space-y-1.5">
              {[
                'Không quá 5 ưu tiên',
                'Ưu tiên phải đo được',
                'Phải kéo được doanh thu/biên/dòng tiền',
                'Việc chi tiết chuyển sang Công việc',
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
    </div>
  );
});

export default PlanWeekView;
