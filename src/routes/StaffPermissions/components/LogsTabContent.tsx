import React, { useCallback, useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock3, Info, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../share/ui/popover';
import type { SystemLog } from '../StaffPermissionsView.types';
import { Button, Input } from '../../../../share/ui';
import { CustomTable } from '../../../../share/components/custom-table';
import type { ColumnDef } from '@tanstack/react-table';
import { CustomSelect } from '../../../../share/components/custom/custom-select';

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
          {log.actionType}
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

export const LogsTabContent = React.memo(function LogsTabContent({ logs, isOwner, onClearLogs }: LogsTabContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<(typeof actionOptions)[number]>('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');

  const targetOptions = useMemo(() => {
    const uniqueTargets = Array.from(new Set(logs.map((log) => log.target).filter(Boolean)));
    return ['ALL', ...uniqueTargets];
  }, [logs]);

  const actionSelectOptions = useMemo(() => {
    return actionOptions.map((opt) => ({
      label: opt === 'ALL' ? 'Tất cả hành động' : opt,
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

  const filteredLogs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const matchedAction = actionFilter === 'ALL' || log.actionType === actionFilter;
      const matchedTarget = targetFilter === 'ALL' || log.target === targetFilter;
      const matchedKeyword =
        keyword.length === 0 ||
        log.actor.toLowerCase().includes(keyword) ||
        log.role.toLowerCase().includes(keyword) ||
        log.target.toLowerCase().includes(keyword) ||
        log.details.toLowerCase().includes(keyword);

      return matchedAction && matchedTarget && matchedKeyword;
    });
  }, [actionFilter, logs, searchTerm, targetFilter]);

  const createCount = logs.filter((log) => log.actionType === 'CREATE').length;
  const updateCount = logs.filter((log) => log.actionType === 'UPDATE').length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="border-b border-slate-150 bg-slate-50/50 p-4 md:p-5">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="max-w-2xl text-left flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Ghi log hệ thống</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition"
                  aria-label="Thông tin nhật ký"
                >
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 rounded-xl border border-slate-200 bg-white shadow-lg" align="start">
                <div className="space-y-1.5 font-sans text-left">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-indigo-650" />
                    Thông tin nhật ký
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium whitespace-normal">
                    Nhật ký này bám theo đúng flow trong bản md: theo dõi thao tác nhân sự, phân quyền, đồng bộ và các thay đổi quản trị ngay trên client hiện tại.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {isOwner && (
            <Button
              onClick={onClearLogs}
              variant="ghost"
              className="h-8 gap-1.5 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 border border-transparent hover:border-rose-100 rounded-lg shrink-0 cursor-pointer shadow-none active:scale-95 transition-all"
              title="Xóa toàn bộ log"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Xóa tất cả log</span>
              <span className="sm:hidden">Xóa</span>
            </Button>
          )}
        </div>

        {/* Bento Stats Cards - Compact horizontal layout */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/45 p-3 flex items-center justify-between">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Tổng sự kiện</span>
              <div className="text-2xl font-black text-slate-900 leading-none">{logs.length}</div>
            </div>
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
              <Activity className="h-4 w-4" />
            </span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/45 p-3 flex items-center justify-between">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Thêm mới</span>
              <div className="text-2xl font-black text-slate-900 leading-none">{createCount}</div>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50/45 p-3 flex items-center justify-between">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Cập nhật</span>
              <div className="text-2xl font-black text-slate-900 leading-none">{updateCount}</div>
            </div>
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-600 shrink-0">
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Search & Filters - Compact design */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm actor, vai trò, đối tượng hoặc nội dung log"
              icon={<Search className="h-4 w-4" />}
              position="left"
              className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 transition focus-visible:border-indigo-400 focus-visible:ring-indigo-50 focus-visible:ring-2"
              clearable={true}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <div className="w-full sm:w-[180px]">
              <CustomSelect
                options={actionSelectOptions}
                value={actionFilter}
                onChangeValue={handleChangeAction}
                placeholder="Tất cả hành động"
                clearable={false}
                className="h-9.5 rounded-xl border-slate-200 text-xs font-bold text-slate-650"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <CustomSelect
                options={targetSelectOptions}
                value={targetFilter}
                onChangeValue={handleChangeTarget}
                placeholder="Phân loại đối tượng"
                clearable={false}
                className="h-9.5 rounded-xl border-slate-200 text-xs font-bold text-slate-650"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-150 w-full max-w-full min-w-0">
        <CustomTable<SystemLog>
          columns={columns}
          data={filteredLogs}
          enablePagination={true}
          enableInternalVerticalScroll={false}
          pageSizeOptions={[10, 20, 50, 100]}
          enableSorting={false}
          enableFiltering={false}
          enableColumnResizing={false}
          enableColumnVisibility={false}
          showFilterRow={false}
          emptyMessage="Không có log phù hợp. Đổi bộ lọc hoặc thực hiện thêm thao tác để làm đầy lịch sử hệ thống."
          tableMinWidth={1150}
          className="w-full min-w-0"
        />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/40 px-5 py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <AlertCircle className="h-3.5 w-3.5 text-slate-400" /> Nhật ký đồng bộ từ Firestore systems_log, hỗ trợ truy vết người thao tác và thời điểm xử lý.
        </div>
      </div>
    </div>
  );
});
