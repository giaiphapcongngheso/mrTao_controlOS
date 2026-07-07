import React, { useState, useCallback, useMemo } from 'react';
import { Award, Calendar, Target } from 'lucide-react';
import type { StaffRole, StaffMember } from '../../types/staff.types';
import type { KPIConfig, KPIDailyValue, KPIGoal, KPIStaffMonthlyConfig } from '../../types/kpi.types';
import { ModuleHeader } from '../../../share/components/module-header';
import { RanksTab } from './tabs/_ranks-tab';
import { EntryTab } from './tabs/_entry-tab';
import { SettingsTab } from './tabs/_settings-tab';

type SubTab = 'ranks' | 'entry' | 'settings';

interface KpiViewProps {
  roles: StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  monthlyConfigs: KPIStaffMonthlyConfig[];
  selectedMonthYear: string;
  onMonthYearChange: (monthYear: string) => void;
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
  onSaveMonthlyConfig: (config: KPIStaffMonthlyConfig) => Promise<any>;
  onUpdateRole: (role: StaffRole) => Promise<any>;
  goals: KPIGoal[];
  onCreateGoal: (name: string) => Promise<any>;
  onDeleteGoal: (id: string) => Promise<any>;
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  isRanksLoading: boolean;
  isEntryLoading: boolean;
  isSettingsLoading: boolean;
  isAdminOrOwner: boolean;
}

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'ranks', label: 'Xếp hạng & Chi tiết', icon: <Award className="w-3.5 h-3.5 shrink-0" /> },
  { key: 'entry', label: 'Nhập Action Plan', icon: <Calendar className="w-3.5 h-3.5 shrink-0" /> },
  { key: 'settings', label: 'Thiết lập KPI', icon: <Target className="w-3.5 h-3.5 shrink-0" /> },
];

export default function KpiView({
  roles,
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  monthlyConfigs,
  selectedMonthYear,
  onMonthYearChange,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onSaveDailyValue,
  onSaveMonthlyConfig,
  onUpdateRole,
  goals,
  onCreateGoal,
  onDeleteGoal,
  activeSubTab,
  onSubTabChange,
  isRanksLoading,
  isEntryLoading,
  isSettingsLoading,
  isAdminOrOwner,
}: KpiViewProps) {
  // Handlers
  const handleSubTabChange = useCallback((tab: SubTab) => onSubTabChange(tab), [onSubTabChange]);
  const handleMonthYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthYearChange(e.target.value);
  }, [onMonthYearChange]);

  // Month options
  const monthOptions = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const m = (i + 1).toString().padStart(2, '0');
      return { value: `2026-${m}`, label: `Tháng ${m}/2026` };
    }),
  []);

  const visibleTabs = useMemo(() => {
    return SUB_TABS.filter(tab => {
      if (tab.key === 'ranks' || tab.key === 'settings') {
        return isAdminOrOwner;
      }
      return true;
    });
  }, [isAdminOrOwner]);

  return (
    <div className="space-y-4 pb-10">
      {/* Module Header */}
      <ModuleHeader
        title="KPI & Thi đua"
        description="Quản lý tổng thể KPI — Theo dõi, đánh giá và nhập liệu thực tế cho nhân sự"
      />

      {/* Month selector + Sub tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 pb-0 min-w-0">
        {/* Underline tabs */}
        <div className="flex items-center gap-6 md:gap-8 -mb-px overflow-x-auto whitespace-nowrap scrollbar-none w-full md:w-auto">
          {visibleTabs.map(tab => (
            <SubTabButton
              key={tab.key}
              tabKey={tab.key}
              label={tab.label}
              icon={tab.icon}
              isActive={activeSubTab === tab.key}
              onClick={handleSubTabChange}
            />
          ))}
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-2 pb-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonthYear}
            onChange={handleMonthYearChange}
            className="px-3 h-8 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer focus:outline-none"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'ranks' && isAdminOrOwner && (
        isRanksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-semibold text-slate-500 animate-pulse">
              Đang tải dữ liệu Xếp hạng KPI...
            </div>
          </div>
        ) : (
          <RanksTab
            roles={roles}
            staffMembers={staffMembers}
            kpiConfigs={kpiConfigs}
            kpiDailyValues={kpiDailyValues}
            monthlyConfigs={monthlyConfigs}
            selectedMonthYear={selectedMonthYear}
            onSaveMonthlyConfig={onSaveMonthlyConfig}
          />
        )
      )}

      {activeSubTab === 'entry' && (
        isEntryLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-semibold text-slate-500 animate-pulse">
              Đang tải dữ liệu Nhập liệu KPI...
            </div>
          </div>
        ) : (
          <EntryTab
            staffMembers={staffMembers}
            kpiConfigs={kpiConfigs}
            kpiDailyValues={kpiDailyValues}
            selectedMonthYear={selectedMonthYear}
            onSaveDailyValue={onSaveDailyValue}
          />
        )
      )}

      {activeSubTab === 'settings' && isAdminOrOwner && (
        isSettingsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-semibold text-slate-500 animate-pulse">
              Đang tải cấu hình thiết lập KPI...
            </div>
          </div>
        ) : (
          <SettingsTab
            roles={roles}
            staffMembers={staffMembers}
            kpiConfigs={kpiConfigs}
            selectedMonthYear={selectedMonthYear}
            onCreateConfig={onCreateConfig}
            onUpdateConfig={onUpdateConfig}
            onDeleteConfig={onDeleteConfig}
            goals={goals}
            onCreateGoal={onCreateGoal}
            onDeleteGoal={onDeleteGoal}
            onUpdateRole={onUpdateRole}
          />
        )
      )}
    </div>
  );
}

// ─── Sub-component: Tab Button ─────────────────────────────────
const SubTabButton = React.memo(function SubTabButton({
  tabKey,
  label,
  icon,
  isActive,
  onClick,
}: {
  tabKey: SubTab;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (tab: SubTab) => void;
}) {
  const handleClick = useCallback(() => onClick(tabKey), [onClick, tabKey]);

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-0.5 pb-2.5 pt-2 text-sm font-bold bg-transparent rounded-none border-t-0 border-l-0 border-r-0 border-b-2 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
        isActive
          ? 'border-[#C21A1A] text-[#C21A1A]'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
});
