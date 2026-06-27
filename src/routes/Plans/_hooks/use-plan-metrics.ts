import { useMemo } from 'react';
import type { PlanDocument, PlanPriority } from '../../../types/plans.types';
import {
  calculatePlanProgress,
  countPriorityStatuses,
  getWeekCount,
  getElapsedWeeks,
  isOverdue,
  filterPlansByLevel,
} from '../constants/plan-utils';

// ─── Plan Progress ───────────────────────────────────────────────────────────

/**
 * Compute progress percentage from plan priorities.
 */
export function usePlanProgress(plan: PlanDocument | null) {
  return useMemo(() => {
    if (!plan) return 0;
    return calculatePlanProgress(plan.priorities ?? []);
  }, [plan]);
}

// ─── Plan Alerts ─────────────────────────────────────────────────────────────

export interface PlanAlert {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
}

/**
 * Detect alerts for a plan: overdue priorities, below-target metrics.
 */
export function usePlanAlerts(plan: PlanDocument | null): PlanAlert[] {
  return useMemo(() => {
    if (!plan) return [];
    const alerts: PlanAlert[] = [];

    // Check overdue priorities
    (plan.priorities ?? []).forEach((p) => {
      if (p.status !== 'completed' && isOverdue(p.deadline)) {
        alerts.push({
          id: `overdue-${p.id}`,
          message: `Ưu tiên "${p.title}" đã quá hạn`,
          severity: 'critical',
        });
      }
    });

    // Check slow progress vs time elapsed
    if (plan.startDate && plan.endDate) {
      const totalWeeks = getWeekCount(plan.startDate, plan.endDate);
      const elapsed = getElapsedWeeks(plan.startDate);
      if (totalWeeks > 0 && elapsed > 0) {
        const expectedProgress = Math.round((elapsed / totalWeeks) * 100);
        const actualProgress = calculatePlanProgress(plan.priorities ?? []);
        if (actualProgress < expectedProgress - 10) {
          alerts.push({
            id: 'progress-behind',
            message: `Tiến độ thực tế (${actualProgress}%) thấp hơn kế hoạch (${expectedProgress}%)`,
            severity: 'warning',
          });
        }
      }
    }

    return alerts;
  }, [plan]);
}

// ─── Quarter Summary ─────────────────────────────────────────────────────────

export interface QuarterSummary {
  totalPlans: number;
  activePlans: number;
  totalWeeks: number;
  elapsedWeeks: number;
  overallProgress: number;
  priorityStats: ReturnType<typeof countPriorityStatuses>;
  alertCount: number;
}

/**
 * Aggregate metrics for the quarter dashboard view.
 */
export function useQuarterSummary(plans: PlanDocument[]): QuarterSummary {
  return useMemo(() => {
    const quarterPlans = filterPlansByLevel(plans, 'quarter');
    const activePlan = quarterPlans.find((p) => p.status === 'active') ?? quarterPlans[0];

    const allPriorities = quarterPlans.flatMap((p) => p.priorities ?? []);
    const priorityStats = countPriorityStatuses(allPriorities);
    const overallProgress = calculatePlanProgress(allPriorities);

    let totalWeeks = 0;
    let elapsedWeeks = 0;
    if (activePlan) {
      totalWeeks = getWeekCount(activePlan.startDate, activePlan.endDate);
      elapsedWeeks = getElapsedWeeks(activePlan.startDate);
    }

    const alertCount = allPriorities.filter(
      (p) => p.status !== 'completed' && isOverdue(p.deadline)
    ).length;

    return {
      totalPlans: quarterPlans.length,
      activePlans: quarterPlans.filter((p) => p.status === 'active').length,
      totalWeeks,
      elapsedWeeks: Math.min(elapsedWeeks, totalWeeks),
      overallProgress,
      priorityStats,
      alertCount,
    };
  }, [plans]);
}

// ─── Month Summary ───────────────────────────────────────────────────────────

export interface MonthSummary {
  monthPlan: PlanDocument | null;
  priorityCount: number;
  completedCount: number;
  warningCount: number;
  monthProgress: number;
}

export function useMonthSummary(plans: PlanDocument[], selectedMonth?: string): MonthSummary {
  return useMemo(() => {
    const monthPlans = filterPlansByLevel(plans, 'month');
    const monthPlan = selectedMonth
      ? monthPlans.find((p) => p.startDate.startsWith(selectedMonth)) ?? monthPlans[0]
      : monthPlans[0];

    if (!monthPlan) {
      return { monthPlan: null, priorityCount: 0, completedCount: 0, warningCount: 0, monthProgress: 0 };
    }

    const stats = countPriorityStatuses(monthPlan.priorities ?? []);
    return {
      monthPlan,
      priorityCount: stats.total,
      completedCount: stats.completed,
      warningCount: stats.warning,
      monthProgress: calculatePlanProgress(monthPlan.priorities ?? []),
    };
  }, [plans, selectedMonth]);
}

// ─── Week Summary ────────────────────────────────────────────────────────────

export interface WeekSummary {
  weekPlan: PlanDocument | null;
  priorityCount: number;
  behindCount: number;
  commitPercentage: number;
}

export function useWeekSummary(plans: PlanDocument[]): WeekSummary {
  return useMemo(() => {
    const weekPlans = filterPlansByLevel(plans, 'week');
    const weekPlan = weekPlans.find((p) => p.status === 'active') ?? weekPlans[0];

    if (!weekPlan) {
      return { weekPlan: null, priorityCount: 0, behindCount: 0, commitPercentage: 0 };
    }

    const priorities = weekPlan.priorities ?? [];
    const behindCount = priorities.filter((p) => p.status === 'warning').length;
    const withOwner = priorities.filter((p) => p.ownerId && p.deadline).length;
    const commitPercentage = priorities.length > 0
      ? Math.round((withOwner / priorities.length) * 100)
      : 0;

    return {
      weekPlan,
      priorityCount: priorities.length,
      behindCount,
      commitPercentage,
    };
  }, [plans]);
}
