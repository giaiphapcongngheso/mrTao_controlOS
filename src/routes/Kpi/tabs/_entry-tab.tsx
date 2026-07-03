import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Check, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { MobileCard } from '@/src/components/custom/mobile-card';
import { ScrollArea, ScrollBar } from '../../../shared/components/scroll-area';
import { Button } from '../../../../share/ui/button';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { KpiStatusBadge } from '../components/_kpi-status-badge';
import { EntryDialog } from '../components/_entry-dialog';
import {
  getDaysInMonthCount,
  buildDaysArray,
  formatValue,
  getWeekDays,
  getWeekActual,
  getWeekTarget,
} from '../kpi-utils';
import { exportKpiReportToExcel } from '../../../services/admin/kpi-excel-service';
import { useAppStore } from '../../../stores/app-store';
import { toastError, toastSuccess } from '../../../shared/lib/toast';
import type { StaffMember } from '../../../types/staff.types';
import type { KPIConfig, KPIDailyValue } from '../../../types/kpi.types';

interface EntryTabProps {
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  selectedMonthYear: string;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
}

export const EntryTab = React.memo(function EntryTab({
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  selectedMonthYear,
  onSaveDailyValue,
}: EntryTabProps) {
  const currentUser = useAppStore(state => state.currentUser);

  // Selection
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    const currentUserState = useAppStore.getState().currentUser;
    if (currentUserState && staffMembers.length > 0) {
      const matched = staffMembers.find(s =>
        s.status === 'active' &&
        (s.id === currentUserState.id || s.username.toLowerCase() === currentUserState.username.toLowerCase())
      );
      if (matched) return matched.id;
    }
    return staffMembers.find(s => s.status === 'active')?.id || '';
  });

  // Sync selectedStaffId with current user if not set yet or when staffMembers changes
  React.useEffect(() => {
    if (staffMembers.length > 0 && !selectedStaffId) {
      const matched = staffMembers.find(s =>
        s.status === 'active' &&
        (s.id === currentUser?.id || s.username.toLowerCase() === currentUser?.username?.toLowerCase())
      );
      const defaultId = matched?.id || staffMembers.find(s => s.status === 'active')?.id || '';
      setSelectedStaffId(defaultId);
    }
  }, [staffMembers, currentUser, selectedStaffId]);

  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // View mode
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);

  // Entry form
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Dialog
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [focusedKpiInputId, setFocusedKpiInputId] = useState<string | null>(null);

  // Derived values
  const daysInMonthCount = getDaysInMonthCount(selectedMonthYear);
  const daysInMonth = useMemo(() => buildDaysArray(daysInMonthCount), [daysInMonthCount]);

  const selectedStaff = useMemo(
    () => staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0],
    [staffMembers, selectedStaffId]
  );

  const staffConfigs = useMemo(() => {
    if (!selectedStaff) return [];
    return kpiConfigs.filter(c =>
      c.staffId === selectedStaff.id &&
      (c.month || '2026-06') === selectedMonthYear
    );
  }, [kpiConfigs, selectedStaff, selectedMonthYear]);

  // Load entry values when day/staff/month changes
  React.useEffect(() => {
    if (!selectedStaff) return;
    const initialEntry: Record<string, string> = {};
    const dateStr = `${selectedMonthYear}-${selectedDay.toString().padStart(2, '0')}`;

    staffConfigs.forEach(config => {
      const record = kpiDailyValues.find(
        v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
      );
      initialEntry[config.id] = record ? record.value.toString() : '';
    });
    setEntryValues(initialEntry);
    setSaveSuccessMsg(null);
  }, [selectedStaffId, selectedDay, kpiDailyValues, staffConfigs, selectedMonthYear, selectedStaff]);

  // Handlers
  const handleSaveDayValues = useCallback(async () => {
    if (!selectedStaff) return;
    const dateStr = `${selectedMonthYear}-${selectedDay.toString().padStart(2, '0')}`;

    try {
      for (const config of staffConfigs) {
        const valStr = entryValues[config.id] || '0';
        const numVal = parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;

        const payload: KPIDailyValue = {
          id: `${selectedStaff.id}_${config.id}_${dateStr}`,
          storeId: selectedStaff.storeId,
          staffId: selectedStaff.id,
          kpiConfigId: config.id,
          date: dateStr,
          value: numVal,
        };
        await onSaveDailyValue(payload);
      }
      toastSuccess(
        'Lưu số liệu KPI thành công',
        `Đã ghi nhận số liệu ngày ${selectedDay.toString().padStart(2, '0')}/${selectedMonthYear.split('-')[1]} cho ${selectedStaff.fullName}`
      );
      setSaveSuccessMsg(
        `Đã lưu thành công số liệu ngày ${selectedDay.toString().padStart(2, '0')}/${selectedMonthYear.split('-')[1]} cho ${selectedStaff.fullName}`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Lỗi khi lưu KPI ngày:', err);
      const errMsg = err?.message || 'Không thể kết nối với máy chủ. Vui lòng kiểm tra lại.';
      toastError('Lưu số liệu KPI thất bại', errMsg);
      throw err;
    }
  }, [selectedStaff, selectedMonthYear, selectedDay, staffConfigs, entryValues, onSaveDailyValue]);

  const handleEntryValueChange = useCallback((configId: string, value: string) => {
    setEntryValues(prev => ({ ...prev, [configId]: value }));
  }, []);

  const handleStaffChange = useCallback((val: string | number) => {
    setSelectedStaffId(String(val));
  }, []);

  const handleExportExcel = useCallback(() => {
    if (selectedStaff) {
      exportKpiReportToExcel(
        selectedStaff.fullName,
        selectedStaff.role,
        selectedMonthYear,
        staffConfigs,
        kpiDailyValues.filter(v => v.staffId === selectedStaff.id)
      );
    }
  }, [selectedStaff, selectedMonthYear, staffConfigs, kpiDailyValues]);

  const handleOpenEntryDialog = useCallback(() => {
    setIsEntryDialogOpen(true);
    setFocusedKpiInputId(null);
  }, []);

  const handleViewModeMonth = useCallback(() => {
    setViewMode('month');
    setSelectedWeekNum(null);
  }, []);

  const handleViewModeWeek = useCallback(() => {
    setViewMode('week');
    setSelectedWeekNum(1);
  }, []);

  const handleWeekSelectChange = useCallback((val: string | number) => {
    setSelectedWeekNum(Number(val));
  }, []);

  const handleWeekChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeekNum(parseInt(e.target.value));
  }, []);

  const handleDayChange = useCallback((day: number) => setSelectedDay(day), []);

  const handleClearFocusedInput = useCallback(() => setFocusedKpiInputId(null), []);

  const pillClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ease-out active:scale-95 border-0 cursor-pointer ${active
      ? 'bg-white text-slate-800 border border-slate-200/50 shadow-xs'
      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
    }`;

  if (!selectedStaff) return null;

  return (
    <>
      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left">
              <CardTitle className="text-base font-bold text-slate-800 tracking-wider">
                NHẬP LIỆU ACTION PLAN KPI ({viewMode === 'month' ? 'THÁNG' : 'CHI TIẾT TUẦN'})
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                Nhân viên báo cáo số thực tế đạt được hằng ngày của tháng. Click đúp vào ô thực tế trên bảng để sửa nhanh.
              </CardDescription>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto shrink-0">
              {/* View toggle */}
              <div className="bg-slate-100/80 p-1 rounded-full border border-slate-200 flex items-center gap-1 shadow-xs shrink-0 self-center md:self-auto">
                <button onClick={handleViewModeMonth} className={pillClass(viewMode === 'month')}>
                  Tháng
                </button>
                <button onClick={handleViewModeWeek} className={pillClass(viewMode === 'week')}>
                  Tuần
                </button>
              </div>

              {/* Week selector */}
              {viewMode === 'week' && (
                <CustomSelect
                  value={selectedWeekNum || 1}
                  onChangeValue={handleWeekSelectChange}
                  clearable={false}
                  containerClassName="w-full md:w-[180px] shrink-0"
                  className="font-bold text-sm w-full"
                  options={[
                    { value: 1, label: 'Tuần 1 (01 - 07)' },
                    { value: 2, label: 'Tuần 2 (08 - 14)' },
                    { value: 3, label: 'Tuần 3 (15 - 21)' },
                    { value: 4, label: 'Tuần 4 (22 - 28)' },
                    ...(daysInMonthCount > 28 ? [{ value: 5, label: `Tuần 5 (29 - ${daysInMonthCount})` }] : []),
                  ]}
                />
              )}

              {/* Staff selector */}
              <CustomSelect
                value={selectedStaffId}
                onChangeValue={handleStaffChange}
                clearable={false}
                containerClassName="w-full md:w-[200px] shrink-0"
                className="font-bold text-sm w-full"
                options={staffMembers.filter(s => s.status === 'active').map(s => ({
                  value: s.id,
                  label: `${s.fullName}`,
                }))}
                placeholder="Chọn nhân viên"
              />

              {/* Excel export */}
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="w-full md:w-auto font-bold cursor-pointer rounded-xl text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50 shrink-0 justify-center h-9"
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </Button>

              {/* Entry dialog trigger */}
              <Button onClick={handleOpenEntryDialog} size="sm" className="w-full md:w-auto font-bold cursor-pointer rounded-xl text-sm shrink-0 justify-center h-9">
                <Plus className="w-3.5 h-3.5" />
                Cập nhật
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* Success message */}
          {saveSuccessMsg && (
            <div className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-300 w-fit">
              <Check className="w-4 h-4 shrink-0" />
              {saveSuccessMsg}
            </div>
          )}

          {/* Back to month button */}
          {viewMode === 'week' && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleViewModeMonth} className="font-bold rounded-xl text-sm hover:bg-slate-50">
                ← Quay lại dạng Tháng
              </Button>
              <span className="text-sm text-slate-500 font-semibold">Đang xem dữ liệu Tuần {selectedWeekNum}</span>
            </div>
          )}

          {/* Action Plan Table */}
          <ActionPlanTable
            viewMode={viewMode}
            selectedWeekNum={selectedWeekNum}
            staffConfigs={staffConfigs}
            daysInMonth={daysInMonth}
            daysInMonthCount={daysInMonthCount}
            selectedMonthYear={selectedMonthYear}
            selectedStaff={selectedStaff}
            kpiDailyValues={kpiDailyValues}
            onDrillToWeek={(week) => {
              setSelectedWeekNum(week);
              setViewMode('week');
            }}
            onCellDoubleClick={(day, configId) => {
              setSelectedDay(day);
              setIsEntryDialogOpen(true);
              setFocusedKpiInputId(configId);
            }}
          />
        </CardContent>
      </Card>

      {/* Entry Dialog */}
      <EntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        staffName={selectedStaff.fullName}
        selectedDay={selectedDay}
        onDayChange={handleDayChange}
        daysInMonth={daysInMonth}
        selectedMonthYear={selectedMonthYear}
        staffConfigs={staffConfigs}
        entryValues={entryValues}
        onEntryValueChange={handleEntryValueChange}
        onSubmit={handleSaveDayValues}
        focusedKpiInputId={focusedKpiInputId}
        onClearFocusedInput={handleClearFocusedInput}
      />
    </>
  );
});

// ─── Action Plan Table (month + week views) ────────────────────
interface ActionPlanTableProps {
  viewMode: 'month' | 'week';
  selectedWeekNum: number | null;
  staffConfigs: KPIConfig[];
  daysInMonth: number[];
  daysInMonthCount: number;
  selectedMonthYear: string;
  selectedStaff: StaffMember;
  kpiDailyValues: KPIDailyValue[];
  onDrillToWeek: (week: number) => void;
  onCellDoubleClick: (day: number, configId: string) => void;
}

const ActionPlanTable = React.memo(function ActionPlanTable({
  viewMode,
  selectedWeekNum,
  staffConfigs,
  daysInMonth,
  daysInMonthCount,
  selectedMonthYear,
  selectedStaff,
  kpiDailyValues,
  onDrillToWeek,
  onCellDoubleClick,
}: ActionPlanTableProps) {
  if (staffConfigs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            BẢNG ACTION PLAN KPI CHI TIẾT ({viewMode === 'month' ? 'TÓM TẮT TUẦN' : '7 NGÀY CHI TIẾT'})
          </h4>
        </div>
        <div className="py-6 text-center text-sm text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl">
          Nhân viên này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}. Hãy cấu hình ở tab Thiết lập.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-left">
          BẢNG ACTION PLAN KPI CHI TIẾT ({viewMode === 'month' ? 'TÓM TẮT TUẦN' : '7 NGÀY CHI TIẾT'})
        </h4>
        {viewMode === 'month' && (
          <span className="text-sm font-semibold text-slate-500 hidden md:inline">Click "Xem chi tiết" ở mỗi cột tuần để xem/sửa chi tiết từng ngày ➔</span>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <ScrollArea className="w-full">
          <Table className="text-center font-sans text-sm">
            {viewMode === 'month' ? (
              <MonthViewContent
                staffConfigs={staffConfigs}
                daysInMonth={daysInMonth}
                daysInMonthCount={daysInMonthCount}
                selectedMonthYear={selectedMonthYear}
                selectedStaff={selectedStaff}
                kpiDailyValues={kpiDailyValues}
                onDrillToWeek={onDrillToWeek}
              />
            ) : (
              <WeekViewContent
                selectedWeekNum={selectedWeekNum || 1}
                staffConfigs={staffConfigs}
                daysInMonth={daysInMonth}
                daysInMonthCount={daysInMonthCount}
                selectedMonthYear={selectedMonthYear}
                selectedStaff={selectedStaff}
                kpiDailyValues={kpiDailyValues}
                onCellDoubleClick={onCellDoubleClick}
              />
            )}
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {staffConfigs.map((config, idx) => {
          const actuals = daysInMonth.map(day => {
            const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
            const record = kpiDailyValues.find(
              v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
            );
            return record ? record.value : 0;
          });

          const totalActual = actuals.reduce((sum, v) => sum + v, 0);
          const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
          const pctStr = (pct * 100).toFixed(0) + '%';

          return (
            <MobileCard key={config.id} delayIndex={idx} variant="bordered">
              <MobileCard.Header
                title={config.kpiName}
                badge={{
                  text: `% Đạt: ${pctStr}`,
                  variant: pct >= 0.95 ? 'success' : pct >= 0.7 ? 'warning' : 'error'
                }}
              />
              <MobileCard.Body className="p-3 space-y-3">
                <MobileCard.Grid
                  cols={2}
                  items={[
                    {
                      label: 'Mục tiêu tháng',
                      value: `${config.monthlyTarget.toLocaleString()} ${config.unit}`,
                    },
                    {
                      label: 'Thực tế đạt',
                      value: `${totalActual.toLocaleString()} ${config.unit}`,
                      valueClassName: 'font-sans font-bold text-amber-700',
                    },
                    {
                      label: 'Mục tiêu ngày',
                      value: `${config.dailyTarget.toLocaleString()} ${config.unit}`,
                    },
                    {
                      label: 'Trọng số',
                      value: `${(config.weight * 100).toFixed(0)}%`,
                    }
                  ]}
                />

                {viewMode === 'month' ? (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chi tiết theo tuần:</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map(week => {
                        const weekAct = getWeekActual(config.id, week, daysInMonthCount, selectedMonthYear, selectedStaff.id, kpiDailyValues);
                        return (
                          <button
                            key={week}
                            onClick={() => onDrillToWeek(week)}
                            className="flex flex-col items-center justify-center p-1 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition-all cursor-pointer"
                          >
                            <span className="text-[9px] font-black text-slate-500">T.{week}</span>
                            <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center">
                              {weekAct > 0 ? weekAct.toLocaleString() : '-'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">7 ngày trong tuần {selectedWeekNum}:</span>
                      <span className="text-[9px] font-semibold text-slate-400 leading-none">Chạm đúp để sửa số liệu ngày</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const weekDaysList = getWeekDays(selectedWeekNum || 1, daysInMonthCount);
                        return weekDaysList.map(day => {
                          const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
                          const record = kpiDailyValues.find(
                            v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                          );
                          const act = record ? record.value : 0;
                          return (
                            <button
                              key={day}
                              onDoubleClick={() => onCellDoubleClick(day, config.id)}
                              onTouchStart={(e) => {
                                // Simple touch double tap detection for mobile devices
                                const nowTime = Date.now();
                                const lastTouch = (e.currentTarget as any).lastTouch || 0;
                                if (nowTime - lastTouch < 300) {
                                  onCellDoubleClick(day, config.id);
                                }
                                (e.currentTarget as any).lastTouch = nowTime;
                              }}
                              className="flex flex-col items-center justify-center p-1 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 bg-white transition-all cursor-pointer min-w-0"
                            >
                              <span className="text-[9px] font-black text-slate-400">N.{day}</span>
                              <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center">
                                {act > 0 ? act.toLocaleString() : '-'}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </MobileCard.Body>
            </MobileCard>
          );
        })}
      </div>
    </div>
  );
});

// ─── Month View Content ────────────────────────────────────────
const MonthViewContent = React.memo(function MonthViewContent({
  staffConfigs, daysInMonth, daysInMonthCount, selectedMonthYear, selectedStaff, kpiDailyValues, onDrillToWeek,
}: Omit<ActionPlanTableProps, 'viewMode' | 'selectedWeekNum' | 'onCellDoubleClick'>) {
  return (
    <>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-left w-48 sticky left-0 bg-slate-50 z-10 border-r shadow-xs text-sm font-bold text-slate-700">Chỉ số KPI</TableHead>
          <TableHead className="w-20 border-r text-sm font-bold text-slate-700">Dòng</TableHead>
          {[1, 2, 3, 4, 5].map(week => {
            const ranges: Record<number, string> = { 1: '01-07', 2: '08-14', 3: '15-21', 4: '22-28', 5: `29-${daysInMonthCount}` };
            return (
              <TableHead key={week} className="w-32 text-center border-r font-bold text-sm text-slate-700 bg-slate-50">
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <span>Tuần {week} ({ranges[week]})</span>
                  <button
                    onClick={() => onDrillToWeek(week)}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-bold transition-all border-0 cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </TableHead>
            );
          })}
          <TableHead className="w-24 border-r text-right font-bold sticky right-[90px] bg-slate-50 border-l shadow-xs text-sm text-slate-700">Tổng</TableHead>
          <TableHead className="w-20 border-r text-right font-bold sticky right-12 bg-slate-50 border-l shadow-xs text-sm text-slate-700">% Đạt</TableHead>
          <TableHead className="w-12 text-center font-bold sticky right-0 bg-slate-50 border-l shadow-xs text-sm text-slate-700">Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staffConfigs.map(config => {
          const actuals = daysInMonth.map(day => {
            const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
            const record = kpiDailyValues.find(
              v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
            );
            return record ? record.value : 0;
          });

          const totalActual = actuals.reduce((sum, v) => sum + v, 0);
          const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
          const pctStr = (pct * 100).toFixed(0) + '%';

          return (
            <React.Fragment key={config.id}>
              {/* Target row */}
              <TableRow className="hover:bg-slate-50/20">
                <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r shadow-xs max-w-[192px] truncate" title={config.kpiName}>
                  {config.kpiName}
                </TableCell>
                <TableCell className="border-r font-bold text-slate-450 bg-slate-50/30 text-sm">Mục tiêu</TableCell>
                {[1, 2, 3, 4, 5].map(week => (
                  <TableCell key={week} className="border-r text-slate-400 font-semibold text-center">
                    {getWeekTarget(config, week, daysInMonthCount).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[90px] bg-white border-l shadow-xs">
                  {config.monthlyTarget.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-slate-400 sticky right-12 bg-white border-l shadow-xs">-</TableCell>
                <TableCell className="sticky right-0 bg-white border-l shadow-xs font-bold text-slate-400">-</TableCell>
              </TableRow>

              {/* Actual row */}
              <TableRow className="bg-amber-50/20 hover:bg-amber-50/40">
                <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-[#fefdfa] z-10 border-r shadow-xs max-w-[192px] truncate">
                  <span className="text-sm text-amber-650 font-bold">↳ Thực tế</span>
                </TableCell>
                <TableCell className="border-r font-bold text-amber-700 bg-amber-50/50 text-sm">Thực tế</TableCell>
                {[1, 2, 3, 4, 5].map(week => {
                  const weekAct = getWeekActual(config.id, week, daysInMonthCount, selectedMonthYear, selectedStaff.id, kpiDailyValues);
                  return (
                    <TableCell key={week} className={`border-r font-bold text-center ${weekAct > 0 ? 'text-amber-800' : 'text-slate-300'}`}>
                      {weekAct > 0 ? weekAct.toLocaleString() : '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="border-r text-right font-bold text-slate-800 sticky right-[90px] bg-[#fefdfa] border-l shadow-xs">
                  {totalActual.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-blue-600 sticky right-12 bg-[#fefdfa] border-l shadow-xs">
                  {pctStr}
                </TableCell>
                <TableCell className="sticky right-0 bg-[#fefdfa] border-l shadow-xs">
                  <KpiStatusBadge actual={totalActual} pct={pct} />
                </TableCell>
              </TableRow>
            </React.Fragment>
          );
        })}
      </TableBody>
    </>
  );
});

// ─── Week View Content ─────────────────────────────────────────
const WeekViewContent = React.memo(function WeekViewContent({
  selectedWeekNum, staffConfigs, daysInMonth, daysInMonthCount, selectedMonthYear, selectedStaff, kpiDailyValues, onCellDoubleClick,
}: Omit<ActionPlanTableProps, 'viewMode' | 'onDrillToWeek'> & { selectedWeekNum: number }) {
  const weekDaysList = getWeekDays(selectedWeekNum, daysInMonthCount);

  return (
    <>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-left w-48 sticky left-0 bg-slate-50 z-10 border-r shadow-xs text-sm font-bold text-slate-700">Chỉ số KPI</TableHead>
          <TableHead className="w-20 border-r text-sm font-bold text-slate-700">Dòng</TableHead>
          {weekDaysList.map(day => (
            <TableHead key={day} className="w-16 min-w-[64px] text-center border-r font-bold text-sm text-slate-700 bg-slate-50">
              Ngày {day.toString().padStart(2, '0')}/{selectedMonthYear.split('-')[1]}
            </TableHead>
          ))}
          <TableHead className="w-24 border-r text-right font-bold sticky right-[202px] bg-slate-50 border-l shadow-xs text-sm text-slate-700">Tổng tuần</TableHead>
          <TableHead className="w-24 border-r text-right font-bold sticky right-[112px] bg-slate-50 border-l shadow-xs text-sm text-slate-700">Tổng tháng</TableHead>
          <TableHead className="w-18 border-r text-right font-bold sticky right-12 bg-slate-50 border-l shadow-xs text-sm text-slate-700">% Đạt</TableHead>
          <TableHead className="w-12 text-center font-bold sticky right-0 bg-slate-50 border-l shadow-xs text-sm text-slate-700">Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staffConfigs.map(config => {
          const totalActual = daysInMonth.map(day => {
            const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
            const record = kpiDailyValues.find(
              v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
            );
            return record ? record.value : 0;
          }).reduce((sum, v) => sum + v, 0);

          const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
          const pctStr = (pct * 100).toFixed(0) + '%';
          const weekTarget = getWeekTarget(config, selectedWeekNum, daysInMonthCount);
          const weekAct = getWeekActual(config.id, selectedWeekNum, daysInMonthCount, selectedMonthYear, selectedStaff.id, kpiDailyValues);

          return (
            <React.Fragment key={config.id}>
              {/* Target row */}
              <TableRow className="hover:bg-slate-50/20">
                <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r shadow-xs max-w-[192px] truncate" title={config.kpiName}>
                  {config.kpiName}
                </TableCell>
                <TableCell className="border-r font-bold text-slate-450 bg-slate-50/30 text-sm">Mục tiêu</TableCell>
                {weekDaysList.map(day => (
                  <TableCell key={day} className="border-r text-slate-400 font-medium text-center text-sm">
                    {config.monthlyTarget > 0 ? config.dailyTarget.toLocaleString() : '1'}
                  </TableCell>
                ))}
                <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[202px] bg-white border-l shadow-xs text-sm">
                  {weekTarget.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[112px] bg-white border-l shadow-xs text-sm">
                  {config.monthlyTarget.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-slate-400 sticky right-12 bg-white border-l shadow-xs text-sm">-</TableCell>
                <TableCell className="sticky right-0 bg-white border-l shadow-xs font-bold text-slate-400 text-sm">-</TableCell>
              </TableRow>

              {/* Actual row */}
              <TableRow className="bg-amber-50/20 hover:bg-amber-50/40">
                <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-[#fefdfa] z-10 border-r shadow-xs max-w-[192px] truncate">
                  <span className="text-sm text-amber-650 font-bold">↳ Thực tế</span>
                </TableCell>
                <TableCell className="border-r font-bold text-amber-700 bg-amber-50/50 text-sm">Thực tế</TableCell>
                {weekDaysList.map(day => {
                  const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
                  const record = kpiDailyValues.find(
                    v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                  );
                  const act = record ? record.value : 0;
                  return (
                    <TableCell
                      key={day}
                      onDoubleClick={() => onCellDoubleClick(day, config.id)}
                      className={`border-r font-bold cursor-pointer select-none hover:bg-amber-100/50 transition-colors text-center text-sm ${act > 0 ? 'text-amber-800' : 'text-slate-300'}`}
                      title="Double-click để sửa số ngày này"
                    >
                      {act > 0 ? act.toLocaleString() : '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="border-r text-right font-bold text-amber-800 sticky right-[202px] bg-[#fefdfa] border-l shadow-xs text-sm">
                  {weekAct.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-slate-800 sticky right-[112px] bg-[#fefdfa] border-l shadow-xs text-sm">
                  {totalActual.toLocaleString()}
                </TableCell>
                <TableCell className="border-r text-right font-bold text-blue-600 sticky right-12 bg-[#fefdfa] border-l shadow-xs text-sm">
                  {pctStr}
                </TableCell>
                <TableCell className="sticky right-0 bg-[#fefdfa] border-l shadow-xs text-sm">
                  <KpiStatusBadge actual={totalActual} pct={pct} />
                </TableCell>
              </TableRow>
            </React.Fragment>
          );
        })}
      </TableBody>
    </>
  );
});
