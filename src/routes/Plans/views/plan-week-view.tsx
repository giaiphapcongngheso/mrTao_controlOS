import React from 'react';
import { Star, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../../../share/ui/card';
import type { PlanDocument } from '../../../types/plans.types';
import PlanSummaryCard from '../shared/plan-summary-card';
import PriorityTable from '../shared/priority-table';
import { useWeekSummary } from '../_hooks/use-plan-metrics';
import { formatCurrencyVN } from '../constants/plan-utils';
import { WEEK_DAYS } from '../constants/plan-constants';

interface PlanWeekViewProps {
  plans: PlanDocument[];
}

/**
 * Weekly plan view (20/80) — priority table, day grid, meeting sidebar.
 * Matches mockup Screen 5.
 * Standardized with shared Card components and increased text sizes.
 */
const PlanWeekView = React.memo(function PlanWeekView({ plans }: PlanWeekViewProps) {
  const { weekPlan, priorityCount, behindCount, commitPercentage } = useWeekSummary(plans);

  if (!weekPlan) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-bold text-slate-400">Chưa có kế hoạch tuần. Hãy tạo kế hoạch tuần mới.</p>
      </div>
    );
  }

  const priorities = weekPlan.priorities ?? [];

  return (
    <div className="space-y-4 text-slate-700">
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
          <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
            <CardContent className="px-4 p-0">
              <h4 className="text-sm font-black text-slate-700 mb-3">Bảng ưu tiên tuần</h4>
              <PriorityTable priorities={priorities} showLinkedTasks />
            </CardContent>
          </Card>

          {/* Week day grid */}
          <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
            <CardContent className="px-4 p-0">
              <h4 className="text-sm font-black text-slate-700 mb-3">Kế hoạch theo ngày trong tuần</h4>
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
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Meeting 20/80 */}
          <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
            <CardContent className="px-4 p-0 space-y-3">
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
            </CardContent>
          </Card>

          {/* Week rules */}
          <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
            <CardContent className="px-4 p-0 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-600">Luật tuần</h4>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default PlanWeekView;
