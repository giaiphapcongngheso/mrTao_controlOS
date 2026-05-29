import React from 'react';
import { Calendar, Layers, CheckCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input } from '../../../../share/ui';

interface ChecklistTabBarProps {
  subTab: 'today' | 'process' | 'completed';
  setSubTab: (tab: 'today' | 'process' | 'completed') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

/**
 * Navigation and filter tab bar for Checklist.
 * Contains tabs for today/process/completed views, searching items, and triggering advanced filters.
 */
const ChecklistTabBar = React.memo(function ChecklistTabBar({
  subTab,
  setSubTab,
  searchTerm,
  setSearchTerm,
}: ChecklistTabBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/90 overflow-x-auto scrollbar-none gap-0.5 shrink-0 w-full lg:w-auto text-left">
        <Button
          onClick={() => setSubTab('today')}
          variant="ghost"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
            subTab === 'today'
              ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Hôm nay</span>
        </Button>
        
        <Button
          onClick={() => setSubTab('process')}
          variant="ghost"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
            subTab === 'process'
              ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Theo quy trình</span>
        </Button>

        <Button
          onClick={() => setSubTab('completed')}
          variant="ghost"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 lg:flex-initial ${
            subTab === 'completed'
              ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-red-800'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Đã hoàn thành</span>
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 flex-1 lg:max-w-md w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder={
              subTab === 'process'
                ? 'Tìm kiếm quy trình chuẩn...'
                : 'Tìm kiếm công việc hôm nay...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            clearable={false}
            className="w-full text-sm font-bold pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white transition-all shadow-2xs"
          />
          {searchTerm && (
            <Button
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <Button
          title="Bộ lọc nâng cao"
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-350 transition-colors text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

export default ChecklistTabBar;
