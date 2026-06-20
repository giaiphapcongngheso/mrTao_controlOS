import React, { useMemo, useState, useCallback } from 'react';
import {
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Search,
  X,
  Clock,
  ClipboardList,
  Paperclip,
  ChevronRight,
  Info,
  Award,
  Check,
  Building,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Sheet,
  SheetContent,
  Label,
} from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';
import type {
  ChecklistDocument,
  ChecklistTemplateDocument,
  ChecklistTask,
} from '../../../types/checklist.types';
import { isItemLate, formatDateKeyToVietnamese, toLocalDateKey } from '../checklist-utils';
import DateRangeInput from '../../../../share/components/custom/date-range-input';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { CustomTable } from '../../../../share/components/custom-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

// ── Interface Dòng Bảng Phẳng ──
interface FlatHistoryRow {
  id: string; // snapshot.id + templateId
  snapshotId: string;
  dateKey: string;
  dateFormatted: string;
  roleCode: string;
  roleName: string;
  performerName: string;
  type: 'Checklist' | 'SOP';
  templateId: string;
  checklistName: string;
  completionRate: number;
  totalTasks: number;
  completedTasksCount: number;
  lateTasksCount: number;
  inspectorName: string;
  status: 'completed_on_time' | 'completed_late' | 'incomplete';
  tasks: ChecklistTask[];
  images: string[];
}

interface HistoryTabProps {
  historySnapshots: ChecklistDocument[];
  templates: ChecklistTemplateDocument[];
  roleOptions: Array<{ code: string; name: string }>;
  historyLoading?: boolean;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  selectedRoleCode: string;
  onRoleCodeChange: (roleCode: string) => void;
}

