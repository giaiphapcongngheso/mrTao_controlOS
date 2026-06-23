import React from 'react';
import { BarChart3, Layers, AlertTriangle, HelpCircle, AlertOctagon, CheckCircle } from 'lucide-react';
import { Button, SearchInput, Tabs, TabsList, TabsTrigger } from '../../../../share/ui';
import type { SOPIssueCategory, SOPIssueStatusFilter } from '../../../types/issues.types';

export type IssueCategoryFilter = 'overview' | 'all' | SOPIssueCategory;

interface SearchFilterSectionProps {
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
}

// Shared tab trigger class for DRY purposes
const TAB_TRIGGER_CLASS = "!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent";

const SearchFilterSection = React.memo(function SearchFilterSection({
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
}: SearchFilterSectionProps) {
  const handleTabChange = React.useCallback((value: string) => {
    onSelectFilter(value as IssueCategoryFilter);
  }, [onSelectFilter]);

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
              <span>Cải tiến ({improvementCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Line 2: Filters Horizontal Block (Card container) — Hidden on Overview tab ── */}
      {!isOverviewTab && (
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3.5 justify-between">
            {/* Record count indicator and Clear filters button */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg select-none">
                Hiển thị {filteredCount}/{totalCount}
              </span>
              {(selectedFilter !== 'all' || selectedStatus !== 'all' || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-xs font-bold text-[#C21A1A] border-rose-100 hover:bg-rose-50/50 h-8 rounded-lg cursor-pointer shadow-none"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* Search bar input - aligned inline */}
            <div className="flex gap-2 flex-1 max-w-full lg:max-w-md w-full">
              <SearchInput
                placeholder="Tìm theo tên lỗi, người liên quan, quy trình..."
                value={searchTerm}
                onChange={onSearchChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SearchFilterSection;

