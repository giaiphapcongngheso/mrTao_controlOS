import React, { useState, useMemo, useCallback } from 'react';
import { Award, Coins, Percent, User } from 'lucide-react';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import type { KPIConfig, KPIDailyValue, StaffRank, KPIStaffMonthlyConfig } from '../../../types/kpi.types';
import { Card, CardContent } from '../../../../share/ui/card';
import { StaffDetailCard } from '../components/_staff-detail-card';
import { LeaderboardTable } from '../components/_leaderboard-table';
import { KpiSparklineChart } from '../components/_kpi-sparkline-chart';
import { KpiOverviewChart } from '../components/_kpi-overview-chart';
import { KpiClassificationPieChart } from '../components/_kpi-classification-pie-chart';
import { KpiLeaderboardTable } from '../components/_kpi-leaderboard-table';
import { cn } from '@shared/lib/utils';
import {
  calculateDynamicStaffRanks,
  calculatePeriodKpis,
  calculateRevenueStats,
  calculatePeriodMonths,
  getDaysInMonthCount,
  getPreviousMonthYear,
  translateClassification,
  getClassificationBadgeClass,
  type RanksTimeframe,
} from '../kpi-utils';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

interface RanksTabProps {
  roles: StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  monthlyConfigs: KPIStaffMonthlyConfig[];
  selectedMonthYear: string;
  onSaveMonthlyConfig: (config: KPIStaffMonthlyConfig) => Promise<any>;
}

