import React, { useMemo } from 'react';
import { ArrowLeft, Target, Star, CalendarRange, Clock, User, Shield, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '../../../../share/ui/button';
import { Card, CardContent } from '../../../../share/ui/card';
import type { PlanDocument, PlanDaySchedule } from '../../../types/plans.types';
import { 
  PlanSummaryCard, 
  PlanProgressRing, 
  PlanStatusBadge, 
  PriorityTable, 
  DaySlotStatusBadge 
} from './plan-widgets';
import { 
  formatCurrencyVN, 
  formatDateVN, 
  PLAN_LEVEL_LABELS, 
  REVIEW_FREQUENCY_LABELS 
} from '../plan-utils';

interface PlanDetailProps {
  plan: PlanDocument;
  daySchedule?: PlanDaySchedule | null;
  onBack: () => void;
  onEdit: () => void;
}

export default function PlanDetail({
  plan,
  daySchedule = null,
  onBack,
  onEdit,
}: PlanDetailProps) {
  const isDayLevel = plan.level === 'day';
  const priorities = plan.priorities ?? [];

  // Determine alert thresholds
  const isOverdueAlert = useMemo(() => {
    if (isDayLevel) return false;
    return priorities.some((p) => p.status !== 'completed' && new Date(p.deadline) < new Date());
  }, [priorities, isDayLevel]);

  return (
    <div className="space-y-6 text-slate-700">
      {/* ─── Header & Top Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="w-9 h-9 p-0 rounded-xl bg-white border-slate-200 hover:bg-slate-50 shrink-0 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{plan.name}</h1>
              <PlanStatusBadge status={plan.status} size="md" />
            </div>
            <span className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" />
              Cấp độ: {PLAN_LEVEL_LABELS[plan.level]} • Thời gian: {formatDateVN(plan.startDate)}
              {plan.endDate !== plan.startDate && ` – ${formatDateVN(plan.endDate)}`}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 px-4 h-9.5 text-xs font-bold text-white bg-[#C21A1A] rounded-xl hover:bg-[#a51616] transition-colors shadow-sm self-start sm:self-auto cursor-pointer shrink-0"
        >
          Chỉnh sửa kế hoạch
        </Button>
      </div>

      {/* ─── Top Level Metric Summary Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu / MIT Count */}
        <PlanSummaryCard 
          icon={Target} 
          label={isDayLevel ? "Số khung giờ hôm nay" : "Mục tiêu doanh thu"} 
          value={
            isDayLevel 
              ? `${daySchedule?.timeSlots?.length ?? 0} khung giờ`
              : (plan.revenueTarget ? formatCurrencyVN(plan.revenueTarget) : 'Chưa thiết lập')
          }
        >
          {!isDayLevel && plan.profitMarginTarget != null && plan.profitMarginTarget > 0 && (
            <div className="text-xs font-bold text-emerald-600 mt-1">
              LN ròng dự kiến: {formatCurrencyVN((plan.revenueTarget ?? 0) * plan.profitMarginTarget / 100)} ({plan.profitMarginTarget}%)
            </div>
          )}
        </PlanSummaryCard>

        {/* Tiến độ tổng thể */}
        <PlanSummaryCard 
          icon={Star} 
          iconBg="bg-blue-50" 
          iconColor="text-blue-500" 
          label="Tiến độ thực tế"
        >
          <div className="flex items-center">
            <PlanProgressRing 
              value={plan.progress} 
              size={56} 
              strokeWidth={4.5} 
              label={`${plan.progress}% hoàn thành`}
              subLabel={isDayLevel ? "Các khung giờ chuẩn" : `Tổng số ${priorities.length} mục ưu tiên`}
            />
          </div>
        </PlanSummaryCard>

        {/* Owner */}
        <PlanSummaryCard 
          icon={User} 
          iconBg="bg-amber-50" 
          iconColor="text-amber-500" 
          label="Người chịu trách nhiệm (Owner)"
          value={plan.ownerName || '—'}
        >
          <span className="text-xs font-semibold text-slate-400">Chịu trách nhiệm chính điều phối thực thi</span>
        </PlanSummaryCard>

        {/* Reviewer / Warnings */}
        {isOverdueAlert ? (
          <Card className="border border-red-100 bg-red-50/20 shadow-2xs flex flex-col gap-2 min-w-0 p-0 overflow-hidden rounded-2xl py-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
            <CardContent className="flex flex-col gap-2.5 p-0 px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                </div>
                <h4 className="text-xs font-black text-slate-700 leading-tight">Cảnh báo chậm tiến độ</h4>
              </div>
              <p className="text-xs font-bold text-red-600 leading-relaxed">
                Có mục ưu tiên đã quá hạn chốt (deadline) nhưng chưa hoàn thành!
              </p>
            </CardContent>
          </Card>
        ) : (
          <PlanSummaryCard 
            icon={Shield} 
            iconBg="bg-violet-50" 
            iconColor="text-violet-500" 
            label="Người giám sát (Reviewer)"
            value={plan.reviewerName || '—'}
          >
            <span className="text-xs font-bold text-slate-500">
              Nhịp review: {REVIEW_FREQUENCY_LABELS[plan.reviewFrequency] || 'Hàng tuần'}
            </span>
          </PlanSummaryCard>
        )}
      </div>

      {/* ─── Detail Sections ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Left Column: Priorities / Day Schedule */}
        <div className="space-y-6 min-w-0">
          
          {/* Mô tả cốt lõi */}
          {plan.description && (
            <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs">
              <h3 className="text-sm font-black text-slate-800 mb-2">Mô tả mục tiêu cốt lõi</h3>
              <p className="text-sm font-semibold text-slate-550 leading-relaxed whitespace-pre-line">
                {plan.description}
              </p>
            </Card>
          )}

          {/* Nếu là cấp độ QUÝ: Đòn bẩy & Trận đánh */}
          {plan.level === 'quarter' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 3 Đòn bẩy 20/80 */}
              <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  3 đòn bẩy 20/80
                </h3>
                {plan.leveragePoints?.length ? (
                  <ol className="space-y-3">
                    {plan.leveragePoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5.5 h-5.5 rounded bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-655 leading-normal">{point}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">Chưa thiết lập đòn bẩy.</p>
                )}
              </Card>

              {/* 3 Trận đánh lớn */}
              <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#C21A1A]" />
                  3 trận đánh lớn phải thắng
                </h3>
                {plan.battleTargets?.length ? (
                  <ol className="space-y-3">
                    {plan.battleTargets.map((target, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5.5 h-5.5 rounded bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-655 leading-normal">{target}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">Chưa thiết lập trận đánh lớn.</p>
                )}
              </Card>
            </div>
          )}

          {/* Bảng ưu tiên chính (Quarter, Month, Week) */}
          {!isDayLevel && (
            <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
              <h3 className="text-sm font-black text-slate-800">
                Danh sách {priorities.length} ưu tiên kế hoạch
              </h3>
              <PriorityTable priorities={priorities} showLinkedTasks />
            </Card>
          )}

          {/* Lịch làm việc & MIT (Cấp độ Ngày) */}
          {isDayLevel && (
            <div className="space-y-6">
              {/* Lịch khung giờ */}
              <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
                <h3 className="text-sm font-black text-slate-800">Kế hoạch theo khung giờ</h3>
                {daySchedule?.timeSlots?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left table-fixed min-w-[650px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[100px]">Thời gian</th>
                          <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[35%]">Nhiệm vụ</th>
                          <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[150px]">Người phụ trách</th>
                          <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[30%]">Kết quả kỳ vọng</th>
                          <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[120px]">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySchedule.timeSlots.map((slot) => (
                          <tr key={slot.id} className="border-b border-slate-50 hover:bg-slate-50/10">
                            <td className="py-3 px-2 align-middle">
                              <span className="text-sm font-black text-slate-800">{slot.time}</span>
                            </td>
                            <td className="py-3 px-2 align-middle">
                              <span className="text-sm font-bold text-slate-700 leading-snug block">{slot.task}</span>
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
                  <p className="text-sm font-semibold text-slate-450 italic py-6 text-center">
                    Không có khung giờ làm việc nào được cấu hình.
                  </p>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Settings, Rules, Linked Modules */}
        <div className="space-y-4">
          
          {/* Nhịp Review & Cảnh báo */}
          <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-violet-500" />
              Giám sát & Khắc phục
            </h3>
            <div className="space-y-3 text-sm font-semibold text-slate-500">
              <div className="flex items-center justify-between">
                <span>Tần suất review</span>
                <span className="text-slate-800 font-bold">
                  {REVIEW_FREQUENCY_LABELS[plan.reviewFrequency] || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Người review</span>
                <span className="text-slate-800 font-bold">{plan.reviewerName || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ngưỡng cảnh báo</span>
                <span className="text-amber-600 font-bold">≥ {plan.alertThreshold}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hành động lệch</span>
                <span className="text-slate-800 font-bold">
                  {plan.deviationAction === 'adjust_plan' ? 'Họp điều chỉnh' : 
                   plan.deviationAction === 'escalate' ? 'Báo cáo cấp trên' : 'Hành động khác'}
                </span>
              </div>
            </div>
          </Card>

          {/* Nếu là cấp độ ngày: MIT & Ghi chú nhanh ở cột phải */}
          {isDayLevel && (
            <>
              {/* MIT */}
              <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
                <h3 className="text-sm font-black text-slate-800">MIT hôm nay</h3>
                {daySchedule?.mitTasks?.length ? (
                  <ol className="space-y-3">
                    {daySchedule.mitTasks.map((mit) => (
                      <li key={mit.id} className="flex items-start gap-2.5">
                        <span className="w-5.5 h-5.5 rounded bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {mit.order}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-slate-700 block leading-tight">{mit.title}</span>
                          {mit.description && (
                            <span className="text-xs font-semibold text-slate-400 mt-1 line-clamp-2 leading-relaxed block">
                              {mit.description}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs font-semibold text-slate-350 italic text-center py-4">
                    Không có MIT được cấu hình.
                  </p>
                )}
              </Card>

              {/* Ghi chú nhanh */}
              <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  Ghi chú nhanh
                </h3>
                {daySchedule?.quickNotes?.length ? (
                  <ul className="space-y-2">
                    {daySchedule.quickNotes.map((note, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-655 bg-amber-50/50 border border-amber-100/50 px-2.5 py-1.5 rounded-lg leading-normal">
                        {note}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-slate-350 italic text-center">Không có ghi chú nào.</p>
                )}
              </Card>
            </>
          )}

          {/* Module liên kết */}
          <Card className="border border-slate-100 bg-white rounded-2xl p-5 shadow-3xs space-y-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-slate-400" />
              Module liên kết
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {plan.linkedModules && Object.entries(plan.linkedModules)
                .filter(([, active]) => active)
                .map(([key]) => (
                  <span key={key} className="text-[10px] font-black uppercase px-2 py-0.8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/50">
                    {key === 'checklist' ? 'Checklist' : key === 'tasks' ? 'Công việc' : key === 'kpi' ? 'KPI' : 'Báo cáo'}
                  </span>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
