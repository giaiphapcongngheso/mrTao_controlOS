import React, { useMemo } from 'react';
import { Target, TrendingUp, Zap, AlertTriangle, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../../../share/ui/card';
import { Button } from '../../../../share/ui/button';
import type { PlanDocument, PlanLiveIndicator } from '../../../types/plans.types';
import PlanSummaryCard from '../shared/plan-summary-card';
import PlanProgressRing from '../shared/plan-progress-ring';
import PlanAlertBanner from '../shared/plan-alert-banner';
import { formatCurrencyVN, getQuarterLabel } from '../constants/plan-utils';
import { INDICATOR_STATUS_CONFIG } from '../constants/plan-constants';

interface PlanDashboardProps {
  plans: PlanDocument[];
  indicators: PlanLiveIndicator[];
  onNavigateToMonth: () => void;
  onNavigateToWeek: () => void;
}

/**
 * Dashboard Q3 view — main overview with metrics, pipeline, live indicators.
 * Matches mockup Screen 1.
 * Standardized with shared Card, Button, and larger font sizes.
 */
const PlanDashboard = React.memo(function PlanDashboard({
  plans,
  indicators,
  onNavigateToMonth,
  onNavigateToWeek,
}: PlanDashboardProps) {
  const summary = useQuarterSummary(plans);
  const activePlan = useMemo(
    () => plans.find((p) => p.level === 'quarter' && p.status === 'active') ?? plans.find((p) => p.level === 'quarter'),
    [plans]
  );
  const alerts = usePlanAlerts(activePlan ?? null);

  const quarterLabel = activePlan ? getQuarterLabel(activePlan.startDate) : '—';

  return (
    <div className="space-y-4 text-slate-700">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PlanSummaryCard icon={Target} label={`Mục tiêu phê duyệt ${quarterLabel}`}>
          {activePlan?.revenueTarget ? (
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-400">Doanh thu</span>
                <span className="text-lg font-black text-slate-800">{formatCurrencyVN(activePlan.revenueTarget)}</span>
              </div>
              {activePlan.profitMarginTarget != null && activePlan.profitMarginTarget > 0 && (
                <div className="text-xs font-semibold text-slate-400">
                  LN ròng tối thiểu <span className="text-emerald-600 font-bold">≥ {formatCurrencyVN(activePlan.revenueTarget * activePlan.profitMarginTarget / 100)}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-300">Chưa thiết lập</span>
          )}
        </PlanSummaryCard>

        <PlanSummaryCard icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-500" label={`Tiến độ ${summary.totalWeeks} tuần`}>
          <div className="flex items-center gap-3">
            <PlanProgressRing
              value={summary.overallProgress}
              size={64}
              strokeWidth={5}
              label={`${summary.totalWeeks} tuần`}
              subLabel={`Đã hoàn thành ${summary.elapsedWeeks} / ${summary.totalWeeks} tuần`}
            />
          </div>
        </PlanSummaryCard>

        <PlanSummaryCard icon={Zap} iconBg="bg-amber-50" iconColor="text-amber-500" label="3 đòn bẩy 20/80">
          {activePlan?.leveragePoints?.length ? (
            <ol className="space-y-1">
              {activePlan.leveragePoints.slice(0, 3).map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded bg-[#C21A1A] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-600 line-clamp-1">{point}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-xs font-semibold text-slate-300">Chưa thiết lập đòn bẩy</span>
          )}
        </PlanSummaryCard>

        <PlanAlertBanner alerts={alerts} />
      </div>

      {/* Execution Pipeline */}
      <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
        <CardContent className="px-4 p-0">
          <h4 className="text-sm font-black text-slate-700 mb-3">Bản đồ thực thi đơn giản</h4>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { num: 1, label: 'Mục tiêu Q', icon: Target, color: 'bg-red-50 text-[#C21A1A]' },
              { num: 2, label: 'Mục tiêu tháng', icon: Target, color: 'bg-blue-50 text-blue-500' },
              { num: 3, label: 'Ưu tiên tuần', icon: Zap, color: 'bg-amber-50 text-amber-500' },
              { num: 4, label: 'MIT hôm nay', icon: Clock, color: 'bg-violet-50 text-violet-500' },
              { num: 5, label: 'Kết quả & Review', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-500' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-black text-slate-400 block">{step.num}</span>
                    <span className="text-xs font-bold text-slate-600">{step.label}</span>
                  </div>
                </div>
                {idx < 4 && <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-[-12px]" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Live Indicators Table */}
        <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
          <CardContent className="px-4 p-0">
            <h4 className="text-sm font-black text-slate-700 mb-3">Chỉ số sống cần phải nhìn mỗi ngày</h4>
            {indicators.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[30%]">Chỉ số</th>
                      <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[20%]">Mục tiêu</th>
                      <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[20%]">Hiện tại</th>
                      <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[15%]">Trạng thái</th>
                      <th className="text-xs font-bold text-slate-400 uppercase py-2 px-2 w-[15%]">Chủ sở hữu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicators.map((ind) => {
                      const statusConfig = INDICATOR_STATUS_CONFIG[ind.status];
                      return (
                        <tr key={ind.id} className="border-b border-slate-50 hover:bg-slate-50/10">
                          <td className="py-2.5 px-2 text-sm font-bold text-slate-700 truncate">{ind.name}</td>
                          <td className="py-2.5 px-2 text-sm font-semibold text-slate-500">
                            ≥ {ind.targetValue} {ind.unit}
                          </td>
                          <td className="py-2.5 px-2 text-sm font-bold text-slate-800">
                            {ind.currentValue} {ind.unit}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${statusConfig.bgColor} ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                {ind.ownerName?.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-slate-500 truncate">{ind.ownerName}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm font-semibold text-slate-350">
                Chưa có chỉ số nào. Thêm chỉ số sống để theo dõi hàng ngày.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Review rhythm */}
          <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
            <CardContent className="px-4 p-0 space-y-2">
              <h4 className="text-sm font-black text-slate-700">Nhịp điều hành 20/80</h4>
              {[
                { time: 'Sáng (8:00 – 9:00)', desc: 'Xem số liệu quan trọng – nắm điểm cần ưu tiên' },
                { time: 'Trưa (12:30 – 13:00)', desc: 'Bám việc trong tâm – gỡ vướng nhanh' },
                { time: '21h (21:00 – 21:30)', desc: 'Review kết quả ngày – chuẩn bị cho mai' },
                { time: 'Cuối tuần (T7 – CN)', desc: 'Chốt 3 việc quan trọng trong tuần tới' },
              ].map((rhythm) => (
                <div key={rhythm.time} className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">{rhythm.time}</span>
                    <span className="text-xs font-medium text-slate-400 leading-snug block mt-0.5">{rhythm.desc}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Battle targets */}
          {activePlan?.battleTargets?.length ? (
            <Card className="border border-slate-100/80 p-0 shadow-2xs bg-white rounded-2xl py-4">
              <CardContent className="px-4 p-0 space-y-2">
                <h4 className="text-sm font-black text-slate-700">3 trận đánh {quarterLabel}</h4>
                {activePlan.battleTargets.slice(0, 3).map((target, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-sm font-semibold text-slate-600 leading-snug">{target}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Quick nav */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToMonth}
              className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50/50 hover:bg-slate-100 border border-slate-200 rounded-xl h-9"
            >
              ➔ Kế hoạch tháng
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateToWeek}
              className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50/50 hover:bg-slate-100 border border-slate-200 rounded-xl h-9"
            >
              ➔ Kế hoạch tuần
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Helper calculation functions from hooks
function useQuarterSummary(plans: PlanDocument[]) {
  return useMemo(() => {
    const qPlans = plans.filter((p) => p.level === 'quarter');
    const elapsedWeeks = 3; 
    const totalWeeks = 12;
    const overallProgress = qPlans.length > 0 ? Math.round(qPlans.reduce((sum, p) => sum + (p.progress || 0), 0) / qPlans.length) : 0;
    return { overallProgress, elapsedWeeks, totalWeeks };
  }, [plans]);
}

function usePlanAlerts(plan: PlanDocument | null) {
  return useMemo(() => {
    if (!plan) return [];
    const alerts: Array<{ type: 'warning' | 'danger'; message: string }> = [];
    if (plan.progress != null && plan.progress < 20) {
      alerts.push({
        type: 'warning',
        message: 'Tiến độ kế hoạch Quý hiện tại đang chậm hơn so với dự kiến. Cần tập trung hành động đòn bẩy.',
      });
    }
    return alerts;
  }, [plan]);
}

export default PlanDashboard;
