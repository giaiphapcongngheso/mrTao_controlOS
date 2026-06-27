import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansService, planDayScheduleService, planLiveIndicatorService } from '../../../services/plans-service';
import type {
  PlanDocument,
  PlanRequestType,
  PlanDaySchedule,
  PlanDayScheduleRequest,
  PlanLiveIndicator,
  PlanLiveIndicatorRequest,
} from '../../../types/plans.types';
import { initBusinessEntity } from '../../../types/base.types';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const plansQueryKeys = {
  all: ['plans'] as const,
  lists: () => [...plansQueryKeys.all, 'list'] as const,
  list: (storeId: string) => [...plansQueryKeys.lists(), storeId] as const,
  daySchedules: ['plan-day-schedules'] as const,
  daySchedulesByPlan: (planId: string) => [...plansQueryKeys.daySchedules, planId] as const,
  liveIndicators: ['plan-live-indicators'] as const,
  liveIndicatorsByPlan: (planId: string) => [...plansQueryKeys.liveIndicators, planId] as const,
};

// ─── Plans Queries ───────────────────────────────────────────────────────────

function getPlanSortTime(plan: PlanDocument): number {
  const rawDate = plan.updatedAt || plan.createdAt;
  const timestamp = rawDate ? new Date(rawDate).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function usePlansQuery(storeId: string) {
  const queryResult = useQuery({
    queryKey: plansQueryKeys.list(storeId),
    queryFn: plansService.getAll,
    enabled: !!storeId,
  });

  const items = useMemo(() => {
    return (queryResult.data ?? [])
      .filter((plan) => plan.storeId === storeId && !plan.deletedAt)
      .sort((a, b) => {
        const timeDiff = getPlanSortTime(b) - getPlanSortTime(a);
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });
  }, [queryResult.data, storeId]);

  return {
    ...queryResult,
    items,
  };
}

// ─── Plans Mutations ─────────────────────────────────────────────────────────

export function useCreatePlanMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['createPlan', storeId],
    mutationFn: async (plan: PlanRequestType) => {
      const baseEntity = await initBusinessEntity('PL');
      const now = new Date().toISOString();
      return await plansService.create({
        ...plan,
        ...baseEntity,
        storeId,
        createdAt: now,
        updatedAt: now,
      } as PlanRequestType);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.list(storeId) });
    },
  });
}

export function useUpdatePlanMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updatePlan', storeId],
    mutationFn: async ({ planId, input }: { planId: string; input: PlanRequestType }) => {
      return await plansService.update(planId, {
        ...input,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.list(storeId) });
    },
  });
}

export function useDeletePlanMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['deletePlan', storeId],
    mutationFn: async (planId: string) => {
      return await plansService.delete(planId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.list(storeId) });
    },
  });
}

// ─── Day Schedule Queries & Mutations ────────────────────────────────────────

export function useDaySchedulesQuery(storeId: string) {
  const queryResult = useQuery({
    queryKey: plansQueryKeys.daySchedules,
    queryFn: planDayScheduleService.getAll,
    enabled: !!storeId,
  });

  const items = useMemo(() => {
    return (queryResult.data ?? [])
      .filter((s) => s.storeId === storeId && !s.deletedAt);
  }, [queryResult.data, storeId]);

  return { ...queryResult, items };
}

export function useSaveDayScheduleMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['saveDaySchedule', storeId],
    mutationFn: async ({ scheduleId, input }: { scheduleId?: string; input: PlanDayScheduleRequest }) => {
      const now = new Date().toISOString();
      if (scheduleId) {
        return await planDayScheduleService.update(scheduleId, { ...input, updatedAt: now });
      }
      const baseEntity = await initBusinessEntity('PDS');
      return await planDayScheduleService.create({
        ...input,
        ...baseEntity,
        storeId,
        createdAt: now,
        updatedAt: now,
      } as PlanDayScheduleRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.daySchedules });
    },
  });
}

// ─── Live Indicators Queries & Mutations ─────────────────────────────────────

export function useLiveIndicatorsQuery(storeId: string) {
  const queryResult = useQuery({
    queryKey: plansQueryKeys.liveIndicators,
    queryFn: planLiveIndicatorService.getAll,
    enabled: !!storeId,
  });

  const items = useMemo(() => {
    return (queryResult.data ?? [])
      .filter((i) => i.storeId === storeId && !i.deletedAt);
  }, [queryResult.data, storeId]);

  return { ...queryResult, items };
}

export function useSaveLiveIndicatorMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['saveLiveIndicator', storeId],
    mutationFn: async ({ indicatorId, input }: { indicatorId?: string; input: PlanLiveIndicatorRequest }) => {
      const now = new Date().toISOString();
      if (indicatorId) {
        return await planLiveIndicatorService.update(indicatorId, { ...input, updatedAt: now });
      }
      const baseEntity = await initBusinessEntity('PLI');
      return await planLiveIndicatorService.create({
        ...input,
        ...baseEntity,
        storeId,
        createdAt: now,
        updatedAt: now,
      } as PlanLiveIndicatorRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKeys.liveIndicators });
    },
  });
}
