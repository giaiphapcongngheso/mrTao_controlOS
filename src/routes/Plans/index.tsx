import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, CalendarDays, CalendarRange, Clock, Plus, Edit3 } from 'lucide-react';
import { ModuleHeader } from '../../../share/components/module-header';
import { Button } from '../../../share/ui/button';
import { useAppShellState } from '../app-shell-state';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import { 
  usePlansQuery, 
  useCreatePlanMutation, 
  useUpdatePlanMutation,
  useSaveDayScheduleMutation,
  useLiveIndicatorsQuery, 
  useDaySchedulesQuery,
  useSaveLiveIndicatorMutation,
  useDeleteLiveIndicatorMutation
} from './_hooks/use-plans';
import type { PlanRequestType, PlanDocument, PlanTimeSlot, PlanMITTask, PlanLiveIndicator } from '../../types/plans.types';
import type { PlanLiveIndicatorForm } from './components/form';
import { formatDateVN } from './plan-utils';
import { toastSuccess, toastError } from '../../shared/lib/toast';

import PlanDashboard from './components/plan-dashboard';
import PlanMonthView from './components/plan-month-view';
import PlanWeekView from './components/plan-week-view';
import PlanDayView from './components/plan-day-view';
import PlanForm from './components/form';

type PlanTab = 'dashboard' | 'month' | 'week' | 'day';

const TAB_CONFIG = [
  { key: 'dashboard' as const, label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'month' as const, label: 'Tháng', icon: CalendarDays },
  { key: 'week' as const, label: 'Tuần', icon: CalendarRange },
  { key: 'day' as const, label: 'Ngày', icon: Clock },
];

