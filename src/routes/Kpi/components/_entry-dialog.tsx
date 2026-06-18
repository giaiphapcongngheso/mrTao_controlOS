import React, { useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../../../../share/ui/dialog';
import { Button } from '../../../../share/ui/button';
import { Label } from '../../../../share/ui/label';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { Target, TrendingUp, CalendarDays, User, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatValue } from '../kpi-utils';
import type { KPIConfig } from '../../../types/kpi.types';

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  selectedDay: number;
  onDayChange: (day: number) => void;
  daysInMonth: number[];
  selectedMonthYear: string;
  staffConfigs: KPIConfig[];
  entryValues: Record<string, string>;
  onEntryValueChange: (configId: string, value: string) => void;
  onSubmit: () => Promise<void>;
  focusedKpiInputId: string | null;
  onClearFocusedInput: () => void;
}

export const EntryDialog = React.memo(function EntryDialog({
  open,
  onOpenChange,
  staffName,
  selectedDay,
  onDayChange,
  daysInMonth,
  selectedMonthYear,
  staffConfigs,
  entryValues,
  onEntryValueChange,
  onSubmit,
  focusedKpiInputId,
  onClearFocusedInput,
}: EntryDialogProps) {
  const handleDaySelectChange = useCallback(
    (val: string | number) => onDayChange(Number(val)),
    [onDayChange]
  );

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
    onOpenChange(false);
  }, [onSubmit, onOpenChange]);

  const handleValueChange = useCallback(
    (configId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onEntryValueChange(configId, e.target.value);
    },
    [onEntryValueChange]
  );

  // Build day options for CustomSelect
  const dayOptions = useMemo(() =>
    daysInMonth.map(day => ({
      value: day,
      label: `Ngày ${day.toString().padStart(2, '0')}/${selectedMonthYear.split('-')[1]}`,
    })),
    [daysInMonth, selectedMonthYear]
  );

  // Count filled entries
  const filledCount = useMemo(
    () => staffConfigs.filter(c => {
      const val = entryValues[c.id];
      return val && val.trim() !== '' && val !== '0';
    }).length,
    [staffConfigs, entryValues]
  );

  const allFilled = filledCount === staffConfigs.length && staffConfigs.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[660px] sm:max-w-[660px] p-0 rounded-[22px] bg-white border border-slate-200 shadow-2xl text-left font-sans overflow-hidden"
      >
        {/* ── Header — đồng bộ chuẩn project ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <DialogHeader className="text-left space-y-0 flex-1 min-w-0">
              <DialogTitle className="text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#C21A1A]/10 text-[#C21A1A] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                Báo cáo số thực tế
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500 mt-1.5 pl-9">
                Ghi nhận kết quả KPI hằng ngày cho nhân sự
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── Context: Staff + Day — một hàng compact ── */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Nhân viên
              </Label>
              <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 flex items-center truncate">
                {staffName}
              </div>
            </div>

            <div>
              <Label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Ngày báo cáo
              </Label>
              <CustomSelect
                value={selectedDay}
                onChangeValue={handleDaySelectChange}
                clearable={false}
                options={dayOptions}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors text-sm"
                size="default"
              />
            </div>
          </div>
        </div>

        {/* ── KPI Entries ── */}
        <form onSubmit={handleFormSubmit} className="flex flex-col">
          <div className="px-5 py-4">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Chỉ số KPI ({staffConfigs.length})
                </span>
              </div>
              {staffConfigs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {allFilled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <span className={`text-xs font-black uppercase tracking-wider ${allFilled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {filledCount}/{staffConfigs.length} đã nhập
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable KPI list */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
              {staffConfigs.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Target className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">Chưa có chỉ số KPI nào được cấu hình</p>
                  <p className="text-xs text-slate-400 mt-0.5">Hãy thiết lập KPI ở tab Cài đặt trước</p>
                </div>
              ) : (
                staffConfigs.map(config => (
                  <KpiEntryItem
                    key={config.id}
                    config={config}
                    value={entryValues[config.id] || ''}
                    onChange={handleValueChange(config.id)}
                    shouldFocus={focusedKpiInputId === config.id && open}
                    onFocused={onClearFocusedInput}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Footer — đồng bộ chuẩn project (bg-slate-50) ── */}
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 focus:outline-none"
              >
                Hủy bỏ
              </Button>
            </DialogClose>
            {staffConfigs.length > 0 && (
              <Button
                type="submit"
                className="rounded-xl bg-[#C21A1A] px-5 py-2 text-sm font-black text-white transition-all hover:bg-[#A81515] focus:outline-none shadow-sm hover:shadow-md active:scale-[0.97] flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu báo cáo
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

// ─── Sub-component: KPI Entry Item ─────────────────────────────
const KpiEntryItem = React.memo(function KpiEntryItem({
  config,
  value,
  onChange,
  shouldFocus,
  onFocused,
}: {
  config: KPIConfig;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shouldFocus: boolean;
  onFocused: () => void;
}) {
  const hasValue = value.trim() !== '' && value !== '0';

  return (
    <div className={`group relative rounded-xl border p-3 flex items-center gap-3 transition-all duration-200 ${
      hasValue
        ? 'border-emerald-200/80 bg-emerald-50/30'
        : 'border-slate-200/80 bg-slate-50/30 hover:bg-slate-50/60'
    }`}>
      {/* Status indicator */}
      <div className={`w-1 self-stretch rounded-full shrink-0 transition-colors duration-300 ${
        hasValue ? 'bg-emerald-400' : 'bg-slate-200'
      }`} />

      {/* KPI info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">{config.kpiName}</h4>
          {hasValue && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-in fade-in zoom-in-50 duration-200" />
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium truncate mt-0.5 leading-tight">
          {config.goalName} · Target ngày: <span className="font-bold text-slate-600">{formatValue(config.dailyTarget, config.unit)}</span>
        </p>
      </div>

      {/* Input + Unit — chuẩn project Input style */}
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={value}
          ref={(el) => {
            if (el && shouldFocus) {
              setTimeout(() => el.focus(), 150);
              onFocused();
            }
          }}
          onChange={onChange}
          className="w-[110px] h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-sans font-bold text-sm text-slate-900 rounded-xl outline-none transition-colors text-right placeholder:text-slate-300 placeholder:font-normal"
        />
        <span className="text-xs font-bold text-slate-400 w-7 shrink-0 text-center">{config.unit}</span>
      </div>
    </div>
  );
});
