import React, { useCallback, useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock3, Download, Search, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import DateRangeInput from '../../../../share/components/custom/date-range-input';
import type { SystemLog } from '../StaffPermissionsView.types';
import { Button, Input } from '../../../../share/ui';
import { CustomTable } from '../../../../share/components/custom-table';
import type { ColumnDef } from '@tanstack/react-table';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { MobileCard } from '../../../components/custom/mobile-card';

interface LogsTabContentProps {
  logs: SystemLog[];
  isOwner: boolean;
  onClearLogs: () => void;
}

const actionOptions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'SYNC', 'RESET', 'OTHER'] as const;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getActionTone(actionType: SystemLog['actionType']) {
  switch (actionType) {
    case 'CREATE':
      return 'bg-emerald-50 border border-emerald-100/50 text-emerald-700';
    case 'UPDATE':
      return 'bg-sky-50 border border-sky-100/50 text-sky-700';
    case 'DELETE':
      return 'bg-rose-50 border border-rose-100/50 text-rose-755';
    case 'SYNC':
      return 'bg-amber-50 border border-amber-105/50 text-amber-700';
    case 'RESET':
      return 'bg-slate-100 border border-slate-200/50 text-slate-700';
    default:
      return 'bg-violet-50 border border-violet-100/50 text-violet-750';
  }
}

function getActionLabel(actionType: SystemLog['actionType']) {
  switch (actionType) {
    case 'CREATE':
      return 'Tạo mới';
    case 'UPDATE':
      return 'Cập nhật';
    case 'DELETE':
      return 'Xóa';
    case 'SYNC':
      return 'Đồng bộ';
    case 'RESET':
      return 'Đặt lại';
    default:
      return actionType === 'OTHER' ? 'Khác' : actionType;
  }
}