export const RanksTab = React.memo(function RanksTab({
  roles,
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  monthlyConfigs,
  selectedMonthYear,
  onSaveMonthlyConfig,
}: RanksTabProps) {
  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffMembers.find(s => s.status === 'active')?.id || ''
  );
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');

  // Timeframe states
  const [ranksTimeframe, setRanksTimeframe] = useState<RanksTimeframe>('month');
  const [ranksQuarter, setRanksQuarter] = useState<number>(() => {
    const m = new Date().getMonth() + 1;
    return Math.ceil(m / 3);
  });
  const [ranksYear, setRanksYear] = useState<number>(2026);
  const [ranksMonth, setRanksMonth] = useState<string>(selectedMonthYear);

  // Chart state
  const [activeChartKpiId, setActiveChartKpiId] = useState<string>('');

  // Sync ranksMonth when parent month changes
  React.useEffect(() => {
    setRanksMonth(selectedMonthYear);
  }, [selectedMonthYear]);

  // Calculate period months
  const periodMonths = useMemo(
    () => calculatePeriodMonths(ranksTimeframe, ranksMonth, ranksQuarter, ranksYear),
    [ranksTimeframe, ranksMonth, ranksQuarter, ranksYear]
  );

  // Calculate ranks
  const dynamicRanks = useMemo(
    () => calculateDynamicStaffRanks(staffMembers, kpiConfigs, kpiDailyValues, periodMonths, roles, monthlyConfigs),
    [staffMembers, kpiConfigs, kpiDailyValues, periodMonths, roles, monthlyConfigs]
  );

  // Calculate average score, total payout sum, pass rate and top performer for overview
  const avgScore = useMemo(() => {
    if (dynamicRanks.length === 0) return 0;
    const sum = dynamicRanks.reduce((s, r) => s + r.score, 0);
    return Math.round(sum / dynamicRanks.length);
  }, [dynamicRanks]);

  const totalPayoutSum = useMemo(() => {
    return dynamicRanks.reduce((s, r) => s + (r.calculatedPayout ?? 0), 0);
  }, [dynamicRanks]);

  const passRate = useMemo(() => {
    if (dynamicRanks.length === 0) return 0;
    const passCount = dynamicRanks.filter(r => r.score >= 70).length;
    return Math.round((passCount / dynamicRanks.length) * 100);
  }, [dynamicRanks]);

  const topStaff = useMemo(() => {
    if (dynamicRanks.length === 0) return null;
    return dynamicRanks[0];
  }, [dynamicRanks]);

  // Selected staff
  const selectedStaff = useMemo(
    () => staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0],
    [staffMembers, selectedStaffId]
  );

  // Staff configs for current month (chart only)
  const staffConfigs = useMemo(() => {
    if (!selectedStaff) return [];
    return kpiConfigs.filter(c =>
      c.staffId === selectedStaff.id &&
      (c.month || '2026-06') === ranksMonth
    );
  }, [kpiConfigs, selectedStaff, ranksMonth]);

  // Set default active KPI for chart
  React.useEffect(() => {
    if (staffConfigs.length > 0) {
      if (!activeChartKpiId || !staffConfigs.some(c => c.id === activeChartKpiId)) {
        setActiveChartKpiId(staffConfigs[0].id);
      }
    } else {
      setActiveChartKpiId('');
    }
  }, [selectedStaffId, staffConfigs, activeChartKpiId]);

  // Period revenue stats
  const periodRevenueStats = useMemo(() => {
    if (!selectedStaff) return { totalTarget: 0, totalActual: 0, pct: 0, hasRevenue: false };
    return calculateRevenueStats(selectedStaff.id, kpiConfigs, kpiDailyValues, periodMonths);
  }, [kpiConfigs, kpiDailyValues, selectedStaff, periodMonths]);

  // Previous period months (for growth calculation)
  const prevPeriodMonths = useMemo(() => {
    if (ranksTimeframe === 'month') {
      return [getPreviousMonthYear(ranksMonth)];
    } else if (ranksTimeframe === 'quarter') {
      const prevQ = ranksQuarter === 1 ? 4 : ranksQuarter - 1;
      const prevY = ranksQuarter === 1 ? ranksYear - 1 : ranksYear;
      return calculatePeriodMonths('quarter', ranksMonth, prevQ, prevY);
    } else {
      // year
      return calculatePeriodMonths('year', ranksMonth, ranksQuarter, ranksYear - 1);
    }
  }, [ranksTimeframe, ranksMonth, ranksQuarter, ranksYear]);

  // Previous period revenue stats
  const prevRevenueStats = useMemo(() => {
    if (!selectedStaff) return { totalTarget: 0, totalActual: 0, pct: 0, hasRevenue: false };
    return calculateRevenueStats(selectedStaff.id, kpiConfigs, kpiDailyValues, prevPeriodMonths);
  }, [kpiConfigs, kpiDailyValues, selectedStaff, prevPeriodMonths]);

  // Revenue growth calculation
  const revenueGrowth = useMemo(() => {
    const current = periodRevenueStats.totalActual;
    const prev = prevRevenueStats.totalActual;

    let label = '';
    if (ranksTimeframe === 'month') {
      const prevMStr = prevPeriodMonths[0];
      label = `T${prevMStr.split('-')[1]}/${prevMStr.split('-')[0]}`;
    } else if (ranksTimeframe === 'quarter') {
      const prevQ = ranksQuarter === 1 ? 4 : ranksQuarter - 1;
      const prevY = ranksQuarter === 1 ? ranksYear - 1 : ranksYear;
      label = `Quý ${prevQ}/${prevY}`;
    } else {
      label = `Năm ${ranksYear - 1}`;
    }

    if (prev <= 0) {
      return { pct: 0, isGrow: true, label };
    }

    const diff = current - prev;
    const pct = (diff / prev) * 100;

    return {
      pct: Math.abs(pct),
      isGrow: diff >= 0,
      label,
    };
  }, [periodRevenueStats.totalActual, prevRevenueStats.totalActual, ranksTimeframe, prevPeriodMonths, ranksQuarter, ranksYear]);

  // Period KPIs
  const periodKpis = useMemo(() => {
    if (!selectedStaff) return [];
    return calculatePeriodKpis(selectedStaff.id, kpiConfigs, kpiDailyValues, periodMonths);
  }, [kpiConfigs, kpiDailyValues, selectedStaff, periodMonths]);

  // Period label
  const periodLabel = useMemo(() => {
    if (ranksTimeframe === 'month') return `Tháng ${ranksMonth.split('-')[1]}/${ranksMonth.split('-')[0]}`;
    if (ranksTimeframe === 'quarter') return `Quý ${ranksQuarter}/${ranksYear}`;
    return `Năm ${ranksYear}`;
  }, [ranksTimeframe, ranksMonth, ranksQuarter, ranksYear]);

  // Callbacks
  const handleSelectStaff = useCallback((id: string) => setSelectedStaffId(id), []);
  const handleTimeframeChange = useCallback((tf: RanksTimeframe) => setRanksTimeframe(tf), []);
  const handleMonthChange = useCallback((m: string) => setRanksMonth(m), []);
  const handleQuarterChange = useCallback((q: number) => setRanksQuarter(q), []);
  const handleYearChange = useCallback((y: number) => setRanksYear(y), []);
  const handleChartKpiChange = useCallback((id: string) => setActiveChartKpiId(id), []);
  const handleViewModeChange = useCallback((mode: 'overview' | 'detail') => setViewMode(mode), []);

  const score = dynamicRanks.find(r => r.staffId === selectedStaff?.id)?.score || 0;
  const daysInMonthCount = getDaysInMonthCount(ranksMonth);

  return (
    <div className="space-y-4">
      {/* 📊 Segmented View Mode Switcher */}
      <div className="flex items-center gap-1 bg-slate-100/85 p-1 rounded-xl w-max border border-slate-200/50 font-sans">
        <button
          type="button"
          onClick={() => setViewMode('overview')}
          className={cn(
            'px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer select-none active:scale-95',
            viewMode === 'overview'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200/10'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Tổng quan cửa hàng
        </button>
        <button
          type="button"
          onClick={() => setViewMode('detail')}
          className={cn(
            'px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer select-none active:scale-95',
            viewMode === 'detail'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200/10'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          Chi tiết nhân sự
        </button>
      </div>

      {/* 2. Overview Mode */}
      {viewMode === 'overview' ? (
        <div className="space-y-4 animate-fade-in font-sans">
          {/* Bento Grid Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Điểm KPI trung bình */}
            <Card className="p-1 rounded-2xl border border-slate-200/85 bg-white shadow-3xs relative overflow-hidden group">
              <CardContent className="p-2.5 xs:p-3 md:p-3.5 flex items-center justify-between gap-2.5 w-full min-w-0">
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">KPI trung bình</span>
                  <div className="text-base xs:text-lg font-bold text-slate-800 leading-none mt-2">
                    {avgScore} điểm
                  </div>
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold mt-2.5 border border-solid leading-none',
                    avgScore >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    avgScore >= 70 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                  )}>
                    {avgScore >= 90 ? 'Xuất sắc' : avgScore >= 80 ? 'Tốt' : avgScore >= 70 ? 'Khá' : 'Cần cải thiện'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500 shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Award className="h-4.5 w-4.5 md:h-5 md:w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Quỹ thưởng chi trả */}
            <Card className="p-1 rounded-2xl border border-slate-200/85 bg-white shadow-3xs relative overflow-hidden group">
              <CardContent className="p-2.5 xs:p-3 md:p-3.5 flex items-center justify-between gap-2.5 w-full min-w-0">
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">Quỹ lương KPI</span>
                  <div className="text-base xs:text-lg font-bold text-emerald-600 leading-none mt-2 truncate">
                    {CURRENCY_FORMATTER.format(totalPayoutSum)}
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mt-3.5 leading-none">
                    Tổng chi trả thực tế
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500 shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Coins className="h-4.5 w-4.5 md:h-5 md:w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Tỷ lệ đạt KPI */}
            <Card className="p-1 rounded-2xl border border-slate-200/85 bg-white shadow-3xs relative overflow-hidden group">
              <CardContent className="p-2.5 xs:p-3 md:p-3.5 flex items-center justify-between gap-2.5 w-full min-w-0">
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">Tỷ lệ đạt KPI</span>
                  <div className="text-base xs:text-lg font-bold text-blue-600 leading-none mt-2">
                    {passRate}%
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mt-3.5 leading-none">
                    Đạt từ 70 điểm trở lên
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-500 shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Percent className="h-4.5 w-4.5 md:h-5 md:w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Ngôi sao sáng */}
            <Card className="p-1 rounded-2xl border border-slate-200/85 bg-white shadow-3xs relative overflow-hidden group">
              <CardContent className="p-2.5 xs:p-3 md:p-3.5 flex items-center justify-between gap-2.5 w-full min-w-0">
                <div className="min-w-0 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">Top 1 nhân sự</span>
                  <div className="text-xs xs:text-sm font-bold text-slate-800 leading-none mt-2.5 truncate max-w-[80px] sm:max-w-[120px] lg:max-w-[145px]">
                    {topStaff ? topStaff.name : 'Chưa có'}
                  </div>
                  <span className="inline-flex items-center gap-0.5 mt-2.5 text-[9.5px] font-black text-[#C21A1A] leading-none">
                    🔥 {topStaff ? `${topStaff.score}đ` : '0đ'}
                  </span>
                </div>
                {topStaff?.avatar ? (
                  <img
                    src={topStaff.avatar}
                    alt={topStaff.name}
                    className="w-9 h-9 xs:w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500 shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <User className="h-4.5 w-4.5 md:h-5 md:w-5" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid: Bar Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left: Bar Chart (Comparison) */}
            <div className="lg:col-span-7">
              <KpiOverviewChart
                ranks={dynamicRanks}
                roles={roles}
                avgScore={avgScore}
                totalPayoutSum={totalPayoutSum}
                onSelectStaff={handleSelectStaff}
                onViewModeChange={handleViewModeChange}
              />
            </div>
            {/* Right: Pie Chart (Classification) */}
            <div className="lg:col-span-5">
              <KpiClassificationPieChart
                ranks={dynamicRanks}
              />
            </div>
          </div>

          {/* Leaderboard Table & Mobile Cards */}
          <KpiLeaderboardTable
            ranks={dynamicRanks}
            roles={roles}
            selectedStaffId={selectedStaffId}
            onSelectStaff={handleSelectStaff}
            onViewModeChange={handleViewModeChange}
            periodLabel={periodLabel}
          />
        </div>
      ) : (
        /* Detail Mode: Split screen layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-fade-in">
          {/* Left: Leaderboard */}
          <div className="lg:col-span-5">
            <LeaderboardTable
              roles={roles}
              ranks={dynamicRanks}
              selectedStaffId={selectedStaffId}
              onSelectStaff={handleSelectStaff}
              periodLabel={periodLabel}
              ranksTimeframe={ranksTimeframe}
              onTimeframeChange={handleTimeframeChange}
              ranksMonth={ranksMonth}
              onRanksMonthChange={handleMonthChange}
              ranksQuarter={ranksQuarter}
              onRanksQuarterChange={handleQuarterChange}
              ranksYear={ranksYear}
              onRanksYearChange={handleYearChange}
            />
          </div>

          {/* Right: Staff detail */}
          <div className="lg:col-span-7">
            {selectedStaff && (
              <Card className="p-5 md:p-6 space-y-2">
                <StaffDetailCard
                  roles={roles}
                  staff={selectedStaff}
                  score={score}
                  ranksTimeframe={ranksTimeframe}
                  periodRevenueStats={periodRevenueStats}
                  periodKpis={periodKpis}
                  ranksMonth={ranksMonth}
                  ranksQuarter={ranksQuarter}
                  ranksYear={ranksYear}
                  revenueGrowth={revenueGrowth}
                  monthlyConfigs={monthlyConfigs}
                  onSaveMonthlyConfig={onSaveMonthlyConfig}
                />

                {/* Sparkline chart (month view only) */}
                {ranksTimeframe === 'month' && staffConfigs.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <KpiSparklineChart
                      staffId={selectedStaff.id}
                      configs={staffConfigs}
                      activeChartKpiId={activeChartKpiId}
                      onActiveKpiChange={handleChartKpiChange}
                      ranksMonth={ranksMonth}
                      daysInMonthCount={daysInMonthCount}
                      kpiDailyValues={kpiDailyValues}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
