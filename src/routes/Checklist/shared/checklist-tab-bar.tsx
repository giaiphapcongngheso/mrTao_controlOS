import React, { useMemo } from 'react';
import { Calendar, Layers, History, Search, RotateCw, Ruler, UserCheck, CheckSquare, Plus } from 'lucide-react';
import { Button, Input, Tabs, TabsList, TabsTrigger } from '../../../../share/ui';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import type { ChecklistItem } from '../../../types/checklist.types';
import { useQuery } from '@tanstack/react-query';
import { staffService } from '../../../services/admin/staff-service';

interface ChecklistTabBarProps {
  subTab: 'today' | 'checklist_template' | 'process' | 'history';
  setSubTab: (tab: 'today' | 'checklist_template' | 'process' | 'history') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRoleCode: string;
  setSelectedRoleCode: (role: string) => void;
  roleOptions: Array<{ code: string; name: string }>;
  items: ChecklistItem[];
  selectedPerformer: string;
  setSelectedPerformer: (performer: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showHistory?: boolean;
  showRoleSelect?: boolean;
  isOwner?: boolean;
  currentUser?: any;
  // Checklist template filters
  templateFilterRole?: string;
  setTemplateFilterRole?: (role: string) => void;
  templateFilterFrequency?: string;
  setTemplateFilterFrequency?: (freq: string) => void;
  templateFilterStatus?: string;
  setTemplateFilterStatus?: (status: string) => void;
  templateSearchTerm?: string;
  setTemplateSearchTerm?: (term: string) => void;
  // Callback mở Sheet tạo mới checklist mẫu
  canCreate?: boolean;
  onOpenCreateTemplate?: () => void;
}

/**
 * Modern, flat navigation and filter tab bar for Checklist.
 * Styled exactly like the premium Mr. Táo template.
 */
const ChecklistTabBar = React.memo(function ChecklistTabBar({
  subTab,
  setSubTab,
  searchTerm,
  setSearchTerm,
  selectedRoleCode,
  setSelectedRoleCode,
  roleOptions,
  items,
  selectedPerformer,
  setSelectedPerformer,
  selectedStatus,
  setSelectedStatus,
  selectedDate,
  setSelectedDate,
  onRefresh,
  isRefreshing = false,
  showHistory = false,
  showRoleSelect = false,
  isOwner = false,
  currentUser,
  templateFilterRole = 'all',
  setTemplateFilterRole,
  templateFilterFrequency = 'all',
  setTemplateFilterFrequency,
  templateFilterStatus = 'all',
  setTemplateFilterStatus,
  templateSearchTerm = '',
  setTemplateSearchTerm,
  canCreate = false,
  onOpenCreateTemplate,
}: ChecklistTabBarProps) {
  
  const handleTabChange = React.useCallback((value: string) => {
    setSubTab(value as 'today' | 'checklist_template' | 'process' | 'history');
  }, [setSubTab]);

  // Query full staff list to filter performers by selected role code
  const { data: staffList = [] } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => staffService.getAll(),
  });

