import React from 'react';
import { Calendar, Layers, CheckCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input, Tabs, TabsList, TabsTrigger } from '../../../../share/ui';
import { CustomSelect } from '../../../../share/components/custom/custom-select';

interface ChecklistTabBarProps {
  subTab: 'today' | 'process' | 'completed';
  setSubTab: (tab: 'today' | 'process' | 'completed') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRoleCode: string;
  setSelectedRoleCode: (role: string) => void;
  roleOptions: Array<{ code: string; name: string }>;
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
  selectedRoleCode,
  setSelectedRoleCode,
  roleOptions,
}: ChecklistTabBarProps) {
  const handleTabChange = React.useCallback((value: string) => {
    setSubTab(value as 'today' | 'process' | 'completed');
  }, [setSubTab]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
      {/* Navigation Tabs + Role Select */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
        <Tabs value={subTab} onValueChange={handleTabChange} className="flex-1 sm:flex-initial text-left">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200/90 overflow-x-auto scrollbar-none gap-0.5 shrink-0 w-full sm:w-auto h-auto justify-start">
            <TabsTrigger
              value="today"
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-black rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent data-[state=active]:border-[#C21A1A] data-[state=active]:bg-white data-[state=active]:text-[#C21A1A] data-[state=active]:shadow-xs hover:data-[state=active]:bg-white"
            >
              <Calendar className="w-3.5 h-3.5 hidden sm:inline-block" />
              <span>Hôm nay</span>
            </TabsTrigger>

            <TabsTrigger
              value="process"
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-black rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent data-[state=active]:border-[#C21A1A] data-[state=active]:bg-white data-[state=active]:text-[#C21A1A] data-[state=active]:shadow-xs hover:data-[state=active]:bg-white"
            >
              <Layers className="w-3.5 h-3.5 hidden sm:inline-block" />
              <span>
                <span className="hidden sm:inline">Theo quy trình</span>
                <span className="sm:hidden inline">Quy trình</span>
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="completed"
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-black rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent data-[state=active]:border-[#C21A1A] data-[state=active]:bg-white data-[state=active]:text-[#C21A1A] data-[state=active]:shadow-xs hover:data-[state=active]:bg-white"
            >
              <CheckCircle className="w-3.5 h-3.5 hidden sm:inline-block" />
              <span>
                <span className="hidden sm:inline">Đã hoàn thành</span>
                <span className="sm:hidden inline">Đã xong</span>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {/* Role Select */}
        {(subTab === 'process' || subTab === 'today') && (
          <div className="w-full sm:w-52 shrink-0">
            <CustomSelect
              value={selectedRoleCode}
              onChangeValue={(value) => setSelectedRoleCode(String(value))}
              options={roleOptions.map((role) => ({
                label: role.name,
                value: role.code,
              }))}
              clearable={false}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors shadow-2xs text-sm font-bold"
            />
          </div>
        )}
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
