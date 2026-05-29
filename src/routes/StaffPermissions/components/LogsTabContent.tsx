import { useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock3, Search, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/table';
import { ScrollArea } from '../../../shared/components/scroll-area';
import type { SystemLog } from '../StaffPermissionsView.types';

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
      return 'bg-emerald-100 text-emerald-700';
    case 'UPDATE':
      return 'bg-sky-100 text-sky-700';
    case 'DELETE':
      return 'bg-rose-100 text-rose-700';
    case 'SYNC':
      return 'bg-amber-100 text-amber-700';
    case 'RESET':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-violet-100 text-violet-700';
  }
}

export function LogsTabContent({ logs, isOwner, onClearLogs }: LogsTabContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<(typeof actionOptions)[number]>('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');

  const targetOptions = useMemo(() => {
    const uniqueTargets = Array.from(new Set(logs.map((log) => log.target).filter(Boolean)));
    return ['ALL', ...uniqueTargets];
  }, [logs]);

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
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_45px_-34px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">Local audit trail</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Ghi log hệ thống</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Nhật ký này bám theo đúng flow trong bản md: theo dõi thao tác nhân sự, phân quyền, đồng bộ và các thay
              đổi quản trị ngay trên client hiện tại.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearLogs}
            disabled={!isOwner || logs.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-black uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Trash2 className="h-4 w-4" /> Xóa sạch nhật ký
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">Tổng sự kiện</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{logs.length}</div>
            <p className="mt-1 text-xs font-medium text-slate-500">Tất cả thao tác đang được đọc trực tiếp từ Firestore systems_log.</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">Thêm mới</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{createCount}</div>
            <p className="mt-1 text-xs font-medium text-slate-500">Số tác vụ tạo mới tài khoản hoặc cấu hình phân quyền.</p>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Cập nhật</span>
              <Clock3 className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{updateCount}</div>
            <p className="mt-1 text-xs font-medium text-slate-500">Theo dõi các thay đổi trạng thái và ma trận phân quyền.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr),220px,220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm actor, vai trò, đối tượng hoặc nội dung log"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value as (typeof actionOptions)[number])}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">Tất cả hành động</option>
            {actionOptions.filter((option) => option !== 'ALL').map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={targetFilter}
            onChange={(event) => setTargetFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="ALL">Phân loại đối tượng</option>
            {targetOptions.filter((option) => option !== 'ALL').map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader className="bg-indigo-800">
            <TableRow className="border-b border-indigo-900/20 hover:bg-indigo-800">
              <TableHead className="h-12 text-xs font-black uppercase tracking-[0.2em] text-indigo-50">Thời điểm</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-indigo-50">Người thao tác</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-indigo-50">Hành động</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-indigo-50">Đối tượng</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-indigo-50">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="mx-auto max-w-md space-y-2 px-4">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Không có log phù hợp</p>
                    <p className="text-sm font-medium text-slate-500">Đổi bộ lọc hoặc thực hiện thêm thao tác để làm đầy lịch sử hệ thống.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                  <TableCell className="py-4">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="min-w-[220px] space-y-1 text-left">
                      <div className="text-sm font-black text-slate-900">{log.actor}</div>
                      <div className="text-xs font-semibold text-slate-500">{log.role}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getActionTone(log.actionType)}`}>
                      {log.actionType}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm font-semibold text-slate-700">{log.target}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="min-w-[360px] max-w-[640px] whitespace-normal text-sm leading-6 text-slate-600">
                      {log.details}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="border-t border-slate-200 bg-indigo-50/70 px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
          <AlertCircle className="h-4 w-4" /> Nhật ký đồng bộ từ Firestore systems_log, hỗ trợ truy vết người thao tác và thời điểm xử lý.
        </div>
      </div>
    </div>
  );
}