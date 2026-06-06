import React from 'react';
import { Button, SearchInput } from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';
import type { SOPIssueCategory, SOPIssueStatusFilter } from '../../../types/issues.types';

type IssueCategoryFilter = 'all' | SOPIssueCategory;

interface CategoryFilterConfig {
  filter: IssueCategoryFilter;
  label: string;
  count: number;
}

interface CategoryFilterButtonProps {
  config: CategoryFilterConfig;
  isActive: boolean;
  onSelectFilter: (filter: IssueCategoryFilter) => void;
}

const CategoryFilterButton = React.memo(function CategoryFilterButton({
  config,
  isActive,
  onSelectFilter,
}: CategoryFilterButtonProps) {
  const handleClick = React.useCallback(() => {
    onSelectFilter(config.filter);
  }, [config.filter, onSelectFilter]);

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial h-8 border border-transparent shadow-none",
        isActive
          ? "bg-white text-[#C21A1A] border-slate-200/60 shadow-2xs font-black hover:bg-white"
          : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
      )}
    >
      {config.label} ({config.count})
    </Button>
  );
});

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
  const filterConfigs = React.useMemo<CategoryFilterConfig[]>(
    () => [
      { filter: 'all', label: 'Tất cả', count: totalCount },
      { filter: 'sop_error', label: 'Lỗi SOP', count: sopCount },
      { filter: 'exception', label: 'Ngoại lệ', count: exceptionCount },
      { filter: 'risk', label: 'Rủi ro', count: riskCount },
      { filter: 'improvement', label: 'Cải tiến', count: improvementCount },
    ],
    [exceptionCount, improvementCount, riskCount, sopCount, totalCount]
  );

  return (
    <div className="flex flex-col md:flex-row gap-3.5 justify-between items-stretch md:items-center text-left">
      {/* Tabs - Aligned on left */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none gap-0.5 shrink-0 self-start md:self-auto w-full md:w-auto">
        {filterConfigs.map((config) => (
          <CategoryFilterButton
            key={config.filter}
            config={config}
            isActive={selectedFilter === config.filter}
            onSelectFilter={onSelectFilter}
          />
        ))}
      </div>

      <div className="flex flex-row items-center justify-between sm:justify-end gap-2 flex-1 w-full">
        {/* Record count indicator and Clear filters button */}
        <div className="flex items-center gap-2 shrink-0 justify-start sm:justify-center">
          <span className="text-sm font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg select-none">
            Hiển thị {filteredCount}/{totalCount}
          </span>
          {(selectedFilter !== 'all' || selectedStatus !== 'all' || searchTerm) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-sm font-bold text-[#C21A1A] border-rose-100 hover:bg-rose-50/50 h-8 rounded-lg cursor-pointer shadow-none"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Search bar input - aligned inline */}
        <div className="flex gap-2 flex-1 max-w-[180px] sm:max-w-md w-full">
          <SearchInput
            placeholder="Tìm theo tên lỗi, người liên quan, quy trình..."
            value={searchTerm}
            onChange={onSearchChange}
          />
        </div>
      </div>
    </div>
  );
});

export default SearchFilterSection;