const columns: ColumnDef<SystemLog>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Thời điểm',
    size: 180,
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <Clock3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{formatTimestamp(log.timestamp)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'actor',
    header: 'Người thao tác',
    size: 220,
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="min-w-[180px] space-y-0.5 text-left">
          <div className="text-xs font-extrabold text-slate-800 leading-tight">{log.actor}</div>
          <div className="text-[10px] font-bold text-slate-450 leading-none">{log.role}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'actionType',
    header: 'Hành động',
    size: 120,
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-solid ${getActionTone(log.actionType)}`}>
          {getActionLabel(log.actionType)}
        </span>
      );
    },
  },
  {
    accessorKey: 'target',
    header: 'Đối tượng',
    size: 180,
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    cell: ({ row }) => {
      const log = row.original;
      return <div className="text-xs font-bold text-slate-650">{log.target}</div>;
    },
  },
  {
    accessorKey: 'details',
    header: 'Chi tiết',
    size: 450,
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="min-w-[320px] max-w-[580px] whitespace-normal text-xs leading-relaxed text-slate-550 font-medium">
          {log.details}
        </div>
      );
    },
  },
];

// ── Sub-component: System Logs Cards (Mobile) ──
const LogsTabMobileCards = React.memo(function LogsTabMobileCards({ logs }: { logs: SystemLog[] }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  if (logs.length === 0) {
    return <p className="text-sm text-slate-400 font-medium italic text-center py-6">Không có log phù hợp.</p>;
  }

  const paginatedLogs = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return logs.slice(start, start + pagination.pageSize);
  }, [logs, pagination.pageIndex, pagination.pageSize]);

  const totalPages = Math.ceil(logs.length / pagination.pageSize);

  const getAccentColor = (actionType: SystemLog['actionType']) => {
    switch (actionType) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'DELETE': return 'red';
      case 'SYNC': return 'amber';
      case 'RESET': return 'slate';
      default: return 'none';
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3">
        {paginatedLogs.map((log, idx) => (
          <MobileCard
            key={log.id}
            variant="bordered"
            accentColor={getAccentColor(log.actionType)}
            accentPosition="left"
            interactive={true}
            delayIndex={idx}
          >
            <MobileCard.Header
              title={log.actor}
              subtitle={log.role}
              badge={{
                text: getActionLabel(log.actionType),
                variant: log.actionType === 'CREATE' ? 'success' :
                         log.actionType === 'UPDATE' ? 'info' :
                         log.actionType === 'DELETE' ? 'error' :
                         log.actionType === 'SYNC' ? 'warning' : 'secondary'
              }}
              actions={
                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
              }
            />
            <MobileCard.Body className="p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="text-slate-400 font-semibold">Đối tượng:</span>
                <span className="truncate">{log.target}</span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-900/40 rounded-lg p-2.5 text-slate-650 dark:text-zinc-300 font-medium leading-relaxed break-words border border-slate-100/50">
                {log.details}
              </div>
            </MobileCard.Body>
          </MobileCard>
        ))}
      </div>

      {/* Phân trang di động tinh gọn */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-1 text-xs font-semibold text-slate-500">
          <button
            type="button"
            disabled={pagination.pageIndex === 0}
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            Trước
          </button>
          <span className="tabular-nums">
            Trang {pagination.pageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.pageIndex >= totalPages - 1}
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
});

export const LogsTabContent = React.memo(function LogsTabContent({ logs, isOwner }: LogsTabContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<(typeof actionOptions)[number]>('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const targetOptions = useMemo(() => {
    const uniqueTargets = Array.from(new Set(logs.map((log) => log.target).filter(Boolean)));
    return ['ALL', ...uniqueTargets];
  }, [logs]);

  const actionSelectOptions = useMemo(() => {
    const actionLabels: Record<string, string> = {
      ALL: 'Tất cả hành động',
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa',
      SYNC: 'Đồng bộ',
      RESET: 'Đặt lại',
      OTHER: 'Khác',
    };
    return actionOptions.map((opt) => ({
      label: actionLabels[opt] ?? opt,
      value: opt,
    }));
  }, []);

  const targetSelectOptions = useMemo(() => {
    return targetOptions.map((opt) => ({
      label: opt === 'ALL' ? 'Phân loại đối tượng' : opt,
      value: opt,
    }));
  }, [targetOptions]);

  const handleChangeAction = useCallback((value: string | number) => {
    setActionFilter(value as (typeof actionOptions)[number]);
  }, []);

  const handleChangeTarget = useCallback((value: string | number) => {
    setTargetFilter(String(value));
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleClearDateFilter = useCallback(() => {
    setDateRange(undefined);
  }, []);

  const filteredLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      let matchedDate = true;
      if (dateRange?.from || dateRange?.to) {
        const logTime = new Date(log.timestamp);
        if (dateRange.from) {
          const fromTime = new Date(dateRange.from);
          fromTime.setHours(0, 0, 0, 0);
          if (logTime < fromTime) matchedDate = false;
        }
        if (dateRange.to) {
          const toTime = new Date(dateRange.to);
          toTime.setHours(23, 59, 59, 999);
          if (logTime > toTime) matchedDate = false;
        }
      }

      const matchedAction = actionFilter === 'ALL' || log.actionType === actionFilter;
      const matchedTarget = targetFilter === 'ALL' || log.target === targetFilter;
      const matchedKeyword =
        keyword.length === 0 ||
        log.actor.toLowerCase().includes(keyword) ||
        log.role.toLowerCase().includes(keyword) ||
        log.target.toLowerCase().includes(keyword) ||
        log.details.toLowerCase().includes(keyword);

      return matchedDate && matchedAction && matchedTarget && matchedKeyword;
    });
  }, [actionFilter, logs, searchTerm, targetFilter, dateRange]);

  const handleExportExcel = useCallback(() => {
    if (filteredLogs.length === 0) return;

    const worksheetData = filteredLogs.map((log) => ({
      'Thời điểm': formatTimestamp(log.timestamp),
      'Người thao tác': log.actor,
      'Vai trò': log.role,
      'Hành động': log.actionType,
      'Đối tượng': log.target,
      'Chi tiết': log.details,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhật ký hệ thống');

    const maxLengths = worksheetData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const value = String(row[key as keyof typeof row] || '');
        acc[key] = Math.max(acc[key] || key.length, value.length);
      });
      return acc;
    }, {} as Record<string, number>);

    worksheet['!cols'] = Object.keys(maxLengths).map((key) => ({
      wch: Math.min(Math.max(maxLengths[key] + 3, 10), 60),
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `system_logs_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }, [filteredLogs]);

  const handleExportText = useCallback(() => {
    if (filteredLogs.length === 0) return;

    const textContent = filteredLogs
      .map((log) => {
        const time = formatTimestamp(log.timestamp);
        return `[${time}] [${log.actor} - ${log.role}] [${log.actionType}] [${log.target}]: ${log.details}`;
      })
      .join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const createCount = logs.filter((log) => log.actionType === 'CREATE').length;
  const updateCount = logs.filter((log) => log.actionType === 'UPDATE').length;

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs p-3 md:p-3.5">
        {/* Single Control Row */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between w-full">
          
          {/* Left Side: Filter Elements */}
          <div className="flex flex-wrap items-center gap-2 flex-grow min-w-0">
            <div className="w-full sm:w-[180px] shrink-0">
              <Input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm log..."
                icon={<Search className="h-4 w-4 text-slate-400" />}
                position="left"
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 transition focus-visible:border-indigo-400"
                clearable={true}
              />
            </div>

            <div className="w-full sm:w-[220px] shrink-0">
              <DateRangeInput
                value={dateRange}
                onChange={(range) => setDateRange(range)}
                inputProps={{
                  className: "h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-655 bg-white",
                  placeholder: "Chọn khoảng ngày..."
                }}
              />
            </div>

            <div className="w-full sm:w-[120px] shrink-0">
              <CustomSelect
                options={actionSelectOptions}
                value={actionFilter}
                onChangeValue={handleChangeAction}
                placeholder="Hành động"
                clearable={false}
                className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-650"
              />
            </div>

            <div className="w-full sm:w-[140px] shrink-0">
              <CustomSelect
                options={targetSelectOptions}
                value={targetFilter}
                onChangeValue={handleChangeTarget}
                placeholder="Đối tượng"
                clearable={false}
                className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-650"
              />
            </div>

            {(dateRange?.from || dateRange?.to) && (
              <Button
                onClick={handleClearDateFilter}
                variant="ghost"
                className="h-8 px-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 shrink-0 cursor-pointer"
              >
                Xóa lọc
              </Button>
            )}
          </div>

          {/* Right Side: Stats Badges & Export Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 justify-end sm:justify-start">
            
            {/* Compact Stats Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex h-6.5 items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2 text-[10px] font-black text-indigo-700">
                <Activity className="h-3 w-3" />
                Tổng: {logs.length}
              </span>
              <span className="inline-flex h-6.5 items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-100 px-2 text-[10px] font-black text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                Tạo: {createCount}
              </span>
              <span className="inline-flex h-6.5 items-center gap-1 rounded-lg bg-sky-50 border border-sky-100 px-2 text-[10px] font-black text-sky-700">
                <Clock3 className="h-3 w-3" />
                Sửa: {updateCount}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block shrink-0" />

            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleExportExcel}
                disabled={filteredLogs.length === 0}
                variant="outline"
                className="h-9 gap-1 px-2.5 text-xs font-black text-indigo-700 border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 hover:border-indigo-300 rounded-xl cursor-pointer"
                title="Xuất file Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button
                onClick={handleExportText}
                disabled={filteredLogs.length === 0}
                variant="outline"
                className="h-9 gap-1 px-2.5 text-xs font-black text-slate-700 border-slate-200 bg-slate-50/20 hover:bg-slate-100/50 hover:border-slate-300 rounded-xl cursor-pointer"
                title="Xuất file Text"
              >
                <Download className="h-3.5 w-3.5" />
                Text
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table & Cards Section */}
      <div className="w-full max-w-full overflow-hidden min-w-0">
        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <CustomTable<SystemLog>
            columns={columns}
            data={filteredLogs}
            enablePagination={true}
            pageSizeOptions={[10, 20, 50, 100]}
            enableSorting={false}
            enableFiltering={false}
            enableColumnResizing={false}
            enableColumnVisibility={false}
            showFilterRow={false}
            emptyMessage="Không có log phù hợp."
            tableMinWidth={1150}
            className="w-full min-w-0 h-[calc(100vh-330px)] min-h-[350px]"
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="block md:hidden">
          <LogsTabMobileCards logs={filteredLogs} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 px-1">
        <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        Nhật ký đồng bộ từ Firestore systems_log.
      </div>
    </div>
  );
});
