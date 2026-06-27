import React, { useCallback, useMemo, useState } from 'react';
import { LayoutDashboard, CalendarDays, CalendarRange, Clock, Plus } from 'lucide-react';
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
  useDaySchedulesQuery 
} from './_hooks/use-plans';
import type { PlanRequestType, PlanDocument, PlanTimeSlot, PlanMITTask } from '../../types/plans.types';

import PlanDashboard from './views/plan-dashboard';
import PlanMonthView from './views/plan-month-view';
import PlanWeekView from './views/plan-week-view';
import PlanDayView from './views/plan-day-view';
import PlanCreateWizard from './create/plan-create-wizard';

type PlanTab = 'dashboard' | 'month' | 'week' | 'day';

const TAB_CONFIG = [
  { key: 'dashboard' as const, label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'month' as const, label: 'Tháng', icon: CalendarDays },
  { key: 'week' as const, label: 'Tuần', icon: CalendarRange },
  { key: 'day' as const, label: 'Ngày', icon: Clock },
];

export default function PlansRoute() {
  const { activeStoreId } = useAppShellState();
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

  // Handlers
  const handleTabChange = useCallback((tab: PlanTab) => {
    setActiveTab(tab);
  }, []);

  const handleSubmitPlan = useCallback(async (
    data: PlanRequestType,
    dayScheduleData?: { timeSlots: PlanTimeSlot[]; mitTasks: PlanMITTask[]; quickNotes: string[]; date: string }
  ) => {
    let savedPlanId = '';
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

    setCreateSheetOpen(false);
    setEditingPlan(null);
  }, [editingPlan, createPlanMutation, updatePlanMutation, saveDayScheduleMutation, daySchedules]);

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
      <div className="border-b border-slate-200 pb-0 w-full mb-2">
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
      <PlanCreateWizard
        open={createSheetOpen}
        onOpenChange={handleCreateSheetChange}
        staffMembers={staffOptions}
        onSubmit={handleSubmitPlan}
        isSubmitting={createPlanMutation.isPending || updatePlanMutation.isPending || saveDayScheduleMutation.isPending}
        editPlan={editingPlan}
        availablePlans={plans}
        daySchedules={daySchedules}
      />
    </div>
  );
}
