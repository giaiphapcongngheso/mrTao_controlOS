import React, { useState, useMemo, useCallback } from 'react';
import type { StaffMember } from '../../../types/staff.types';
import type { KPIConfig, KPIDailyValue, StaffRank } from '../../../types/kpi.types';
import { LeaderboardTable } from '../components/_leaderboard-table';
import { StaffDetailCard } from '../components/_staff-detail-card';
import { KpiSparklineChart } from '../components/_kpi-sparkline-chart';
import { PeriodSelector } from '../components/_period-selector';
import {
  normalizeRole,
  calculateDynamicStaffRanks,
  calculatePeriodKpis,
  calculateRevenueStats,
  calculatePeriodMonths,
  getDaysInMonthCount,
  type RanksTimeframe,
} from '../kpi-utils';

interface RanksTabProps {
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  selectedMonthYear: string;
}

export const RanksTab = React.memo(function RanksTab({
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  selectedMonthYear,
}: RanksTabProps) {
  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffMembers.find(s => s.status === 'active')?.id || ''
  );

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
    () => calculateDynamicStaffRanks(staffMembers, kpiConfigs, kpiDailyValues, periodMonths),
    [staffMembers, kpiConfigs, kpiDailyValues, periodMonths]
  );

  // Selected staff
  const selectedStaff = useMemo(
    () => staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0],
    [staffMembers, selectedStaffId]
  );

  // Staff configs for current month (chart only)
  const staffConfigs = useMemo(() => {
    if (!selectedStaff) return [];
    return kpiConfigs.filter(c =>
      normalizeRole(c.role) === normalizeRole(selectedStaff.role) &&
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
    return calculateRevenueStats(selectedStaff.id, selectedStaff.role, kpiConfigs, kpiDailyValues, periodMonths);
  }, [kpiConfigs, kpiDailyValues, selectedStaff, periodMonths]);

  // Period KPIs
  const periodKpis = useMemo(() => {
    if (!selectedStaff) return [];
    return calculatePeriodKpis(selectedStaff.id, selectedStaff.role, kpiConfigs, kpiDailyValues, periodMonths);
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

  const score = dynamicRanks.find(r => r.staffId === selectedStaff?.id)?.score || 0;
  const daysInMonthCount = getDaysInMonthCount(ranksMonth);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <PeriodSelector
        timeframe={ranksTimeframe}
        onTimeframeChange={handleTimeframeChange}
        ranksMonth={ranksMonth}
        onRanksMonthChange={handleMonthChange}
        ranksQuarter={ranksQuarter}
        onRanksQuarterChange={handleQuarterChange}
        ranksYear={ranksYear}
        onRanksYearChange={handleYearChange}
      />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Leaderboard */}
        <div className="lg:col-span-5">
          <LeaderboardTable
            ranks={dynamicRanks}
            selectedStaffId={selectedStaffId}
            onSelectStaff={handleSelectStaff}
            periodLabel={periodLabel}
          />
        </div>

        {/* Right: Staff detail */}
        <div className="lg:col-span-7 space-y-4">
          {selectedStaff && (
            <>
              <StaffDetailCard
                staff={selectedStaff}
                score={score}
                ranksTimeframe={ranksTimeframe}
                periodRevenueStats={periodRevenueStats}
                periodKpis={periodKpis}
                ranksMonth={ranksMonth}
                ranksQuarter={ranksQuarter}
                ranksYear={ranksYear}
              />

              {/* Sparkline chart (month view only) */}
              {ranksTimeframe === 'month' && staffConfigs.length > 0 && (
                <KpiSparklineChart
                  staffId={selectedStaff.id}
                  configs={staffConfigs}
                  activeChartKpiId={activeChartKpiId}
                  onActiveKpiChange={handleChartKpiChange}
                  ranksMonth={ranksMonth}
                  daysInMonthCount={daysInMonthCount}
                  kpiDailyValues={kpiDailyValues}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
