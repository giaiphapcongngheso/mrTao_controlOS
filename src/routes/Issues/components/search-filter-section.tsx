import React from 'react';
import { Search } from 'lucide-react';

interface SearchFilterSectionProps {
  selectedFilter: 'all' | 'sop_error' | 'exception' | 'risk' | 'improvement';
  onSelectFilter: (filter: 'all' | 'sop_error' | 'exception' | 'risk' | 'improvement') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  sopCount: number;
  exceptionCount: number;
  riskCount: number;
  improvementCount: number;
  paginationControls?: React.ReactNode;
}

const SearchFilterSection = React.memo(function SearchFilterSection({
  selectedFilter,
  onSelectFilter,
  searchTerm,
  onSearchChange,
  totalCount,
  sopCount,
  exceptionCount,
  riskCount,
  improvementCount,
  paginationControls,
}: SearchFilterSectionProps) {
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleClearSearch = React.useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="flex flex-col md:flex-row gap-3.5 justify-between items-stretch md:items-center text-left">
      {/* Tabs - Aligned on left */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none gap-0.5 shrink-0 self-start md:self-auto w-full md:w-auto">
        <button
          onClick={() => onSelectFilter('all')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
            selectedFilter === 'all'
              ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Tất cả ({totalCount})
        </button>
        
        <button
          onClick={() => onSelectFilter('sop_error')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
            selectedFilter === 'sop_error'
              ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Lỗi SOP ({sopCount})
        </button>

        <button
          onClick={() => onSelectFilter('exception')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
            selectedFilter === 'exception'
              ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ngoại lệ ({exceptionCount})
        </button>

        <button
          onClick={() => onSelectFilter('risk')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
            selectedFilter === 'risk'
              ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Rủi ro ({riskCount})
        </button>

        <button
          onClick={() => onSelectFilter('improvement')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
            selectedFilter === 'improvement'
              ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Cải tiến ({improvementCount})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 flex-1 md:justify-end w-full">
        {paginationControls && (
          <div className="flex shrink-0 justify-start sm:justify-center">
            {paginationControls}
          </div>
        )}

        {/* Search bar input - aligned inline */}
        <div className="flex gap-2 flex-1 md:max-w-md w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên lỗi, người liên quan, quy trình..."
            value={searchTerm}
            onChange={handleInputChange}
            className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] bg-white transition-all shadow-2xs"
          />
          {searchTerm && (
            <button 
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold font-sans cursor-pointer hover:underline"
            >
              Xóa
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
});

export default SearchFilterSection;
