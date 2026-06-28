import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { plansService, planLiveIndicatorService } from '../../../services/plans-service';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlanTargets {
  /** Monthly revenue target (e.g. 300_000_000) */
  monthlyRevenueTarget: number;
  /** Current cumulative revenue this month */
  monthlyRevenueCurrent: number;
  /** Percentage achieved (0-100) */
  monthlyRevenuePercent: number;
  /** Operating score (0-100), computed from checklist + task + SOP metrics */
  operatingScore: number;
  /** Month label (e.g. "tháng 6") */
  monthLabel: string;
  isLoading: boolean;
  /** True when no active monthly plan exists */
  hasPlan: boolean;
}

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const planTargetQueryKeys = {
  monthlyPlan: (storeId: string, monthKey: string) =>
    ['planTargets', 'monthly', storeId, monthKey] as const,
  liveIndicators: (storeId: string) =>
    ['planTargets', 'indicators', storeId] as const,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(): string {
  const now = new Date();
  return `tháng ${now.getMonth() + 1}`;
}

/**
 * Check if a plan's date range covers the current month.
 */
function isPlanForCurrentMonth(
  startDate: string,
  endDate: string,
  monthKey: string,
): boolean {
  const [year, month] = monthKey.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  return startDate <= monthEnd && endDate >= monthStart;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches system targets from Plans module for dashboard "Mục tiêu hệ thống".
 *
 * Sources:
 * - Monthly revenue target from active month-level Plan (`revenueTarget`)
 * - Current revenue from PlanLiveIndicators
 * - Operating score computed from live indicators
 */
export function usePlanTargets(
  storeId: string,
  checklistCompletion: number,
  delayedTasksCount: number,
  sopErrorsCount: number,
  totalTasks: number,
): PlanTargets {
  const monthKey = useMemo(getCurrentMonthKey, []);
  const monthLabel = useMemo(getMonthLabel, []);

  // ── Fetch monthly plan ─────────────────────────────────────────────────────

  const planQuery = useQuery({
    queryKey: planTargetQueryKeys.monthlyPlan(storeId, monthKey),
    queryFn: async () => {
      const plans = await plansService.getAll();
      // Find active monthly plan for current store and month
      return (
        plans.find(
          (p) =>
            p.storeId === storeId &&
            p.status === 'active' &&
            (p.level === 'month' || p.level === 'quarter') &&
            isPlanForCurrentMonth(p.startDate, p.endDate, monthKey),
        ) ?? null
      );
    },
    enabled: Boolean(storeId),
    staleTime: 5 * 60 * 1000, // 5 minutes — plans change infrequently
  });

  // ── Fetch live indicators ──────────────────────────────────────────────────

  const indicatorQuery = useQuery({
    queryKey: planTargetQueryKeys.liveIndicators(storeId),
    queryFn: () => planLiveIndicatorService.getAll(),
    enabled: Boolean(storeId) && Boolean(planQuery.data),
    staleTime: 5 * 60 * 1000,
  });

  // ── Compute targets ────────────────────────────────────────────────────────

  return useMemo<PlanTargets>(() => {
    const isLoading = planQuery.isLoading;
    const plan = planQuery.data;

    if (!plan) {
      return {
        monthlyRevenueTarget: 0,
        monthlyRevenueCurrent: 0,
        monthlyRevenuePercent: 0,
        operatingScore: 0,
        monthLabel,
        isLoading,
        hasPlan: false,
      };
    }

    const revenueTarget = plan.revenueTarget ?? 0;

    // Find revenue indicator linked to this plan
    const indicators = (indicatorQuery.data || []).filter(
      (ind) => ind.planId === plan.id && ind.storeId === storeId,
    );
    const revenueIndicator = indicators.find(
      (ind) => ind.name.toLowerCase().includes('doanh thu'),
    );
    const revenueCurrent = revenueIndicator?.currentValue ?? 0;
    const revenuePercent =
      revenueTarget > 0
        ? Math.min(100, Math.round((revenueCurrent / revenueTarget) * 100))
        : 0;

    // Compute operating score:
    // 40% checklist + 30% task on-time rate + 30% SOP compliance
    const taskOnTimeRate =
      totalTasks > 0
        ? Math.max(0, Math.round(((totalTasks - delayedTasksCount) / totalTasks) * 100))
        : 100;
    const sopComplianceRate = Math.max(0, 100 - sopErrorsCount * 10);
    const operatingScore = Math.round(
      checklistCompletion * 0.4 + taskOnTimeRate * 0.3 + sopComplianceRate * 0.3,
    );

    return {
      monthlyRevenueTarget: revenueTarget,
      monthlyRevenueCurrent: revenueCurrent,
      monthlyRevenuePercent: revenuePercent,
      operatingScore: Math.min(100, Math.max(0, operatingScore)),
      monthLabel,
      isLoading,
      hasPlan: true,
    };
  }, [
    planQuery.isLoading,
    planQuery.data,
    indicatorQuery.data,
    storeId,
    monthLabel,
    checklistCompletion,
    delayedTasksCount,
    sopErrorsCount,
    totalTasks,
  ]);
}
