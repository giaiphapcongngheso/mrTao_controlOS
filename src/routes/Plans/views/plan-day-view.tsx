import React, { useMemo, useCallback } from 'react';
import { Zap, UserCheck, AlertTriangle, Link2, ArrowRight, StickyNote, Edit3, Clock } from 'lucide-react';
import type { PlanDocument, PlanDaySchedule } from '../../../types/plans.types';
import PlanSummaryCard from '../shared/plan-summary-card';
import { DaySlotStatusBadge } from '../shared/plan-status-badge';
import { filterPlansByLevel, formatCurrencyVN, formatDateVN } from '../constants/plan-utils';
import { Button } from '../../../../share/ui/button';

interface PlanDayViewProps {
  plans: PlanDocument[];
  daySchedules: PlanDaySchedule[];
  selectedDate?: string; // YYYY-MM-DD
  onEditPlan: (plan: PlanDocument) => void;
}

/**
 * Daily plan view — time-based schedule, MIT tasks, reminders, quick notes.
 * Matches mockup Screen 4.
 * Standardized with custom div containers and increased text sizes.
 */
const PlanDayView = React.memo(function PlanDayView({
  plans,
  daySchedules,
  selectedDate,
  onEditPlan,
}: PlanDayViewProps) {
  const today = selectedDate || new Date().toISOString().split('T')[0];

  const daySchedule = useMemo(
    () => daySchedules.find((s) => s.date === today),
    [daySchedules, today]
  );

  const dayPlan = useMemo(
    () => plans.find((p) => p.level === 'day' && p.startDate === today),
    [plans, today]
  );

  const weekPlan = useMemo(
    () => filterPlansByLevel(plans, 'week').find((p) => p.status === 'active') ?? filterPlansByLevel(plans, 'week')[0],
    [plans]
  );

  const timeSlots = daySchedule?.timeSlots ?? [];
  const mitTasks = daySchedule?.mitTasks ?? [];
  const quickNotes = daySchedule?.quickNotes ?? [];

  // Compute summary from slots
  const leverageCount = timeSlots.filter((s) => s.status === 'in_progress' || s.status === 'not_started').length;
  const followUpCount = timeSlots.filter((s) => s.status === 'pending_review').length;
  const atRiskCount = timeSlots.filter((s) => s.status === 'not_started').length;

  const handleEditClick = useCallback(() => {
    if (dayPlan) {
      onEditPlan(dayPlan);
    } else {
      // Create a draft day plan object for the wizard
      onEditPlan({
        name: `Kế hoạch Ngày ${formatDateVN(today)}`,
        level: 'day',
        startDate: today,
        endDate: today,
        ownerId: '',
        ownerName: '',
        priorities: [],
        reviewFrequency: 'daily',
        reviewerId: '',
        reviewerName: '',
        alertThreshold: 80,
        deviationAction: 'adjust_plan',
        linkedModules: { checklist: true, tasks: true, kpi: true, reports: true },
        status: 'draft',
        progress: 0,
        storeId: '',
        parentPlanId: weekPlan?.id ?? '',
      } as any);
    }
  }, [dayPlan, today, weekPlan, onEditPlan]);

  return (
    <div className="space-y-4 text-slate-700">
      {/* Header action panel */}
      <div className="flex items-center justify-between bg-white border border-slate-100/80 rounded-2xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#C21A1A]" />
          <div>
            <h3 className="text-sm font-black text-slate-800 leading-tight">
              {dayPlan ? dayPlan.name : `Kế hoạch Ngày ${formatDateVN(today)}`}
            </h3>
            {weekPlan && (
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1 mt-0.5">
                <Link2 className="w-3 h-3" /> Thuộc tuần: {weekPlan.name}
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleEditClick}
          className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 gap-1.5 h-8"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Chỉnh sửa lịch ngày
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PlanSummaryCard icon={Zap} label="việc đòn bẩy hôm nay" value={leverageCount || timeSlots.length || '—'}>
          <span className="text-xs font-semibold text-slate-400">Tập trung hoàn thành để tạo tác động lớn nhất</span>
        </PlanSummaryCard>
        <PlanSummaryCard icon={UserCheck} iconBg="bg-blue-50" iconColor="text-blue-500" label="việc phải follow-up" value={followUpCount || '—'}>
          <span className="text-xs font-semibold text-slate-400">Theo dõi để không bỏ sót và giữ cam kết</span>
        </PlanSummaryCard>
        <PlanSummaryCard icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-500" label="việc có nguy cơ trễ" value={atRiskCount || '—'}>
          <span className="text-xs font-semibold text-slate-400">Cần ưu tiên xử lý sớm để đảm bảo không ảnh hưởng</span>
        </PlanSummaryCard>
        <PlanSummaryCard icon={Link2} iconBg="bg-violet-50" iconColor="text-violet-500" label="Liên kết tuần"
          value={weekPlan?.revenueTarget ? formatCurrencyVN(weekPlan.revenueTarget) : '—'}
          subValue="Doanh thu mục tiêu tuần"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Main: Time-based schedule */}
        <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-700 mb-2">Kế hoạch theo khung giờ</h4>
          {timeSlots.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-fixed min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-xs font-bold text-slate-400 uppercase py-2.5 px-2 w-[100px]">Thời gian</th>
                    <th className="text-xs font-bold text-slate-400 uppercase py-2.5 px-2 w-[35%]">Việc cần làm</th>
                    <th className="text-xs font-bold text-slate-400 uppercase py-2.5 px-2 w-[150px]">Người phụ trách</th>
                    <th className="text-xs font-bold text-slate-400 uppercase py-2.5 px-2 w-[30%]">Kết quả kỳ vọng</th>
                    <th className="text-xs font-bold text-slate-400 uppercase py-2.5 px-2 w-[120px]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="border-b border-slate-50 hover:bg-slate-50/10">
                      <td className="py-3 px-2 align-middle">
                        <span className="text-sm font-black text-slate-800">{slot.time}</span>
                      </td>
                      <td className="py-3 px-2 align-middle">
                        <span className="text-sm font-bold text-slate-700 leading-snug block">{slot.task}</span>
                        {slot.linkedModules?.length ? (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {slot.linkedModules.map((mod) => (
                              <span key={mod} className="text-xs font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                {mod}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-2 align-middle">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                            {slot.assigneeName?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-semibold text-slate-500 truncate">{slot.assigneeName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 align-middle">
                        <span className="text-sm text-slate-500 line-clamp-2 leading-snug">{slot.expectedResult || '—'}</span>
                      </td>
                      <td className="py-3 px-2 align-middle">
                        <DaySlotStatusBadge status={slot.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-400">Chưa có lịch cho ngày này.</p>
              <p className="text-xs font-semibold text-slate-350">Nhấp "Chỉnh sửa lịch ngày" để thiết lập MIT và lịch theo khung giờ.</p>
            </div>
          )}

          {/* Quick target pipeline */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
            {[
              { label: 'Mục tiêu tuần', desc: weekPlan?.revenueTarget ? formatCurrencyVN(weekPlan.revenueTarget) : '—' },
              { label: 'MIT hôm nay', desc: `${mitTasks.length} việc đòn bẩy` },
              { label: 'Công việc thực thi', desc: 'Theo khung giờ' },
              { label: 'Review 21h', desc: 'Đánh giá & cải tiến' },
            ].map((item, idx) => (
              <React.Fragment key={item.label}>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 block leading-tight">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-455 mt-0.5 block">{item.desc}</span>
                  </div>
                </div>
                {idx < 3 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* MIT today */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700">MIT hôm nay</h4>
            {mitTasks.length > 0 ? (
              <ol className="space-y-2">
                {mitTasks.map((mit) => (
                  <li key={mit.id} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0">{mit.order}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-700 block leading-tight">{mit.title}</span>
                      <span className="text-xs font-semibold text-slate-400 mt-1 line-clamp-2 leading-relaxed block">{mit.description}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs font-semibold text-slate-350 py-4 text-center">
                Chưa có MIT. Hãy xác định 1-3 việc quan trọng nhất hôm nay.
              </p>
            )}
          </div>

          {/* Quick notes */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4 text-amber-500" />
              Ghi chú nhanh
            </h4>
            {quickNotes.length > 0 ? (
              <ul className="space-y-1">
                {quickNotes.map((note, i) => (
                  <li key={i} className="text-xs font-semibold text-slate-655 bg-amber-50/50 border border-amber-100/50 px-2.5 py-1.5 rounded-lg leading-normal">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-semibold text-slate-350">Ghi nhận ý tưởng, việc cần làm...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PlanDayView;