export default function PlansRoute() {
  const { activeStoreId } = useAppShellState();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PlanTab>('dashboard');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanDocument | null>(null);

  // Data hooks
  const { items: plans, isLoading: isPlansLoading } = usePlansQuery(activeStoreId);
  const { items: indicators } = useLiveIndicatorsQuery(activeStoreId);
  const { items: daySchedules } = useDaySchedulesQuery(activeStoreId);
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();

  // Mutations
  const createPlanMutation = useCreatePlanMutation(activeStoreId);
  const updatePlanMutation = useUpdatePlanMutation(activeStoreId);
  const saveDayScheduleMutation = useSaveDayScheduleMutation(activeStoreId);
  const saveLiveIndicatorMutation = useSaveLiveIndicatorMutation(activeStoreId);
  const deleteLiveIndicatorMutation = useDeleteLiveIndicatorMutation(activeStoreId);

  // Handlers
  const handleTabChange = useCallback((tab: PlanTab) => {
    setActiveTab(tab);
  }, []);

  const handleSubmitPlan = useCallback(async (
    data: PlanRequestType,
    dayScheduleData?: { timeSlots: PlanTimeSlot[]; mitTasks: PlanMITTask[]; quickNotes: string[]; date: string },
    liveIndicatorsData?: PlanLiveIndicatorForm[]
  ) => {
    let savedPlanId = '';
    try {
      if (editingPlan) {
        // Update existing plan
        await updatePlanMutation.mutateAsync({ planId: editingPlan.id, input: data });
        savedPlanId = editingPlan.id;
      } else {
        // Create new plan
        const result = await createPlanMutation.mutateAsync(data);
        savedPlanId = result?.id ?? '';
      }

      // Save corresponding day schedule if day-level data is provided
      if (dayScheduleData && dayScheduleData.date) {
        const existingSchedule = daySchedules.find(
          (s) => s.date === dayScheduleData.date && (s.planId === savedPlanId || s.planId === '')
        );
        await saveDayScheduleMutation.mutateAsync({
          scheduleId: existingSchedule?.id,
          input: {
            planId: savedPlanId,
            date: dayScheduleData.date,
            timeSlots: dayScheduleData.timeSlots,
            mitTasks: dayScheduleData.mitTasks,
            quickNotes: dayScheduleData.quickNotes,
          },
        });
      }

      // Save live indicators if level === 'quarter' and data is provided
      if (data.level === 'quarter' && liveIndicatorsData && savedPlanId) {
        const currentIndicators = indicators.filter((ind) => ind.planId === savedPlanId && !ind.deletedAt);
        
        // Indicators to delete: in DB but not in current form list
        const newIndicatorIds = new Set(liveIndicatorsData.map(ind => ind.id).filter(Boolean));
        const toDelete = currentIndicators.filter(ind => !newIndicatorIds.has(ind.id));
        
        for (const ind of toDelete) {
          await deleteLiveIndicatorMutation.mutateAsync(ind.id);
        }

        // Save or update indicators
        for (const ind of liveIndicatorsData) {
          const payload = {
            planId: savedPlanId,
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

      toastSuccess(editingPlan ? 'Cập nhật kế hoạch thành công!' : 'Tạo kế hoạch mới thành công!');
      setCreateSheetOpen(false);
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      toastError(
        editingPlan ? 'Cập nhật kế hoạch thất bại' : 'Tạo kế hoạch thất bại',
        err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.'
      );
    }
  }, [editingPlan, createPlanMutation, updatePlanMutation, saveDayScheduleMutation, daySchedules, indicators, saveLiveIndicatorMutation, deleteLiveIndicatorMutation]);

  const handleEditPlan = useCallback((plan: PlanDocument) => {
    setEditingPlan(plan);
    setCreateSheetOpen(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingPlan(null);
    setCreateSheetOpen(true);
  }, []);

  const handleCreateSheetChange = useCallback((open: boolean) => {
    setCreateSheetOpen(open);
    if (!open) {
      setEditingPlan(null);
    }
  }, []);

  const handleNavigateToMonth = useCallback(() => setActiveTab('month'), []);
  const handleNavigateToWeek = useCallback(() => setActiveTab('week'), []);

  // Compute active plan for the current tab
  const currentTabPlan = useMemo(() => {
    if (activeTab === 'dashboard') {
      return plans.find((p) => p.level === 'quarter' && p.status === 'active') ?? plans.find((p) => p.level === 'quarter') ?? null;
    }
    if (activeTab === 'month') {
      return plans.find((p) => p.level === 'month' && p.status === 'active') ?? plans.find((p) => p.level === 'month') ?? null;
    }
    if (activeTab === 'week') {
      return plans.find((p) => p.level === 'week' && p.status === 'active') ?? plans.find((p) => p.level === 'week') ?? null;
    }
    if (activeTab === 'day') {
      const today = new Date().toISOString().split('T')[0];
      return plans.find((p) => p.level === 'day' && p.startDate === today) ?? null;
    }
    return null;
  }, [activeTab, plans]);

  const weekPlan = useMemo(() => {
    return plans.find((p) => p.level === 'week' && p.status === 'active') ?? plans.find((p) => p.level === 'week') ?? null;
  }, [plans]);

  const handleEditButtonClick = useCallback(() => {
    if (activeTab === 'day' && !currentTabPlan) {
      // Draft day plan template
      const today = new Date().toISOString().split('T')[0];
      handleEditPlan({
        name: `Kế hoạch Ngày ${formatDateVN(today)}`,
        level: 'day',
        startDate: today,
        endDate: today,
        ownerId: '',
        ownerName: '',
        priorities: [],
        reviewFrequency: 'daily',
        reviewerId: '',
        reviewerName: '',
        alertThreshold: 80,
        deviationAction: 'adjust_plan',
        linkedModules: { checklist: true, tasks: true, kpi: true, reports: true },
        status: 'draft',
        progress: 0,
        storeId: '',
        parentPlanId: weekPlan?.id ?? '',
      } as any);
    } else if (currentTabPlan) {
      handleEditPlan(currentTabPlan);
    }
  }, [activeTab, currentTabPlan, weekPlan, handleEditPlan]);

  const handleViewDetailClick = useCallback(() => {
    if (currentTabPlan) {
      void navigate({ to: '/plans/$planId', params: { planId: currentTabPlan.id } });
    }
  }, [currentTabPlan, navigate]);

  const editButtonConfig = useMemo(() => {
    if (activeTab === 'dashboard') {
      return { show: !!currentTabPlan, label: 'Chỉnh sửa kế hoạch Quý' };
    }
    if (activeTab === 'month') {
      return { show: !!currentTabPlan, label: 'Chỉnh sửa kế hoạch Tháng' };
    }
    if (activeTab === 'week') {
      return { show: !!currentTabPlan, label: 'Chỉnh sửa kế hoạch Tuần' };
    }
    if (activeTab === 'day') {
      return { show: true, label: 'Chỉnh sửa lịch ngày' };
    }
    return { show: false, label: '' };
  }, [activeTab, currentTabPlan]);

  // Staff members mapped for dropdowns
  const staffOptions = useMemo(
    () => staffMembers.map((s) => ({ id: s.id, fullName: s.fullName, avatar: s.avatar })),
    [staffMembers]
  );

  if (isPlansLoading || isStaffLoading) {
    return (
      <div className="space-y-4 text-left">
        <ModuleHeader
          title="Quản lý Kế hoạch"
          description="Lập mục tiêu tuần, tháng và kế hoạch làm việc cho showroom."
          icon={<CalendarRange className="w-6 h-6 text-[#C21A1A]" />}
        />
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm font-semibold text-slate-500 animate-pulse">
            Đang tải dữ liệu kế hoạch...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* Header */}
      <ModuleHeader
        title="Kế hoạch & Mục tiêu MV GSM"
        description="Biến mục tiêu công ty thành hành động đơn giản — rõ ràng — đo lường được"
        icon={<CalendarRange className="w-6 h-6 text-[#C21A1A]" />}
      >
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#C21A1A] rounded-xl hover:bg-[#a51616] transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo kế hoạch
        </Button>
      </ModuleHeader>

      {/* Tab switcher style like checklist */}
      <div className="border-b border-slate-200 pb-0 w-full mb-4 flex items-end justify-between gap-4">
        <div className="flex gap-6 sm:gap-8 justify-start items-center overflow-x-auto scrollbar-none">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex-none flex items-center gap-1.5 pb-3 text-sm font-bold bg-transparent transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-b-[#C21A1A] text-[#C21A1A]'
                    : 'border-b-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mb-2.5 items-center shrink-0">
          {currentTabPlan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleViewDetailClick}
              className="flex items-center gap-1.5 px-3 h-8 text-xs font-bold text-[#C21A1A] bg-red-50/50 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer shrink-0"
            >
              Xem chi tiết
            </Button>
          )}
          {editButtonConfig.show && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditButtonClick}
              className="flex items-center gap-1.5 px-3 h-8 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editButtonConfig.label}
            </Button>
          )}
        </div>
      </div>

      {/* Active view */}
      {activeTab === 'dashboard' && (
        <PlanDashboard
          plans={plans}
          indicators={indicators}
          onNavigateToMonth={handleNavigateToMonth}
          onNavigateToWeek={handleNavigateToWeek}
          onEditPlan={handleEditPlan}
        />
      )}
      {activeTab === 'month' && <PlanMonthView plans={plans} onEditPlan={handleEditPlan} />}
      {activeTab === 'week' && <PlanWeekView plans={plans} onEditPlan={handleEditPlan} />}
      {activeTab === 'day' && <PlanDayView plans={plans} daySchedules={daySchedules} onEditPlan={handleEditPlan} />}

      {/* Create/Edit Plan Sheet — renders independently, overlays over the current view */}
      <PlanForm
        open={createSheetOpen}
        onOpenChange={handleCreateSheetChange}
        staffMembers={staffOptions}
        onSubmit={handleSubmitPlan}
        isSubmitting={createPlanMutation.isPending || updatePlanMutation.isPending || saveDayScheduleMutation.isPending || saveLiveIndicatorMutation.isPending}
        editPlan={editingPlan}
        availablePlans={plans}
        daySchedules={daySchedules}
        indicators={indicators}
      />
    </div>
  );
}
