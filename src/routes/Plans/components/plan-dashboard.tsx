import React, { useMemo } from 'react';
import {
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  CalendarDays,
  Layers,
  LineChart,
  UserPlus,
  Percent,
  ShoppingCart,
  BarChart3,
  Wallet,
  Sun,
  Coffee,
  Moon,
  Calendar,
  Shield
} from 'lucide-react';
import { Button } from '../../../../share/ui/button';
import { MobileCard } from '@/src/components/custom/mobile-card';
import type { PlanDocument, PlanLiveIndicator } from '../../../types/plans.types';
import {
  PlanSummaryCard,
  PlanProgressRing,
  PlanAlertBanner
} from './plan-widgets';
import {
  formatCurrencyVN,
  getQuarterLabel,
  INDICATOR_STATUS_CONFIG,
  REVIEW_FREQUENCY_LABELS
} from '../plan-utils';
import { useQuarterSummary, usePlanAlerts } from '../_hooks/use-plan-metrics';

interface PlanDashboardProps {
  plans: PlanDocument[];
  indicators: PlanLiveIndicator[];
  onNavigateToMonth: () => void;
  onNavigateToWeek: () => void;
  onEditPlan: (plan: PlanDocument) => void;
}

// Map dynamic indicator icons based on indicator name
const getIndicatorIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes('doanh thu')) return { icon: LineChart, color: 'text-red-500 bg-red-50 border-red-100' };
  if (normalized.includes('lead')) return { icon: UserPlus, color: 'text-blue-500 bg-blue-50 border-blue-100' };
  if (normalized.includes('chốt') || normalized.includes('tỷ lệ') || normalized.includes('conversion') || normalized.includes('tỉ lệ')) {
    return { icon: Percent, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
  }
  if (normalized.includes('aov') || normalized.includes('giá trị') || normalized.includes('đơn hàng')) {
    return { icon: ShoppingCart, color: 'text-purple-500 bg-purple-50 border-purple-100' };
  }
  if (normalized.includes('biên') || normalized.includes('lợi nhuận') || normalized.includes('margin') || normalized.includes('biên gộp')) {
    return { icon: BarChart3, color: 'text-cyan-500 bg-cyan-50 border-cyan-100' };
  }
  if (normalized.includes('dòng tiền') || normalized.includes('cash') || normalized.includes('tiền')) {
    return { icon: Wallet, color: 'text-sky-500 bg-sky-50 border-sky-100' };
  }
  return { icon: Target, color: 'text-slate-500 bg-slate-50 border-slate-100' };
};

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
  onEditPlan,
}: PlanDashboardProps) {
  const summary = useQuarterSummary(plans);
  const activePlan = useMemo(
    () => plans.find((p) => p.level === 'quarter' && p.status === 'active') ?? plans.find((p) => p.level === 'quarter'),
    [plans]
  );
  const alerts = usePlanAlerts(activePlan ?? null);

  const quarterLabel = activePlan ? getQuarterLabel(activePlan.startDate) : '—';

  const battleTargets = useMemo(() => {
    if (activePlan?.battleTargets?.length) {
      return activePlan.battleTargets;
    }
    return [
      'Doanh thu & dòng tiền: Tăng trưởng doanh thu – đảm bảo dòng tiền khỏe',
      'SOP & KPI vận hành: Chuẩn hóa quy trình – đo lường – tối ưu hiệu suất',
      'Văn hóa & đội ngũ: Xây dựng văn hóa kỷ luật – phát triển đội ngũ chủ động'
    ];
  }, [activePlan]);

  return (
    <div className="space-y-4 text-slate-700">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PlanSummaryCard icon={Target} label={`Mục tiêu phê duyệt ${quarterLabel}`}>
          {activePlan?.revenueTarget ? (
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-slate-550">Doanh thu</span>
                <span className="text-xl font-black text-slate-800">{formatCurrencyVN(activePlan.revenueTarget)}</span>
              </div>
              {activePlan.profitMarginTarget != null && activePlan.profitMarginTarget > 0 && (
                <div className="text-sm font-semibold text-slate-500">
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
                  <span className="w-4 h-4 rounded bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-600 line-clamp-1">{point}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-sm font-semibold text-slate-400 italic block mt-1">➔ Hãy thiết lập các đòn bẩy cốt lõi trong kế hoạch Quý</span>
          )}
        </PlanSummaryCard>

        <PlanAlertBanner alerts={alerts} />
      </div>

      {/* Main Grid: Left side (Pipeline & Table), Right side (Rhythms & Battles) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Left Column */}
        <div className="space-y-4 min-w-0">
          {/* Execution Pipeline */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5">
            <h4 className="text-sm font-black text-slate-700 mb-4">Bản đồ thực thi đơn giản</h4>
            <div className="flex items-center justify-between w-full gap-1 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {[
                { 
                  num: 1, 
                  label: 'Mục tiêu Q3', 
                  icon: Target, 
                  desc: 'Dịch đến 3 tháng rõ ràng & đo được',
                  iconColor: 'text-[#C21A1A]',
                  iconBg: 'bg-red-50/60 border-red-100/60',
                  hoverClass: 'hover:border-red-300 hover:shadow-[0_10px_30px_rgba(194,26,26,0.06)]'
                },
                { 
                  num: 2, 
                  label: 'Mục tiêu tháng', 
                  icon: CalendarDays, 
                  desc: 'Chia nhỏ theo từng tháng để đạt Q3',
                  iconColor: 'text-blue-600',
                  iconBg: 'bg-blue-50/60 border-blue-100/60',
                  hoverClass: 'hover:border-blue-300 hover:shadow-[0_10px_30px_rgba(37,99,235,0.06)]'
                },
                { 
                  num: 3, 
                  label: 'Ưu tiên tuần', 
                  icon: Layers, 
                  desc: '3-5 ưu tiên quan trọng tạo tác động lớn',
                  iconColor: 'text-amber-600',
                  iconBg: 'bg-amber-50/60 border-amber-100/60',
                  hoverClass: 'hover:border-amber-300 hover:shadow-[0_10px_30px_rgba(217,119,6,0.06)]'
                },
                { 
                  num: 4, 
                  label: 'MIT hôm nay', 
                  icon: CheckCircle2, 
                  desc: '1-3 việc quan trọng nhất phải hoàn thành hôm nay',
                  iconColor: 'text-violet-600',
                  iconBg: 'bg-violet-50/60 border-violet-100/60',
                  hoverClass: 'hover:border-violet-300 hover:shadow-[0_10px_30px_rgba(124,58,237,0.06)]'
                },
                { 
                  num: 5, 
                  label: 'Kết quả & review', 
                  icon: TrendingUp, 
                  desc: 'Đo kết quả, rút kinh nghiệm cải tiến liên tục',
                  iconColor: 'text-emerald-600',
                  iconBg: 'bg-emerald-50/60 border-emerald-100/60',
                  hoverClass: 'hover:border-emerald-300 hover:shadow-[0_10px_30px_rgba(16,185,129,0.06)]'
                },
              ].map((step, idx) => (
                <React.Fragment key={step.num}>
                  <div className={`flex-1 flex flex-col items-center text-center bg-white border border-slate-200 rounded-2xl p-4 min-w-[130px] max-w-[190px] shadow-3xs transition-all duration-300 cursor-default ${step.hoverClass}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 border ${step.iconBg} ${step.iconColor}`}>
                      <step.icon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">{step.label}</span>
                    <span className="text-[11px] font-medium text-slate-400 mt-1 block leading-normal">{step.desc}</span>
                  </div>
                  {idx < 4 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 mx-1 animate-pulse" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Live Indicators Table */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5">
            <h4 className="text-sm font-black text-slate-700 mb-4">Chỉ số sống còn phải nhìn mỗi ngày</h4>
            {indicators.length > 0 ? (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left table-fixed min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-xs font-bold text-slate-455 py-2.5 px-2 w-[32%]">Chỉ số</th>
                        <th className="text-xs font-bold text-slate-455 py-2.5 px-2 w-[22%]">Mục tiêu Q3</th>
                        <th className="text-xs font-bold text-slate-455 py-2.5 px-2 w-[16%]">Hôm nay</th>
                        <th className="text-xs font-bold text-slate-455 py-2.5 px-2 w-[15%]">Trạng thái</th>
                        <th className="text-xs font-bold text-slate-455 py-2.5 px-2 w-[15%]">Chủ sở hữu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicators.map((ind) => {
                        const statusConfig = INDICATOR_STATUS_CONFIG[ind.status];
                        const { icon: IndicatorIcon, color: iconStyle } = getIndicatorIcon(ind.name);
                        const isBelowTarget = ind.status === 'below_target';
                        return (
                          <tr key={ind.id} className="border-b border-slate-50 hover:bg-slate-50/10">
                            <td className="py-3 px-2 text-sm font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${iconStyle}`}>
                                  <IndicatorIcon className="w-4 h-4" />
                                </div>
                                <span className="truncate">{ind.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-sm font-semibold text-slate-500">
                              ≥ {ind.targetValue} {ind.unit}
                            </td>
                            <td className={`py-3 px-2 text-sm font-bold ${isBelowTarget ? 'text-red-500' : 'text-slate-800'}`}>
                              {ind.currentValue} {ind.unit}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${statusConfig.bgColor} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 overflow-hidden">
                                  {ind.ownerName?.charAt(0)}
                                </div>
                                <span className="text-xs font-semibold text-slate-655 truncate">{ind.ownerName}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3">
                  {indicators.map((ind, idx) => {
                    const statusConfig = INDICATOR_STATUS_CONFIG[ind.status];
                    const { icon: IndicatorIcon, color: iconStyle } = getIndicatorIcon(ind.name);
                    const isBelowTarget = ind.status === 'below_target';

                    return (
                      <MobileCard key={ind.id} delayIndex={idx} variant="bordered">
                        <MobileCard.Header
                          title={ind.name}
                          avatar={
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconStyle}`}>
                              <IndicatorIcon className="w-4.5 h-4.5" />
                            </div>
                          }
                          badge={{
                            text: statusConfig.label,
                            variant: ind.status === 'above_target' ? 'success' : ind.status === 'below_target' ? 'error' : 'warning'
                          }}
                        />
                        <MobileCard.Body className="p-3">
                          <MobileCard.Grid
                            cols={2}
                            items={[
                              {
                                label: 'Mục tiêu Q3',
                                value: `≥ ${ind.targetValue} ${ind.unit}`,
                              },
                              {
                                label: 'Hôm nay',
                                value: `${ind.currentValue} ${ind.unit}`,
                                valueClassName: isBelowTarget ? 'text-red-500' : 'text-slate-900 dark:text-slate-150',
                              },
                              {
                                label: 'Chủ sở hữu',
                                value: (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                      {ind.ownerName?.charAt(0)}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{ind.ownerName}</span>
                                  </div>
                                ),
                                fullWidth: true,
                              }
                            ]}
                          />
                        </MobileCard.Body>
                      </MobileCard>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-sm font-semibold text-slate-350">
                Chưa có chỉ số nào. Thêm chỉ số sống để theo dõi hàng ngày.
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Review rhythm */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-slate-400" />
              Nhịp điều hành 20/80
            </h4>
            <div className="space-y-3">
              {[
                { time: 'Sáng (8:00 – 9:00)', desc: 'Xem số liệu quan trọng – nắm bức tranh', icon: Sun, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                { time: 'Trưa (12:30 – 13:00)', desc: 'Bám việc trong tâm – gỡ vướng nhanh', icon: Coffee, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                { time: '21h (21:00 – 21:30)', desc: 'Review kết quả ngày – chuẩn bị cho mai', icon: Moon, color: 'text-blue-500 bg-blue-50 border-blue-100' },
                { time: 'Cuối tuần (Thứ 7 – CN)', desc: 'Chốt 3 việc quan trọng trong tuần tới', icon: Calendar, color: 'text-purple-500 bg-purple-50 border-purple-100' },
              ].map((rhythm) => {
                const RhythmIcon = rhythm.icon;
                return (
                  <div key={rhythm.time} className="flex items-start gap-3 p-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${rhythm.color}`}>
                      <RhythmIcon className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block leading-tight">{rhythm.time}</span>
                      <span className="text-xs font-medium text-slate-455 mt-1 block leading-normal">{rhythm.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quarter Review & Control Details */}
          {activePlan && (
            <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C21A1A]" />
                Nhịp Review & Kiểm soát
              </h4>
              <div className="space-y-2.5 text-sm font-semibold text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Tần suất review</span>
                  <span className="text-slate-800 font-bold">{REVIEW_FREQUENCY_LABELS[activePlan.reviewFrequency] || 'Hàng tuần'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Người review</span>
                  <span className="text-slate-800 font-bold">{activePlan.reviewerName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ngưỡng cảnh báo</span>
                  <span className="text-amber-600 font-bold">≥ {activePlan.alertThreshold}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hành động lệch</span>
                  <span className="text-slate-800 font-bold">
                    {activePlan.deviationAction === 'adjust_plan' ? 'Họp điều chỉnh' : 
                     activePlan.deviationAction === 'escalate' ? 'Báo cáo cấp trên' : 'Hành động khác'}
                  </span>
                </div>
                {activePlan.description && (
                  <div className="pt-2 border-t border-slate-100">
                     <span className="text-xs text-slate-400 block mb-1">Mô tả cốt lõi</span>
                     <span className="text-xs text-slate-600 font-semibold block leading-relaxed">{activePlan.description}</span>
                  </div>
                )}
                {/* Linked Modules */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 block">Các module liên kết</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {activePlan.linkedModules && Object.entries(activePlan.linkedModules)
                      .filter(([, active]) => active)
                      .map(([key]) => (
                        <span key={key} className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                          {key === 'checklist' ? 'Checklist' : key === 'tasks' ? 'Công việc' : key === 'kpi' ? 'KPI' : 'Báo cáo'}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Battle targets */}
          <div className="border border-slate-100/80 shadow-2xs bg-white rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Target className="w-4.5 h-4.5 text-[#C21A1A]" />
              3 trận đánh {quarterLabel !== '—' ? quarterLabel : 'Q3'}
            </h4>
            <div className="space-y-3">
              {battleTargets.slice(0, 3).map((target, i) => {
                const parts = target.split(/[:–-]/);
                const title = parts[0]?.trim();
                const desc = parts.slice(1).join('–').trim();

                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 border border-white shadow-3xs mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-slate-850 block leading-tight">{title}</span>
                      {desc && <span className="text-xs font-medium text-slate-400 mt-1 block leading-normal">{desc}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

export default PlanDashboard;