  // Extract unique performers dynamically from items or full staff list of selected role
  const performerOptions = useMemo(() => {
    const normalizedRole = selectedRoleCode.trim().toUpperCase();
    
    // Find the current role object to get its friendly name (e.g., "Bán hàng") for matching old staff records
    const selectedRole = roleOptions.find(r => r.code.toUpperCase() === normalizedRole);
    const roleNameUpper = selectedRole ? selectedRole.name.trim().toUpperCase() : '';
    
    // 1. Get names of active staff members belonging to the currently selected role
    let filteredStaff = staffList.filter((s) => {
      if (s.status !== 'active') return false;
      const staffRoleCode = (s.role || '').trim().toUpperCase();
      const staffRoleId = (s.roleId || '').trim().toUpperCase();
      return staffRoleCode === normalizedRole || 
             (roleNameUpper && staffRoleCode === roleNameUpper) ||
             staffRoleId === `ROLE-${normalizedRole}` ||
             staffRoleId === normalizedRole;
    });
    
    let names = filteredStaff.map((s) => s.fullName).filter(Boolean);

    // 2. Fallback: If no staff found/loaded, extract from task checklist checkers of this role
    if (names.length === 0) {
      const roleItems = items.filter(it => (it.roleCode || '').trim().toUpperCase() === normalizedRole);
      names = Array.from(new Set(roleItems.map((it) => it.checkedByName).filter(Boolean))) as string[];
    }

    // 3. Filter out admin/owner roles
    names = names.filter(name => {
      const lower = name.toLowerCase().trim();
      return lower !== 'admin' && 
             lower !== 'quản trị viên' && 
             lower !== 'quản trị viên hệ thống' &&
             lower !== 'chủ cửa hàng' &&
             lower !== 'chu_cua_hang';
    });

    // 4. Ensure current user is in list if not owner
    if (!isOwner && currentUser?.fullName) {
      const lowerFull = currentUser.fullName.toLowerCase().trim();
      if (
        lowerFull !== 'admin' && 
        lowerFull !== 'quản trị viên' && 
        lowerFull !== 'quản trị viên hệ thống' &&
        lowerFull !== 'chủ cửa hàng' &&
        lowerFull !== 'chu_cua_hang' &&
        !names.includes(currentUser.fullName)
      ) {
        names.push(currentUser.fullName);
      }
    }

    return [
      { label: 'Tất cả người thực hiện', value: 'all' },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [staffList, items, selectedRoleCode, isOwner, currentUser?.fullName]);

  const statusOptions = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Chưa làm', value: 'not_completed' },
    { label: 'Đang làm', value: 'in_progress' },
    { label: 'Đã xong', value: 'completed' },
    { label: 'Quá hạn', value: 'late' },
  ];

  return (
    <div className="space-y-4 text-left font-sans">
      {/* ── Line 1: Tab Navigation (Inline on background) ── */}
      <div className="border-b border-slate-200 pb-0">
        <Tabs value={subTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="!bg-transparent !p-0 flex !rounded-none gap-6 sm:gap-8 justify-start !h-auto w-full overflow-x-auto scrollbar-none !border-none !shadow-none">
            <TabsTrigger
              value="today"
              className="!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Hôm nay</span>
            </TabsTrigger>

            {showHistory && (
              <TabsTrigger
                value="checklist_template"
                className="!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
              >
                <Ruler className="w-4 h-4 shrink-0" />
                <span>Checklist mẫu</span>
              </TabsTrigger>
            )}

            <TabsTrigger
              value="process"
              className="!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Quy trình SOP</span>
            </TabsTrigger>

            {showHistory && (
              <TabsTrigger
                value="history"
                className="!flex-none flex items-center gap-1.5 px-0 !pb-3 text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
              >
                <History className="w-4 h-4 shrink-0" />
                <span>Lịch sử</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Line 2: Filters Horizontal Block (Card container) ── */}
      {subTab !== 'history' && (
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3.5 justify-between">
            {subTab === 'checklist_template' ? (
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {/* Lọc Vai trò */}
                <div className="flex flex-col gap-1 text-left min-w-[150px] flex-1 sm:flex-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Vai trò</span>
                  <CustomSelect
                    value={templateFilterRole}
                    onChangeValue={(value) => setTemplateFilterRole?.(String(value))}
                    options={[
                      { label: 'Tất cả vai trò', value: 'all' },
                      ...roleOptions.map((role) => ({
                        label: role.name,
                        value: role.code,
                      }))
                    ]}
                    clearable={false}
                    placeholder="Chọn vai trò..."
                    className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                  />
                </div>

                {/* Lọc Tần suất */}
                <div className="flex flex-col gap-1 text-left min-w-[140px] flex-1 sm:flex-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Tần suất</span>
                  <CustomSelect
                    value={templateFilterFrequency}
                    onChangeValue={(value) => setTemplateFilterFrequency?.(String(value))}
                    options={[
                      { label: 'Tất cả tần suất', value: 'all' },
                      { label: 'Hàng ngày', value: 'daily' },
                      { label: 'Hàng tuần', value: 'weekly' },
                      { label: 'Hàng tháng', value: 'monthly' }
                    ]}
                    clearable={false}
                    placeholder="Chọn tần suất..."
                    className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                  />
                </div>

                {/* Lọc Trạng thái */}
                <div className="flex flex-col gap-1 text-left min-w-[140px] flex-1 sm:flex-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Trạng thái</span>
                  <CustomSelect
                    value={templateFilterStatus}
                    onChangeValue={(value) => setTemplateFilterStatus?.(String(value))}
                    options={[
                      { label: 'Tất cả trạng thái', value: 'all' },
                      { label: 'Đang dùng', value: 'active' },
                      { label: 'Tạm ẩn', value: 'hidden' }
                    ]}
                    clearable={false}
                    placeholder="Chọn trạng thái..."
                    className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                  />
                </div>

                {/* Tìm kiếm nhanh */}
                <div className="flex flex-col gap-1 text-left flex-1 min-w-[200px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Tìm kiếm nhanh</span>
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm mẫu checklist..."
                      value={templateSearchTerm}
                      onChange={(e) => setTemplateSearchTerm?.(e.target.value)}
                      clearable={false}
                      className="w-full pl-10 pr-4 h-9.5 text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl transition-all placeholder:text-slate-400 placeholder:text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {/* Filter 2: Role Selection */}
                {showRoleSelect && (
                  <div className="flex flex-col gap-1 text-left min-w-[150px] flex-1 sm:flex-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Vai trò</span>
                    <CustomSelect
                      value={selectedRoleCode}
                      onChangeValue={(value) => setSelectedRoleCode(String(value))}
                      options={roleOptions.map((role) => ({
                        label: role.name,
                        value: role.code,
                      }))}
                      clearable={false}
                      placeholder="Chọn vai trò..."
                      className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                    />
                  </div>
                )}

                {/* Filter 3: Performer Selection */}
                {subTab === 'today' && (
                  <div className="flex flex-col gap-1 text-left min-w-[160px] flex-1 sm:flex-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Người thực hiện</span>
                    <CustomSelect
                      value={selectedPerformer}
                      onChangeValue={(value) => setSelectedPerformer(String(value))}
                      options={performerOptions}
                      clearable={false}
                      disabled={!isOwner}
                      placeholder="Chọn người thực hiện..."
                      className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                    />
                  </div>
                )}

                {/* Filter 4: Status Selection */}
                {subTab === 'today' && (
                  <div className="flex flex-col gap-1 text-left min-w-[140px] flex-1 sm:flex-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Trạng thái</span>
                    <CustomSelect
                      value={selectedStatus}
                      onChangeValue={(value) => setSelectedStatus(String(value))}
                      options={statusOptions}
                      clearable={false}
                      placeholder="Chọn trạng thái..."
                      className="w-full h-9.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
                    />
                  </div>
                )}

                {/* Search bar */}
                <div className="flex flex-col gap-1 text-left flex-1 min-w-[200px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Tìm kiếm nhanh</span>
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={
                        subTab === 'process'
                          ? 'Tìm kiếm quy trình chuẩn...'
                          : 'Tìm theo tên việc, mô tả...'
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      clearable={false}
                      className="w-full pl-10 pr-4 h-9.5 text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl transition-all placeholder:text-slate-400 placeholder:text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Button: Sync or Create Template */}
            {subTab === 'checklist_template' ? (
              canCreate && onOpenCreateTemplate && (
                <div className="flex flex-col gap-1 items-start lg:items-center shrink-0 self-start lg:self-auto animate-in fade-in duration-200">
                  <span className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 text-center">Tạo mới</span>
                  <Button
                    type="button"
                    onClick={onOpenCreateTemplate}
                    className="h-9.5 px-4 bg-[#C21A1A] hover:bg-[#A81515] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Tạo mẫu mới</span>
                  </Button>
                </div>
              )
            ) : (
              onRefresh && (
                <div className="flex flex-col gap-1 items-start lg:items-center shrink-0 self-start lg:self-auto">
                  <span className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1 text-center">Đồng bộ</span>
                  <Button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="h-9.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Đồng bộ</span>
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ChecklistTabBar;
