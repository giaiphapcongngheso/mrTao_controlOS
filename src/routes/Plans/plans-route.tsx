import React, { useCallback, useMemo, useState } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { ModuleHeader } from '../../../share/components/module-header';
import { Button } from '../../../share/ui/button';
import { useAppShellState } from '../app-shell-state';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import { usePlansQuery, useCreatePlanMutation, useLiveIndicatorsQuery, useDaySchedulesQuery } from './_hooks/use-plans';
import type { PlanRequestType } from '../../types/plans.types';

import PlanDashboard from './views/plan-dashboard';
import PlanMonthView from './views/plan-month-view';
import PlanWeekView from './views/plan-week-view';
import PlanDayView from './views/plan-day-view';
import PlanCreateWizard from './create/plan-create-wizard';

type PlanTab = 'dashboard' | 'month' | 'week' | 'day';

const TAB_CONFIG: Array<{ key: PlanTab; label: string }> = [
  { key: 'dashboard', label: 'Tổng quan' },
  { key: 'month', label: 'Tháng' },
  { key: 'week', label: 'Tuần' },
  { key: 'day', label: 'Ngày' },
];

export default function PlansRoute() {
  const { activeStoreId } = useAppShellState();
  const [activeTab, setActiveTab] = useState<PlanTab>('dashboard');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // Data hooks
  const { items: plans, isLoading: isPlansLoading } = usePlansQuery(activeStoreId);
  const { items: indicators } = useLiveIndicatorsQuery(activeStoreId);
  const { items: daySchedules } = useDaySchedulesQuery(activeStoreId);
  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();

  // Mutations
  const createPlanMutation = useCreatePlanMutation(activeStoreId);

  // Handlers
  const handleTabChange = useCallback((tab: PlanTab) => {
    setActiveTab(tab);
  }, []);

  const handleCreatePlan = useCallback(async (data: PlanRequestType) => {
    await createPlanMutation.mutateAsync(data);
    setCreateSheetOpen(false);
  }, [createPlanMutation]);

  const handleOpenCreate = useCallback(() => setCreateSheetOpen(true), []);
  const handleCreateSheetChange = useCallback((open: boolean) => setCreateSheetOpen(open), []);
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

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 p-1.5 w-fit">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#C21A1A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active view */}
      {activeTab === 'dashboard' && (
        <PlanDashboard
          plans={plans}
          indicators={indicators}
          onNavigateToMonth={handleNavigateToMonth}
          onNavigateToWeek={handleNavigateToWeek}
        />
      )}
      {activeTab === 'month' && <PlanMonthView plans={plans} />}
      {activeTab === 'week' && <PlanWeekView plans={plans} />}
      {activeTab === 'day' && <PlanDayView plans={plans} daySchedules={daySchedules} />}

      {/* Create Plan Sheet — renders independently, overlays over the current view */}
      <PlanCreateWizard
        open={createSheetOpen}
        onOpenChange={handleCreateSheetChange}
        staffMembers={staffOptions}
        onSubmit={handleCreatePlan}
        isSubmitting={createPlanMutation.isPending}
      />
    </div>
  );
}