// Sub-component: KPI Card
const KpiStatsCard = React.memo(function KpiStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'info';
  className?: string;
}) {
  const variantStyles = {
    default: {
      card: "bg-white hover:border-slate-200 hover:shadow-xs",
      iconBg: "bg-slate-50 border-slate-100 text-slate-600",
    },
    success: {
      card: "bg-white hover:border-emerald-200 hover:shadow-[0_8px_30px_rgb(16,185,129,0.04)]",
      iconBg: "bg-emerald-50/70 border-emerald-100/40 text-emerald-600",
    },
    warning: {
      card: "bg-white hover:border-rose-200 hover:shadow-[0_8px_30px_rgb(244,63,94,0.04)]",
      iconBg: "bg-rose-50/70 border-rose-100/40 text-rose-600",
    },
    info: {
      card: "bg-white hover:border-blue-200 hover:shadow-[0_8px_30px_rgb(59,130,246,0.04)]",
      iconBg: "bg-blue-50/70 border-blue-100/40 text-blue-600",
    },
  };

  return (
    <div className={cn(
      "p-5 border border-slate-100 rounded-[20px] flex items-center justify-between gap-4 transition-all duration-300 hover:-translate-y-0.5 shadow-2xs",
      variantStyles[variant].card,
      className
    )}>
      <div className="space-y-1.5">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">{title}</span>
        <div className="text-2xl font-black text-slate-800 tracking-tight select-none tabular-nums leading-none">{value}</div>
        {subtitle && <p className="text-[10px] text-slate-400 font-semibold">{subtitle}</p>}
      </div>
      <div className={cn("p-3 border rounded-2xl transition-transform duration-300", variantStyles[variant].iconBg)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
});

// Sub-component: Task Item in details list
const DetailTaskListItem = React.memo(function DetailTaskListItem({
  task,
  onImageClick,
}: {
  task: ChecklistTask;
  onImageClick: (url: string) => void;
}) {
  const isLate = isItemLate(task as any);
  const images = task.imageUrls || [];

  const handleImageItemClick = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick(url);
  }, [onImageClick]);

  return (
    <div className="p-3.5 bg-slate-50/30 hover:bg-slate-50/75 border border-slate-100 rounded-xl transition-all duration-200 hover:shadow-2xs">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="mt-0.5 shrink-0 pointer-events-none">
            {task.isCompleted ? (
              <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-slate-400 stroke-[3]" />
              </div>
            )}
          </span>
          <div className="space-y-1 flex-1 min-w-0">
            <span className={cn(
              "text-sm font-semibold leading-relaxed break-words block transition-colors",
              task.isCompleted ? "text-slate-450 line-through decoration-slate-300/80" : "text-slate-700"
            )}>
              {task.title}
            </span>
            {task.isCompleted && task.checkedByName && (
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                Đã làm: {task.checkedByName}
                {task.checkedAt && ` lúc ${new Date(task.checkedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            )}
          </div>
        </div>

        {task.timeLimit && (
          <span className={cn(
            "text-[9px] font-semibold px-2 py-0.5 rounded-lg border shrink-0 inline-flex items-center gap-1 tabular-nums transition-colors",
            isLate
              ? "bg-rose-50/80 border-rose-100 text-rose-600"
              : task.isCompleted
                ? "bg-emerald-50/80 border-emerald-100 text-emerald-600"
                : "bg-slate-50 border-slate-100 text-slate-550"
          )}>
            <Clock className="w-2.5 h-2.5" />
            {task.timeLimit}
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {images.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => handleImageItemClick(url, e)}
              className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200/80 hover:border-slate-400 hover:scale-105 shadow-2xs transition-all focus:outline-none cursor-pointer"
            >
              <img
                src={url}
                alt="Minh chứng"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export const HistoryTab = React.memo(function HistoryTab({
  historySnapshots,
  templates,
  roleOptions,
  historyLoading = false,
  dateRange,
  onDateRangeChange,
  selectedRoleCode,
  onRoleCodeChange,
}: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [performerFilter, setPerformerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── 1. Biến đổi dữ liệu snapshot sang bảng phẳng ──
  const flatRows = useMemo(() => {
    const rows: FlatHistoryRow[] = [];

    historySnapshots.forEach((snapshot) => {
      // Nhóm tasks theo templateId
      const tasksByTemplate: Record<string, ChecklistTask[]> = {};
      snapshot.tasks.forEach((task) => {
        if (task.deletedAt) return; // Bỏ các task đã bị xóa mềm
        const tId = task.templateId || 'no-template';
        if (!tasksByTemplate[tId]) {
          tasksByTemplate[tId] = [];
        }
        tasksByTemplate[tId].push(task);
      });

      // Tạo dòng lịch sử cho từng template nhóm được
      Object.entries(tasksByTemplate).forEach(([templateId, tasks]) => {
        const template = templates.find((t) => t.id === templateId);
        const checklistName = template?.title || 'Checklist phát sinh';
        const roleOpt = roleOptions.find((r) => r.code.toUpperCase() === snapshot.roleCode.toUpperCase());
        const roleName = roleOpt?.name || snapshot.roleCode;

        // Tính toán các chỉ số
        const totalTasks = tasks.length;
        const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
        const lateTasksCount = tasks.filter((t) => isItemLate(t as any)).length;

        // Người thực hiện chính (lấy danh sách tên người completed, join lại)
        const performers = Array.from(
          new Set(tasks.filter((t) => t.isCompleted && t.checkedByName).map((t) => t.checkedByName!))
        );
        const performerName = performers.length > 0 ? performers.join(', ') : 'Chưa thực hiện';

        // Lấy thời gian check đầu tiên hoặc cuối cùng
        const checkedTimes = tasks
          .filter((t) => t.isCompleted && t.checkedAt)
          .map((t) => new Date(t.checkedAt!).getTime());

        const dateFormatted = snapshot.dateKey.split('-').reverse().join('/');

        // Người kiểm tra
        const inspectorName = template?.inspectorName || 'Quản lý';

        // Xác định trạng thái
        let status: 'completed_on_time' | 'completed_late' | 'incomplete' = 'incomplete';
        if (completedTasksCount === totalTasks && totalTasks > 0) {
          status = lateTasksCount === 0 ? 'completed_on_time' : 'completed_late';
        }

        // Gom tất cả ảnh
        const images = tasks.reduce((acc, t) => [...acc, ...(t.imageUrls || [])], [] as string[]);

        rows.push({
          id: `${snapshot.id}_${templateId}`,
          snapshotId: snapshot.id,
          dateKey: snapshot.dateKey,
          dateFormatted,
          roleCode: snapshot.roleCode,
          roleName,
          performerName,
          type: 'Checklist',
          templateId,
          checklistName,
          completionRate,
          totalTasks,
          completedTasksCount,
          lateTasksCount,
          inspectorName,
          status,
          tasks,
          images,
        });
      });
    });

    // Sắp xếp ngày giờ giảm dần
    return rows.sort((a, b) => b.id.localeCompare(a.id));
  }, [historySnapshots, templates, roleOptions]);

  // ── 2. Danh sách performers duy nhất để fill filter dropdown ──
  const uniquePerformers = useMemo(() => {
    const list = new Set<string>();
    flatRows.forEach((r) => {
      if (r.performerName && r.performerName !== 'Chưa thực hiện') {
        r.performerName.split(', ').forEach((name) => list.add(name));
      }
    });
    return Array.from(list);
  }, [flatRows]);

  // ── 3. Lọc dữ liệu theo các filter state ──
  const filteredRows = useMemo(() => {
    return flatRows.filter((row) => {
      // Filter theo vai trò (đã được lọc từ API ngoài parent, nhưng ta filter client cho an toàn)
      if (selectedRoleCode !== 'all' && row.roleCode.toUpperCase() !== selectedRoleCode.toUpperCase()) {
        return false;
      }

      // Filter theo người thực hiện
      if (performerFilter !== 'all' && !row.performerName.includes(performerFilter)) {
        return false;
      }

      // Filter theo trạng thái
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed_on_time' && row.status !== 'completed_on_time') return false;
        if (statusFilter === 'completed_late' && row.status !== 'completed_late') return false;
        if (statusFilter === 'incomplete' && row.status !== 'incomplete') return false;
      }

      // Filter theo ô tìm kiếm (Tên checklist / SOP / Người thực hiện)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = row.checklistName.toLowerCase().includes(term);
        const matchPerformer = row.performerName.toLowerCase().includes(term);
        const matchRole = row.roleName.toLowerCase().includes(term);
        if (!matchTitle && !matchPerformer && !matchRole) {
          return false;
        }
      }

      return true;
    });
  }, [flatRows, selectedRoleCode, performerFilter, statusFilter, searchTerm]);

  // ── 4. Tính toán KPIs tổng quan cho sidebar bên phải ──
  const kpiStats = useMemo(() => {
    const total = filteredRows.length;
    const completedOnTime = filteredRows.filter((r) => r.status === 'completed_on_time').length;
    const completedLate = filteredRows.filter((r) => r.status === 'completed_late').length;
    const incomplete = filteredRows.filter((r) => r.status === 'incomplete').length;

    const onTimePercent = total > 0 ? Math.round((completedOnTime / total) * 100) : 0;
    const latePercent = total > 0 ? Math.round((completedLate / total) * 100) : 0;
    const incompletePercent = total > 0 ? Math.round((incomplete / total) * 100) : 0;

    // Hiệu suất hoàn thành trung bình
    const sumRates = filteredRows.reduce((acc, r) => acc + r.completionRate, 0);
    const avgCompletion = total > 0 ? Math.round(sumRates / total) : 0;

    return {
      total,
      completedOnTime,
      completedLate,
      incomplete,
      onTimePercent,
      latePercent,
      incompletePercent,
      avgCompletion,
    };
  }, [filteredRows]);

  const columns = useMemo<ColumnDef<FlatHistoryRow>[]>(() => [
    {
      accessorKey: 'dateFormatted',
      header: 'Ngày',
      cell: ({ row }) => (
        <span className="text-sm font-semibold tabular-nums text-slate-500 block text-left" style={{ minWidth: '80px' }}>
          {row.original.dateFormatted}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'roleName',
      header: 'Vai trò',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-550 block text-left leading-relaxed" style={{ minWidth: '150px' }}>
          {row.original.roleName}
        </span>
      ),
      size: 160,
    },
    {
      accessorKey: 'performerName',
      header: 'Người thực hiện',
      cell: ({ row }) => {
        const performerName = row.original.performerName;
        return performerName !== 'Chưa thực hiện' ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 max-w-[125px] text-left" style={{ minWidth: '120px' }}>
            <span className="text-sm font-semibold text-slate-650 truncate" title={performerName}>
              {performerName}
            </span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-slate-350 block text-left" style={{ minWidth: '120px' }}>--</span>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'checklistName',
      header: 'Tên checklist/SOP',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-800 leading-relaxed block text-left" style={{ minWidth: '160px' }}>
          {row.original.checklistName}
        </span>
      ),
      size: 170,
    },
    {
      accessorKey: 'completionRate',
      header: 'Tiến độ',
      cell: ({ row }) => {
        const rate = row.original.completionRate;
        return (
          <div className="text-center" style={{ minWidth: '80px' }}>
            <span className={cn(
              "inline-flex items-center justify-center font-semibold px-2 py-0.5 rounded-lg text-sm border tabular-nums select-none",
              rate === 100
                ? "bg-emerald-50/80 border-emerald-100 text-emerald-700"
                : rate > 0
                  ? "bg-amber-50/80 border-amber-100 text-amber-700"
                  : "bg-slate-50 border-slate-150 text-slate-400"
            )}>
              {rate}%
            </span>
          </div>
        );
      },
      size: 90,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="text-center flex justify-center" style={{ minWidth: '110px' }}>
            <span className={cn(
              "inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold border select-none min-w-[85px]",
              status === 'completed_on_time'
                ? "bg-emerald-50/80 text-emerald-700 border-emerald-100"
                : status === 'completed_late'
                  ? "bg-amber-50/80 text-amber-700 border-amber-100"
                  : "bg-slate-50 text-slate-500 border-slate-150"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                status === 'completed_on_time'
                  ? "bg-emerald-500"
                  : status === 'completed_late'
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-450"
              )} />
              {status === 'completed_on_time'
                ? 'Đúng hạn'
                : status === 'completed_late'
                  ? 'Quá hạn'
                  : 'Chưa xong'}
            </span>
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'eye-icon',
      cell: ({ row }) => {
        const isSelected = selectedRowId === row.original.id;
        return (
          <div className="flex justify-center pr-2">
            <Eye className={cn("w-4 h-4 transition-colors cursor-pointer", isSelected ? "text-slate-800" : "text-slate-300 hover:text-slate-500")} />
          </div>
        );
      },
      size: 40,
    },
  ], [selectedRowId]);

  // Dòng chi tiết đang chọn
  const selectedRow = useMemo(() => {
    return filteredRows.find((r) => r.id === selectedRowId) || null;
  }, [filteredRows, selectedRowId]);

  // ── 5. Handlers ──
  const handleRowClick = useCallback((id: string) => {
    setSelectedRowId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedRowId(null);
  }, []);





  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Xuất file Excel HTML UTF-8
  const handleExportExcel = useCallback(() => {
    if (filteredRows.length === 0) {
      alert('Không có dữ liệu lịch sử để xuất báo cáo.');
      return;
    }

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta http-equiv="content-type" content="text/html; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Lịch sử Checklist</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
    html += `<h2>BÁO CÁO LỊCH SỬ THỰC HIỆN CHECKLIST & SOP</h2>`;
    html += `<p>Khoảng ngày: ${dateRange?.from ? toLocalDateKey(dateRange.from) : ''} - ${dateRange?.to ? toLocalDateKey(dateRange.to) : ''}</p>`;
    html += `<table border="1" style="border-collapse: collapse; font-family: sans-serif; font-size: 13px;">`;

    // Header
    html += `<tr style="background-color: #f1f5f9; font-weight: bold; height: 30px;">`;
    html += `<th style="padding: 5px;">Ngày</th>`;
    html += `<th style="padding: 5px;">Vai trò</th>`;
    html += `<th style="padding: 5px;">Người thực hiện</th>`;
    html += `<th style="padding: 5px;">Loại</th>`;
    html += `<th style="padding: 5px;">Tên checklist/SOP</th>`;
    html += `<th style="padding: 5px;">Tỷ lệ hoàn thành</th>`;
    html += `<th style="padding: 5px;">Việc quá hạn</th>`;
    html += `<th style="padding: 5px;">Người kiểm tra</th>`;
    html += `<th style="padding: 5px;">Trạng thái</th>`;
    html += `</tr>`;

    filteredRows.forEach((row) => {
      const statusText = row.status === 'completed_on_time'
        ? 'Hoàn thành đúng hạn'
        : row.status === 'completed_late'
          ? 'Hoàn thành có quá hạn'
          : 'Chưa hoàn thành';
      html += `<tr style="height: 25px;">`;
      html += `<td style="padding: 5px;">${row.dateFormatted}</td>`;
      html += `<td style="padding: 5px;">${row.roleName}</td>`;
      html += `<td style="padding: 5px;">${row.performerName}</td>`;
      html += `<td style="padding: 5px;">${row.type}</td>`;
      html += `<td style="padding: 5px;">${row.checklistName}</td>`;
      html += `<td style="padding: 5px; text-align: center;">${row.completionRate}%</td>`;
      html += `<td style="padding: 5px; text-align: center;">${row.lateTasksCount}</td>`;
      html += `<td style="padding: 5px;">${row.inspectorName}</td>`;
      html += `<td style="padding: 5px;">${statusText}</td>`;
      html += `</tr>`;
    });

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-checklist-${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRows, dateRange]);

  const handleImagePreviewClose = useCallback(() => {
    setPreviewImage(null);
  }, []);

  return (
    <div className="space-y-6 font-sans text-slate-700 pb-20">
      {/* ── SECTION 1: FILTER BAR ── */}
      <div className="bg-white p-6 rounded-[22px] border border-slate-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-end text-left">
          {/* Khoảng ngày */}
          <div className="col-span-2 lg:col-span-3 space-y-2">
            <Label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-0.5">Khoảng ngày</Label>
            <DateRangeInput
              value={dateRange}
              onChange={(range) => onDateRangeChange(range)}
              inputProps={{
                className: "w-full h-9 text-sm font-semibold rounded-xl border border-slate-200 bg-white placeholder:text-slate-400/70",
                placeholder: "Chọn khoảng ngày",
              }}
            />
          </div>

          {/* Vai trò */}
          <div className="col-span-1 lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-0.5">Vai trò</Label>
            <CustomSelect
              value={selectedRoleCode}
              onChangeValue={(value) => onRoleCodeChange(String(value))}
              options={[
                { label: 'Tất cả vai trò', value: 'all' },
                ...roleOptions.map((role) => ({
                  label: role.name,
                  value: role.code,
                })),
              ]}
              clearable={false}
              className="w-full h-9 text-sm font-semibold rounded-xl border border-slate-200 bg-white"
            />
          </div>

          {/* Người thực hiện */}
          <div className="col-span-1 lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-0.5">Người thực hiện</Label>
            <CustomSelect
              value={performerFilter}
              onChangeValue={(value) => setPerformerFilter(String(value))}
              options={[
                { label: 'Tất cả nhân sự', value: 'all' },
                ...uniquePerformers.map((name) => ({
                  label: name,
                  value: name,
                })),
              ]}
              clearable={false}
              className="w-full h-9 text-sm font-semibold rounded-xl border border-slate-200 bg-white"
            />
          </div>

          {/* Trạng thái */}
          <div className="col-span-1 lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-0.5">Trạng thái</Label>
            <CustomSelect
              value={statusFilter}
              onChangeValue={(value) => setStatusFilter(String(value))}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Hoàn thành đúng hạn', value: 'completed_on_time' },
                { label: 'Hoàn thành có quá hạn', value: 'completed_late' },
                { label: 'Chưa hoàn thành', value: 'incomplete' },
              ]}
              clearable={false}
              className="w-full h-9 text-sm font-semibold rounded-xl border border-slate-200 bg-white"
            />
          </div>

          {/* Tìm kiếm */}
          <div className="col-span-2 lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-0.5">Tìm kiếm</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm..."
                className="w-full pl-9.5 h-9 text-sm font-semibold rounded-xl border-slate-200/80 focus:border-slate-300 focus:ring-0 bg-white"
              />
            </div>
          </div>

          {/* Xuất file */}
          <div className="col-span-2 lg:col-span-1 space-y-2">
            <Button
              type="button"
              onClick={handleExportExcel}
              className="w-full h-9 px-2 text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] shadow-2xs hover:shadow-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="lg:hidden xl:inline">Xuất file</span>
              <span className="inline lg:hidden">Xuất báo cáo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: CONTENT LAYOUT (TABLE + SIDEBAR) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* 2.1 Bảng lịch sử bên trái */}
        <div className="lg:col-span-8 min-w-0 [&_th]:!bg-slate-50 [&_th]:!text-slate-800 [&_th]:font-semibold [&_th]:border-b [&_th]:border-slate-100/50 [&_th]:normal-case [&_th_div]:!text-slate-800 [&_th_svg]:!text-slate-500 [&_th]:text-sm [&_th]:tracking-wide [&_th]:px-4 [&_tr]:border-b [&_tr]:border-slate-50 [&_tr:hover]:bg-slate-50/40 [&_td]:py-3.5">
          <CustomTable
            columns={columns}
            data={filteredRows}
            loading={historyLoading}
            enablePagination={false}
            enableFiltering={false}
            activeRowId={selectedRowId || undefined}
            onRowClick={(row) => handleRowClick(row.original.id)}
            getRowId={(row) => row.id}
            emptyMessage="Không tìm thấy dữ liệu lịch sử nào phù hợp."
            className="w-full text-left text-sm"
          />
        </div>

        {/* 2.2 Sidebar động bên phải (Cố định trên Desktop, Ẩn và mở Drawer trên Mobile) */}
        <div className="hidden lg:block lg:col-span-4 h-full">
          {!selectedRow ? (
            /* ──────── TỔNG QUAN LỊCH SỬ (DEFAULT) ──────── */
            <Card className="bg-white border border-slate-100/80 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
              {/* ── Header with gradient accent ── */}
              <div className="relative px-5 pt-5 pb-4">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-t-[22px]" />
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-md shadow-indigo-200/50">
                    <Award className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Tổng quan lịch sử</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{kpiStats.total} lượt thực hiện</p>
                  </div>
                </div>
              </div>

              {/* ── Donut (left) + Legend Bars (right) ── */}
              <div className="flex items-center gap-4 px-5 py-3">
                {/* Donut Chart */}
                <div className="relative w-[110px] h-[110px] shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 drop-shadow-sm">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="#34d399" strokeWidth="3.2"
                      strokeDasharray={`${kpiStats.onTimePercent * 0.88} ${88 - kpiStats.onTimePercent * 0.88}`}
                      strokeDashoffset="0" strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="#fbbf24" strokeWidth="3.2"
                      strokeDasharray={`${kpiStats.latePercent * 0.88} ${88 - kpiStats.latePercent * 0.88}`}
                      strokeDashoffset={`${-(kpiStats.onTimePercent * 0.88)}`} strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="#fb7185" strokeWidth="3.2"
                      strokeDasharray={`${kpiStats.incompletePercent * 0.88} ${88 - kpiStats.incompletePercent * 0.88}`}
                      strokeDashoffset={`${-((kpiStats.onTimePercent + kpiStats.latePercent) * 0.88)}`} strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-800 tabular-nums leading-none tracking-tight">{kpiStats.avgCompletion}%</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Hiệu suất</span>
                  </div>
                </div>

                {/* Legend + Progress Bars */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* On-time */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200" />
                        <span className="text-[10px] font-semibold text-slate-600">Đúng hạn</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-700 tabular-nums">{kpiStats.completedOnTime}</span>
                        <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 px-1 py-px rounded">{kpiStats.onTimePercent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-700 ease-out" style={{ width: `${kpiStats.onTimePercent}%` }} />
                    </div>
                  </div>

                  {/* Late */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
                        <span className="text-[10px] font-semibold text-slate-600">Quá hạn</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-700 tabular-nums">{kpiStats.completedLate}</span>
                        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-px rounded">{kpiStats.latePercent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-700 ease-out" style={{ width: `${kpiStats.latePercent}%` }} />
                    </div>
                  </div>

                  {/* Incomplete */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-200" />
                        <span className="text-[10px] font-semibold text-slate-600">Chưa xong</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-700 tabular-nums">{kpiStats.incomplete}</span>
                        <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-1 py-px rounded">{kpiStats.incompletePercent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-400 to-rose-300 rounded-full transition-all duration-700 ease-out" style={{ width: `${kpiStats.incompletePercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Gợi ý sử dụng ── */}
              <div className="mx-5 mt-4 mb-5 p-4 bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-100/60 rounded-xl">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Info className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Gợi ý sử dụng</span>
                </div>
                <ul className="text-[10.5px] font-medium text-slate-500 space-y-2 pl-1 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                    <span>Coaching nhân sự theo dữ liệu vận hành</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                    <span>Kiểm tra trách nhiệm và tuân thủ quy trình</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                    <span>Đối soát chất lượng dịch vụ định kỳ</span>
                  </li>
                </ul>
              </div>
            </Card>
          ) : (
            /* ──────── CHI TIẾT LỊCH SỬ (ROW SELECTED) ──────── */
            <Card className="bg-white border border-slate-100 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 space-y-5 text-left overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin scrollbar-thumb-slate-200">
              {/* Header chi tiết */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-extrabold uppercase text-blue-600 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-lg tracking-wider">
                      {selectedRow.roleName}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 bg-slate-50 border border-slate-150/40 px-2 py-0.5 rounded-lg tracking-wider">
                      {selectedRow.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug">{selectedRow.checklistName}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase tabular-nums">
                    {selectedRow.dateFormatted}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  className="p-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-150/40 rounded-xl cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Tiến độ hoàn thành */}
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tỷ lệ hoàn thành</span>
                  <div className="text-2xl font-black text-slate-800 tabular-nums tracking-tight leading-none">
                    {selectedRow.completionRate}%
                  </div>
                  <p className="text-[10px] text-slate-450 font-semibold">
                    Đã xong {selectedRow.completedTasksCount}/{selectedRow.totalTasks} việc
                  </p>
                </div>

                <div className="w-16 h-16 shrink-0 relative select-none">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className="stroke-slate-100 fill-none"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className={cn(
                        "fill-none stroke-current transition-all duration-550 ease-out",
                        selectedRow.completionRate === 100
                          ? "text-emerald-500"
                          : "text-amber-500"
                      )}
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 * (1 - selectedRow.completionRate / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-800 tabular-nums">
                    {selectedRow.completionRate}%
                  </span>
                </div>
              </div>

              {/* Danh sách việc */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Danh sách việc</span>
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {selectedRow.tasks.map((task) => (
                    <DetailTaskListItem
                      key={task.id}
                      task={task}
                      onImageClick={setPreviewImage}
                    />
                  ))}
                </div>
              </div>

              {/* Ghi chú & Bằng chứng */}
              {selectedRow.images.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Ghi chú / Bằng chứng</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {selectedRow.images.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImage(url)}
                        className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-400 shadow-2xs hover:scale-[1.03] transition-all cursor-pointer focus:outline-none"
                      >
                        <img
                          src={url}
                          alt="Bằng chứng"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Người kiểm tra */}
              <div className="border-t border-slate-100/70 pt-4 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-400">Người kiểm tra:</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-50 border border-slate-100/80 px-2.5 py-0.5 rounded-full">
                  <Avatar className="w-4 h-4 shrink-0">
                    <AvatarFallback className="text-[8px] bg-slate-200 text-slate-555 font-semibold">Q</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-slate-650">{selectedRow.inspectorName}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── SECTION 3: MOBILE DRAWER ── */}
      <Sheet open={selectedRow !== null && window.innerWidth < 1024} onOpenChange={(open) => {
        if (!open) handleCloseSidebar();
      }}>
        <SheetContent side="bottom" className="p-0 rounded-t-[30px] border-t border-slate-100 bg-white max-h-[90vh] overflow-y-auto scrollbar-none font-sans">
          {selectedRow && (
            <div className="p-6 space-y-5 text-left">
              {/* Header Drawer */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-extrabold uppercase text-blue-600 bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-lg tracking-wider">
                      {selectedRow.roleName}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 bg-slate-50 border border-slate-150/40 px-2 py-0.5 rounded-lg tracking-wider">
                      {selectedRow.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug">{selectedRow.checklistName}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase tabular-nums">
                    {selectedRow.dateFormatted}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  className="p-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-150/40 rounded-xl cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Tiến độ hoàn thành */}
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tỷ lệ hoàn thành</span>
                  <div className="text-2xl font-black text-slate-800 tabular-nums tracking-tight leading-none">
                    {selectedRow.completionRate}%
                  </div>
                  <p className="text-[10px] text-slate-450 font-semibold">
                    Đã xong {selectedRow.completedTasksCount}/{selectedRow.totalTasks} việc
                  </p>
                </div>

                <div className="w-16 h-16 shrink-0 relative select-none">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className="stroke-slate-100 fill-none"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className={cn(
                        "fill-none stroke-current transition-all duration-550 ease-out",
                        selectedRow.completionRate === 100
                          ? "text-emerald-500"
                          : "text-amber-500"
                      )}
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 * (1 - selectedRow.completionRate / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-800 tabular-nums">
                    {selectedRow.completionRate}%
                  </span>
                </div>
              </div>

              {/* Danh sách việc */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Danh sách việc</span>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {selectedRow.tasks.map((task) => (
                    <DetailTaskListItem
                      key={task.id}
                      task={task}
                      onImageClick={setPreviewImage}
                    />
                  ))}
                </div>
              </div>

              {/* Ghi chú & Bằng chứng */}
              {selectedRow.images.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Ghi chú / Bằng chứng</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {selectedRow.images.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImage(url)}
                        className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-400 shadow-2xs hover:scale-[1.03] transition-all cursor-pointer focus:outline-none"
                      >
                        <img
                          src={url}
                          alt="Bằng chứng"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Người kiểm tra */}
              <div className="border-t border-slate-100/70 pt-4 flex items-center justify-between gap-3 text-sm pb-6">
                <span className="font-semibold text-slate-400">Người kiểm tra:</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-50 border border-slate-100/80 px-2.5 py-0.5 rounded-full">
                  <Avatar className="w-4 h-4 shrink-0">
                    <AvatarFallback className="text-[8px] bg-slate-200 text-slate-555 font-semibold">Q</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-slate-650">{selectedRow.inspectorName}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── SECTION 4: IMAGE FULLSCREEN PREVIEW ── */}
      {previewImage && (
        <div
          onClick={handleImagePreviewClose}
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={handleImagePreviewClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full hover:scale-105 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Hình ảnh bằng chứng kích thước lớn"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
});
