import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useAppShellState } from '../app-shell-state';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import { 
  usePlansQuery, 
  useUpdatePlanMutation,
  useSaveDayScheduleMutation,
  useDaySchedulesQuery,
  useLiveIndicatorsQuery,
  useSaveLiveIndicatorMutation,
  useDeleteLiveIndicatorMutation
} from './_hooks/use-plans';
import PlanDetail from './components/detail';
import PlanForm from './components/form';
import { toastSuccess, toastError } from '../../shared/lib/toast';
import type { PlanRequestType, PlanTimeSlot, PlanMITTask } from '../../types/plans.types';
import type { PlanLiveIndicatorForm } from './components/form';

export default function PlanDetailRoute() {
  const { planId } = useParams({ from: '/app/plans/$planId' });
  const navigate = useNavigate();
  const { activeStoreId } = useAppShellState();

  // Dialog/Sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // Queries
  const { items: plans, isLoading: isPlansLoading } = usePlansQuery(activeStoreId);
  const { items: daySchedules, isLoading: isSchedulesLoading } = useDaySchedulesQuery(activeStoreId);
  const { items: indicators } = useLiveIndicatorsQuery(activeStoreId);
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();

  // Mutations
  const updatePlanMutation = useUpdatePlanMutation(activeStoreId);
  const saveDayScheduleMutation = useSaveDayScheduleMutation(activeStoreId);
  const saveLiveIndicatorMutation = useSaveLiveIndicatorMutation(activeStoreId);
  const deleteLiveIndicatorMutation = useDeleteLiveIndicatorMutation(activeStoreId);

  // Find current plan
  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  // Find corresponding day schedule if day plan
  const daySchedule = useMemo(() => {
    if (!plan || plan.level !== 'day') return null;
    return daySchedules.find((s) => s.planId === plan.id || s.date === plan.startDate) ?? null;
  }, [plan, daySchedules]);

  // Handlers
  const handleBack = useCallback(() => {
    void navigate({ to: '/plans' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    setEditSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setEditSheetOpen(open);
  }, []);

  const handleSubmitPlan = useCallback(async (
    data: PlanRequestType,
    dayScheduleData?: { timeSlots: PlanTimeSlot[]; mitTasks: PlanMITTask[]; quickNotes: string[]; date: string },
    liveIndicatorsData?: PlanLiveIndicatorForm[]
  ) => {
    if (!plan) return;

    try {
      // Update main plan
      await updatePlanMutation.mutateAsync({ planId: plan.id, input: data });

      // Update corresponding day schedule if day-level data is provided
      if (dayScheduleData && dayScheduleData.date) {
        await saveDayScheduleMutation.mutateAsync({
          scheduleId: daySchedule?.id,
          input: {
            planId: plan.id,
            date: dayScheduleData.date,
            timeSlots: dayScheduleData.timeSlots,
            mitTasks: dayScheduleData.mitTasks,
            quickNotes: dayScheduleData.quickNotes,
          },
        });
      }

      // Save live indicators if level === 'quarter' and data is provided
      if (data.level === 'quarter' && liveIndicatorsData) {
        const currentIndicators = indicators.filter((ind) => ind.planId === plan.id && !ind.deletedAt);
        
        // Indicators to delete: in DB but not in current form list
        const newIndicatorIds = new Set(liveIndicatorsData.map(ind => ind.id).filter(Boolean));
        const toDelete = currentIndicators.filter(ind => !newIndicatorIds.has(ind.id));
        
        for (const ind of toDelete) {
          await deleteLiveIndicatorMutation.mutateAsync(ind.id);
        }

        // Save or update indicators
        for (const ind of liveIndicatorsData) {
          const payload = {
            planId: plan.id,
            name: ind.name,
            targetValue: ind.targetValue,
            unit: ind.unit,
            ownerId: ind.ownerId,
            ownerName: ind.ownerName,
            status: ind.status || 'near_target',
          };
          await saveLiveIndicatorMutation.mutateAsync({
            indicatorId: ind.id,
            input: payload,
          });
        }
      }

      toastSuccess('Cập nhật kế hoạch thành công!');
      setEditSheetOpen(false);
    } catch (err) {
      console.error(err);
      toastError(
        'Cập nhật kế hoạch thất bại',
        err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.'
      );
    }
  }, [plan, updatePlanMutation, saveDayScheduleMutation, daySchedule, indicators, saveLiveIndicatorMutation, deleteLiveIndicatorMutation]);

  const staffOptions = useMemo(
    () => staffMembers.map((s) => ({ id: s.id, fullName: s.fullName, avatar: s.avatar })),
    [staffMembers]
  );

  const isLoading = isPlansLoading || isSchedulesLoading || isStaffLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Đang tải dữ liệu chi tiết kế hoạch...
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm font-bold text-slate-400">Không tìm thấy kế hoạch yêu cầu.</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-black text-blue-500 hover:underline"
        >
          Quay lại danh sách kế hoạch
        </button>
      </div>
    );
  }

  return (
    <>
      <PlanDetail
        plan={plan}
        daySchedule={daySchedule}
        onBack={handleBack}
        onEdit={handleEdit}
      />

      <PlanForm
        open={editSheetOpen}
        onOpenChange={handleSheetOpenChange}
        staffMembers={staffOptions}
        onSubmit={handleSubmitPlan}
        isSubmitting={updatePlanMutation.isPending || saveDayScheduleMutation.isPending || saveLiveIndicatorMutation.isPending}
        editPlan={plan}
        availablePlans={plans}
        daySchedules={daySchedules}
        indicators={indicators}
      />
    </>
  );
}
