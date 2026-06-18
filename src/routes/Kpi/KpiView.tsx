import React, { useState, useCallback, useMemo } from 'react';
import { Award, Calendar, Target } from 'lucide-react';
import type { StaffRole, StaffMember } from '../../types/staff.types';
import type { KPIConfig, KPIDailyValue } from '../../types/kpi.types';
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
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
  onSetTab: (tab: any) => void;
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
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onSaveDailyValue,
  onSetTab,
}: KpiViewProps) {
  // Global states
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ranks');
  const now = new Date();
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  );

  // Handlers
  const handleSubTabChange = useCallback((tab: SubTab) => setActiveSubTab(tab), []);
  const handleMonthYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonthYear(e.target.value);
  }, []);

  // Month options
  const monthOptions = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const m = (i + 1).toString().padStart(2, '0');
      return { value: `2026-${m}`, label: `Tháng ${m}/2026` };
    }),
  []);

  return (
    <div className="space-y-4 pb-10">
      {/* Module Header */}
      <ModuleHeader
        title="KPI & Thi đua"
        description="Quản lý tổng thể KPI — Theo dõi, đánh giá và nhập liệu thực tế cho nhân sự"
      />

      {/* Month selector + Sub tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Pill tabs */}
        <div className="bg-slate-100/90 backdrop-blur-md p-1 rounded-full flex items-center gap-1 w-fit shadow-xs border border-slate-200">
          {SUB_TABS.map(tab => (
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
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonthYear}
            onChange={handleMonthYearChange}
            className="px-3 h-9 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'ranks' && (
        <RanksTab
          staffMembers={staffMembers}
          kpiConfigs={kpiConfigs}
          kpiDailyValues={kpiDailyValues}
          selectedMonthYear={selectedMonthYear}
        />
      )}

      {activeSubTab === 'entry' && (
        <EntryTab
          staffMembers={staffMembers}
          kpiConfigs={kpiConfigs}
          kpiDailyValues={kpiDailyValues}
          selectedMonthYear={selectedMonthYear}
          onSaveDailyValue={onSaveDailyValue}
        />
      )}

      {activeSubTab === 'settings' && (
        <SettingsTab
          roles={roles}
          kpiConfigs={kpiConfigs}
          selectedMonthYear={selectedMonthYear}
          onCreateConfig={onCreateConfig}
          onUpdateConfig={onUpdateConfig}
          onDeleteConfig={onDeleteConfig}
        />
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
      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out active:scale-95 cursor-pointer border-0 ${
        isActive
          ? 'bg-white text-slate-800 border border-slate-200/50 shadow-xs'
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
});
