import React from 'react';
import {
  BarChart3,
  Layers,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  CheckCircle,
  Search,
  RotateCw,
} from 'lucide-react';
import { Button, Input, Tabs, TabsList, TabsTrigger } from '../../../../share/ui';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import type { SOPIssueCategory, SOPIssueStatusFilter } from '../../../types/issues.types';

// ============================================================================
// Types
// ============================================================================

export type IssueCategoryFilter = 'overview' | 'all' | SOPIssueCategory;

type SelectOption = {
  label: string;
  value: string;
};

interface IssuesTabBarProps {
  selectedFilter: IssueCategoryFilter;
  onSelectFilter: (filter: IssueCategoryFilter) => void;
  selectedStatus: SOPIssueStatusFilter;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  sopCount: number;
  exceptionCount: number;
  riskCount: number;
  improvementCount: number;
  onClearFilters: () => void;
  // New filter states and callbacks for Pro Max UI
  selectedPriority: string;
  onPriorityChange: (val: string) => void;
  selectedProcess: string;
  onProcessChange: (val: string) => void;
  selectedAssignee: string;
  onAssigneeChange: (val: string) => void;
  selectedMonth: string;
  onMonthChange: (val: string) => void;
  processOptions: SelectOption[];
  assigneeOptions: SelectOption[];
  monthOptions: SelectOption[];
}

// ============================================================================
// Shared tab trigger class — matching ChecklistTabBar template
// ============================================================================

const TAB_TRIGGER_CLASS =
  '!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent';

const priorityOptions = [
  { label: 'Tất cả độ ưu tiên', value: 'all' },
  { label: 'Cao', value: 'High' },
  { label: 'Trung bình', value: 'Medium' },
  { label: 'Thấp', value: 'Low' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Modern, flat navigation and filter tab bar for Issues module.
 * Styled exactly like the premium Mr. Táo template (ChecklistTabBar).
 */
const IssuesTabBar = React.memo(function IssuesTabBar({
  selectedFilter,
  onSelectFilter,
  selectedStatus,
  searchTerm,
  onSearchChange,
  totalCount,
  filteredCount,
  sopCount,
  exceptionCount,
  riskCount,
  improvementCount,
  onClearFilters,
  selectedPriority,
  onPriorityChange,
  selectedProcess,
  onProcessChange,
  selectedAssignee,
  onAssigneeChange,
  selectedMonth,
  onMonthChange,
  processOptions,
  assigneeOptions,
  monthOptions,
}: IssuesTabBarProps) {
  const handleTabChange = React.useCallback(
    (value: string) => {
      onSelectFilter(value as IssueCategoryFilter);
    },
    [onSelectFilter]
  );

  const isOverviewTab = selectedFilter === 'overview';

  return (
    <div className="space-y-4 text-left font-sans w-full">
      {/* ── Line 1: Tab Navigation (Inline on background) ── */}
      <div className="border-b border-slate-200 pb-0">
        <Tabs value={selectedFilter} onValueChange={handleTabChange} className="w-full">
          <TabsList className="!bg-transparent !p-0 flex !rounded-none gap-6 sm:gap-8 justify-start !h-auto w-full overflow-x-auto scrollbar-none !border-none !shadow-none">
            <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Tổng quan</span>
            </TabsTrigger>

            <TabsTrigger value="all" className={TAB_TRIGGER_CLASS}>
              <Layers className="w-4 h-4 shrink-0" />
              <span>Tất cả ({totalCount})</span>
            </TabsTrigger>

            <TabsTrigger value="sop_error" className={TAB_TRIGGER_CLASS}>
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>Lỗi SOP ({sopCount})</span>
            </TabsTrigger>

            <TabsTrigger value="exception" className={TAB_TRIGGER_CLASS}>
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Ngoại lệ ({exceptionCount})</span>
            </TabsTrigger>

            <TabsTrigger value="risk" className={TAB_TRIGGER_CLASS}>
              <AlertOctagon className="w-4 h-4 shrink-0 text-purple-500" />
              <span>Rủi ro ({riskCount})</span>
            </TabsTrigger>

            <TabsTrigger value="improvement" className={TAB_TRIGGER_CLASS}>
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Sáng kiến ({improvementCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Line 2: Filters Horizontal Block (Card container) — Hidden on Overview tab ── */}
      {!isOverviewTab && (
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3.5 justify-between">
            <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
              {/* Filter 1: Search Bar */}
              <div className="flex flex-col gap-1 text-left flex-1 min-w-[200px] lg:max-w-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Tìm kiếm nhanh</span>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm theo tên lỗi, người xử lý..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    clearable={false}
                    className="w-full pl-10 pr-4 h-9.5 text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl transition-all placeholder:text-slate-400 placeholder:text-xs"
                  />
                </div>
              </div>

              {/* Filter 2: Priority Selection */}
              <div className="flex flex-col gap-1 text-left min-w-[130px] flex-1 sm:flex-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Mức độ ưu tiên</span>
                <CustomSelect
                  value={selectedPriority}
                  onChangeValue={(value) => onPriorityChange(String(value))}
                  options={priorityOptions}
                  clearable={false}
                  placeholder="Chọn ưu tiên..."
                  className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                />
              </div>

              {/* Filter 3: Process Selection */}
              <div className="flex flex-col gap-1 text-left min-w-[150px] flex-1 sm:flex-none max-w-[220px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Quy trình</span>
                <CustomSelect
                  value={selectedProcess}
                  onChangeValue={(value) => onProcessChange(String(value))}
                  options={processOptions}
                  clearable={false}
                  placeholder="Chọn quy trình..."
                  className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                />
              </div>

              {/* Filter 4: Assignee Selection */}
              <div className="flex flex-col gap-1 text-left min-w-[150px] flex-1 sm:flex-none max-w-[220px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Người xử lý</span>
                <CustomSelect
                  value={selectedAssignee}
                  onChangeValue={(value) => onAssigneeChange(String(value))}
                  options={assigneeOptions}
                  clearable={false}
                  placeholder="Chọn người xử lý..."
                  className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                />
              </div>

              {/* Filter 5: Date Selector */}
              <div className="flex flex-col gap-1 text-left min-w-[130px] flex-1 sm:flex-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Thời gian</span>
                <CustomSelect
                  value={selectedMonth}
                  onChangeValue={(value) => onMonthChange(String(value))}
                  options={monthOptions}
                  clearable={false}
                  placeholder="Chọn thời gian..."
                  className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                />
              </div>
            </div>

            {/* Record count indicator and Clear filters button */}
            <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto">
              <span className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 text-center w-full">Hiển thị</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl select-none">
                  {filteredCount}/{totalCount} mục
                </span>
                {(selectedPriority !== 'all' || selectedProcess !== 'all' || selectedAssignee !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all' || searchTerm) && (
                  <Button
                    variant="ghost"
                    onClick={onClearFilters}
                    className="h-9.5 px-3 hover:bg-rose-50 text-[#C21A1A] font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer border-none"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default IssuesTabBar;

