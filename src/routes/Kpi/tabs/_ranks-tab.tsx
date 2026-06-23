import React, { useState, useMemo, useCallback } from 'react';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import type { KPIConfig, KPIDailyValue, StaffRank } from '../../../types/kpi.types';
import { Card } from '../../../../share/ui/card';
import { LeaderboardTable } from '../components/_leaderboard-table';
import { StaffDetailCard } from '../components/_staff-detail-card';
import { KpiSparklineChart } from '../components/_kpi-sparkline-chart';
import {
  normalizeRole,
  calculateDynamicStaffRanks,
  calculatePeriodKpis,
  calculateRevenueStats,
  calculatePeriodMonths,
  getDaysInMonthCount,
  getPreviousMonthYear,
  type RanksTimeframe,
} from '../kpi-utils';

interface RanksTabProps {
  roles: StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  selectedMonthYear: string;
}

export const RanksTab = React.memo(function RanksTab({
  roles,
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
    return calculateRevenueStats(selectedStaff.id, selectedStaff.role, kpiConfigs, kpiDailyValues, prevPeriodMonths);
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
      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
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
    </div>
  );
});
