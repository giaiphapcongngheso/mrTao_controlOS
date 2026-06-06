import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Check,
  Zap,
  Send,
  Circle,
  Play,
  Clock,
  ListTodo,
  User,
  ClipboardList,
  AlignLeft,
  Building,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { TaskItem, TaskRequestType, TaskStatus } from '../../types/tasks.types';
import type { StaffMember, StaffRole } from '../../types/staff.types';
import type { UserSession } from '../../stores/app-store';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  SearchInput,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  Card,
  CardHeader,
  CardContent,
} from '@shared/ui';
import { CustomTable } from '@shared/components';
import { cn } from '@shared/lib/utils';
import { ModuleHeader } from '@shared/components';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { TaskCreateModal } from './components/task-create-modal';
import { TaskQuickDelegateModal } from './components/task-quick-delegate-modal';
import { TaskDetailModal } from './components/task-detail-modal';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';

interface TasksViewProps {
  tasks: TaskItem[];
  staffMembers?: StaffMember[];
  roles?: StaffRole[];
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
  onAddTask: (task: TaskRequestType) => void | Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onUpdateTask: (taskId: string, input: Partial<TaskRequestType>) => void | Promise<void>;
  canCreate?: boolean;
  canUpdate?: boolean;
  currentUser?: UserSession | null;
}

const getStatusTheme = (status: TaskStatus) => {
  switch (status) {
    case 'not_started':
      return {
        border: 'border-t-4 border-t-slate-300',
        badge: 'bg-slate-50 text-slate-500 border border-slate-200/60',
        iconColor: 'text-slate-400',
        iconBg: 'bg-slate-50 text-slate-400',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-slate-300',
        percent: 0,
        text: 'Chưa bắt đầu',
      };
    case 'in_progress':
      return {
        border: 'border-t-4 border-t-blue-500',
        badge: 'bg-blue-50/70 text-blue-600 border border-blue-100/80',
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-50 text-blue-500',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-blue-500',
        percent: 50,
        text: 'Đang làm',
      };
    case 'waiting':
      return {
        border: 'border-t-4 border-t-amber-500',
        badge: 'bg-amber-50/70 text-amber-600 border border-amber-100/80',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50 text-amber-500',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-amber-500',
        percent: 80,
        text: 'Chờ duyệt',
      };
    case 'completed':
      return {
        border: 'border-t-4 border-t-emerald-500',
        badge: 'bg-emerald-50/70 text-emerald-600 border border-emerald-100/80',
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-50 text-emerald-500',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-emerald-500',
        percent: 100,
        text: 'Hoàn thành',
      };
    default:
      return {
        border: 'border-t-4 border-t-slate-300',
        badge: 'bg-slate-50 text-slate-500 border border-slate-200/60',
        iconColor: 'text-slate-400',
        iconBg: 'bg-slate-50 text-slate-400',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-slate-300',
        percent: 0,
        text: 'Chưa làm',
      };
  }
};

const generateTaskCode = (task: TaskItem) => {
  const deptCode = task.department
    ? task.department
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4)
    : 'GEN';

  let dateStr = '2026-05-29';
  const targetDate = task.createdAt || task.deadline || '';
  const dateMatch = targetDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    dateStr = `${dateMatch[3]}-${dateMatch[2]}${dateMatch[1]}`;
  } else {
    const dateMatch2 = targetDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch2) {
      dateStr = `${dateMatch2[1]}-${dateMatch2[2]}${dateMatch2[3]}`;
    }
  }

  const indexStr = task.id ? task.id.slice(-2).toUpperCase() : '01';
  return `CV-${deptCode}-${dateStr}-${indexStr}`;
};

const stripHtmlAndTruncate = (htmlStr?: string, maxLen: number = 100) => {
  if (!htmlStr) return '';
  const cleanText = htmlStr
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  if (cleanText.length <= maxLen) return cleanText;
  return cleanText.substring(0, maxLen) + '...';
};

export default function TasksView({
  tasks,
  staffMembers = [],
  roles = [],
  isLoading = false,
  isSaving = false,
  errorMessage,
  onRefresh,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onUpdateTask,
  canCreate = false,
  canUpdate = false,
  currentUser,
}: TasksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'late' | 'completed'>('all');

  // Modals controller
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickDelegateOpen, setQuickDelegateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  const renderDeadline = useCallback((deadline: string) => {
    const parts = deadline.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts.slice(1).join(' ');
      return (
        <div className="flex items-center gap-1.5 font-normal text-sm justify-start">
          <span className="text-slate-800">{datePart}</span>
          <span className="flex items-center gap-1 text-slate-700 font-normal bg-slate-100 px-1.5 py-0.5 rounded text-sm">
            <Clock className="w-3 h-3 text-slate-400" />
            {timePart}
          </span>
        </div>
      );
    }
    return <span className="text-slate-800 font-normal text-sm">{deadline}</span>;
  }, []);

  const columns = useMemo<ColumnDef<TaskItem>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Tên công việc',
        size: 220,
        cell: ({ row }) => (
          <div className="font-normal text-slate-900 text-left text-sm leading-snug break-words">
            {row.original.title}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc tên..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'notes',
        header: 'Mô tả chi tiết',
        size: 260,
        cell: ({ row }) => (
          <div className="text-slate-700 font-normal text-sm text-left line-clamp-2 break-words max-w-sm whitespace-pre-line leading-relaxed">
            {stripHtmlAndTruncate(row.original.notes, 150) || <span className="text-slate-400 italic">Không có mô tả...</span>}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc mô tả..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'priority',
        header: 'Độ ưu tiên',
        size: 110,
        cell: ({ row }) => {
          const priorityInfo = priorityMeta[row.original.priority] || priorityMeta.medium;
          return (
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-0.5 rounded-md border tracking-normal w-fit whitespace-nowrap", priorityInfo.bg)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
              {priorityInfo.text}
            </span>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            );
          },
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 140,
        cell: ({ row }) => {
          const statusInfo = statusMeta[row.original.status] || statusMeta.not_started;
          return (
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-0.5 rounded-md border tracking-normal w-fit whitespace-nowrap", statusInfo.bg)}>
              {statusInfo.icon && (
                <statusInfo.icon className={cn("w-3 h-3 shrink-0", statusInfo.iconColor)} />
              )}
              <span>{statusInfo.text}</span>
            </span>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="not_started">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="waiting">Chờ duyệt</option>
                <option value="completed">Hoàn thành</option>
              </select>
            );
          },
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Người phụ trách',
        size: 155,
        cell: ({ row }) => {
          const assigneeVal = row.original.assignee;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-sm flex items-center justify-center font-medium text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
                {assigneeVal?.charAt(0) || 'U'}
              </div>
              <span className="text-slate-800 font-normal truncate text-sm">{assigneeVal || 'Chưa phân công'}</span>
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc người phụ trách..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'department',
        header: 'Bộ phận',
        size: 130,
        cell: ({ row }) => (
          <div className="text-slate-800 font-normal text-sm truncate text-left">
            {row.original.department}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc bộ phận..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'deadline',
        header: 'Hạn hoàn thành',
        size: 160,
        cell: ({ row }) => renderDeadline(row.original.deadline),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc hạn..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 130,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-sm px-2 rounded-lg font-medium hover:bg-slate-50 border-slate-200 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                onClick={() => setEditingTask(task)}
              >
                <Pencil className="w-3 h-3 text-slate-500" />
                Sửa
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                className="h-7 text-sm px-2 rounded-lg font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                onClick={() => setTaskToDelete(task)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa
              </Button>
            </div>
          );
        },
      },
    ],
    [renderDeadline, setEditingTask, setTaskToDelete]
  );

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter tasks based on current user roles & permissions
  const visibleTasks = useMemo(() => {
    const isManager = canUpdate || canCreate;
    if (isManager || !currentUser) return tasks;
    return tasks.filter(task => 
      task.assignee === currentUser.fullName || 
      (task.helpers || []).includes(currentUser.fullName)
    );
  }, [tasks, canUpdate, canCreate, currentUser]);

  // Auto disappear toast notifications
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);


  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);


  const handleCreateTask = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
      setIsAddingTask(false);
      showToast("🎉 Đã lưu và giao việc mới thành công!");
    } catch {
      showToast("Không thể lưu công việc. Vui lòng thử lại.");
    }
  }, [onAddTask, showToast]);

  const handleQuickDelegate = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
      setQuickDelegateOpen(false);
      showToast(`✈️ Đã kích hoạt Giao nhanh cho nhân viên ${taskPayload.assignee}!`);
    } catch {
      showToast("Không thể giao nhanh công việc. Vui lòng thử lại.");
    }
  }, [onAddTask, showToast]);


  // Filter computation
  const filteredTasks = visibleTasks.filter(task => {
    const titleMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = task.department.toLowerCase().includes(searchTerm.toLowerCase());
    const assigneeMatch = task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const notesMatch = task.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;

    if (!titleMatch && !deptMatch && !assigneeMatch && !notesMatch) return false;

    if (activeFilter === 'completed') {
      return task.status === 'completed';
    }
    if (activeFilter === 'late') {
      return task.status !== 'completed' && (task.deadline.toLowerCase().includes('trễ') || task.deadline.includes('08/05') || task.deadline.includes('Overdue'));
    }
    if (activeFilter === 'mine') {
      return task.assignee === currentUser?.fullName;
    }

    return true;
  });



  const priorityMeta = {
    high: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'Cao' },
    medium: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trung bình' },
    low: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Thấp' }
  };

  const statusMeta = {
    not_started: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Chưa làm', icon: Circle, iconColor: 'text-slate-400' },
    in_progress: { bg: 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse', text: 'Đang làm', icon: Play, iconColor: 'text-blue-500 fill-blue-500/20' },
    waiting: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Chờ duyệt', icon: Clock, iconColor: 'text-amber-500' },
    completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-150', text: 'Hoàn thành', icon: CheckCircle2, iconColor: 'text-emerald-600' }
  };

  const stats = useMemo(() => {
    const notStarted = visibleTasks.filter((t) => t.status === 'not_started').length;
    const inProgress = visibleTasks.filter((t) => t.status === 'in_progress').length;
    const waiting = visibleTasks.filter((t) => t.status === 'waiting').length;
    const completed = visibleTasks.filter((t) => t.status === 'completed').length;
    const overdue = visibleTasks.filter(
      (t) =>
        t.status !== 'completed' &&
        (t.deadline.toLowerCase().includes('trễ') ||
          t.deadline.includes('08/05') ||
          t.deadline.includes('overdue')),
    ).length;

    return [
      {
        label: 'CHƯA KHỞI ĐỘNG',
        count: notStarted,
        wrapperClass: 'bg-white border-slate-200 shadow-2xs',
        labelColor: 'text-slate-400',
        countColor: 'text-slate-950',
        dotClass: 'bg-slate-400',
      },
      {
        label: 'ĐANG THỰC HIỆN',
        count: inProgress,
        wrapperClass: 'bg-blue-50/50 border-blue-100 shadow-2xs',
        labelColor: 'text-blue-600',
        countColor: 'text-blue-700',
        dotClass: 'bg-blue-500 animate-pulse',
      },
      {
        label: 'CHỜ DUYỆT CA',
        count: waiting,
        wrapperClass: 'bg-amber-50/50 border-amber-100 shadow-2xs',
        labelColor: 'text-amber-600',
        countColor: 'text-amber-700',
        dotClass: 'bg-[#FFB800]',
      },
      {
        label: 'HOÀN THÀNH',
        count: completed,
        wrapperClass: 'bg-emerald-50/40 border-emerald-150 shadow-2xs',
        labelColor: 'text-emerald-600',
        countColor: 'text-[#00B050]',
        dotClass: 'bg-[#00B050]',
      },
      {
        label: 'QUÁ HẠN CHỐT CA',
        count: overdue,
        wrapperClass: 'bg-rose-50 text-rose-800 border-rose-100 shadow-2xs col-span-2 md:col-span-1',
        labelColor: 'text-rose-600',
        countColor: 'text-rose-700',
        dotClass: 'bg-rose-600',
      },
    ];
  }, [visibleTasks]);



  const actionOptions = useMemo(() => [
    {
      value: 'create',
      label: (
        <div className="flex items-center gap-2.5 text-sm text-slate-800 font-bold w-full">
          <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>Tạo việc mới</span>
        </div>
      )
    },
    {
      value: 'quick',
      label: (
        <div className="flex items-center gap-2.5 text-sm text-slate-800 font-bold w-full">
          <Send className="w-4 h-4 text-[#C21A1A]" />
          <span>Giao nhanh</span>
        </div>
      )
    },
  ], []);

  const selectPlaceholder = useMemo(() => (
    <div className="flex items-center gap-2 text-white font-extrabold text-sm uppercase tracking-wider">
      <Zap className="w-4 h-4 fill-white text-white animate-none" />
      <span>Thao tác nhanh</span>
    </div>
  ), []);

  const handleActionChange = useCallback((val: string | number) => {
    if (val === 'create') {
      setIsAddingTask(true);
    } else if (val === 'quick') {
      setQuickDelegateOpen(true);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-128px)] space-y-3.5 overflow-y-auto pb-24 pr-1 text-left scrollbar-none md:h-[calc(100vh-96px)] md:pb-10 md:pr-1 font-sans text-sm text-slate-650">

      {/* 1. NOTIFICATION TOAST SUCCESS STATUS */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xl text-sm font-bold font-sans max-w-sm transition-all animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <ModuleHeader
        title="Điều phối công việc Chi nhánh"
        description="Quản trị tiến độ, ủy nhiệm siêu tốc và kiểm soát chỉ tiêu nhân sự trong ca trực showroom thời gian thực."
        icon={<span className="text-lg sm:text-xl">🛫</span>}
      >
        {canCreate && (
          <div className="w-full sm:w-48">
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <Button
                type="button"
                onClick={() => setIsAddingTask(true)}
                className="h-10 rounded-xl bg-[#C21A1A] px-3 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-[#A81515]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3]" /> Tạo việc
              </Button>
              <Button
                type="button"
                onClick={() => setQuickDelegateOpen(true)}
                className="h-10 rounded-xl bg-white px-3 text-sm font-black uppercase tracking-wide text-[#C21A1A] shadow-sm ring-1 ring-[#C21A1A]/20 hover:bg-rose-50"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Giao nhanh
              </Button>
            </div>
            <div className="hidden sm:block">
              <CustomSelect
                options={actionOptions}
                value=""
                onChangeValue={handleActionChange}
                placeholder={selectPlaceholder}
                clearable={false}
                className="!bg-[#C21A1A] hover:!bg-[#A81515] !text-white font-extrabold text-sm uppercase tracking-wider rounded-xl border-none shadow-sm flex items-center justify-between px-4 py-2.5 h-10 w-full"
                containerClassName="w-full"
                iconClassName="!text-white opacity-100 right-4"
              />
            </div>
          </div>
        )}
      </ModuleHeader>

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRefresh}
              className="h-auto rounded-lg px-3 py-1.5 text-sm font-black text-rose-700 hover:bg-rose-100"
            >
              Thử lại
            </Button>
          )}
        </div>
      )}

      {/* 3. CORE ANALYTICAL PILLS STRIP (NATIVE OVERVIEW STATS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={cn('p-4 rounded-xl border', stat.wrapperClass)}>
            <p className={cn('text-sm font-black uppercase tracking-wider', stat.labelColor)}>{stat.label}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn('text-xl font-black font-sans', stat.countColor)}>{stat.count}</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', stat.dotClass)}></span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. FILTER CONTROLS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 min-w-0">

        {/* Switch Filter Tab Segment */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full min-w-0 md:w-fit">
          <TabsList className="!grid !h-auto !w-full grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 sm:!inline-flex sm:!w-auto sm:flex-row sm:flex-nowrap">
            <TabsTrigger
              value="all"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-sm font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Tất cả ({visibleTasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-sm font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Của tôi ({visibleTasks.filter(t => t.assignee === currentUser?.fullName).length})
            </TabsTrigger>
            <TabsTrigger
              value="late"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-sm font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-rose-100/60 data-[state=active]:border data-[state=active]:border-rose-100 data-[state=active]:text-rose-700 text-slate-500 hover:text-rose-700 bg-transparent"
            >
              Trễ hạn ({visibleTasks.filter(t => t.status !== 'completed' && (t.deadline.toLowerCase().includes('trễ') || t.deadline.includes('08/05'))).length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-sm font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Đã hoàn thành ({visibleTasks.filter(t => t.status === 'completed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Dynamic Live Text Input */}
        <div className="md:w-80 w-full">
          <SearchInput
            placeholder="Tìm kiếm theo công việc, vai trò..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="font-semibold"
          />
        </div>

      </div>

      {/* 5. PRISTINE CARD STREAM OF TASKS / RECOVERED FROM CUSTOMTABLE */}
      <CustomTable<TaskItem>
        columns={columns}
        data={filteredTasks}
        loading={isLoading}
        enableFiltering={true}
        showFilterRow={true}
        enablePagination={true}
        tableMinWidth={1100}
        emptyMessage="Không tìm thấy nhiệm vụ nào. Vui lòng rà soát lại ký tự tìm kiếm hoặc bộ chuyển đổi trạng thái ở trên."
        onRowClick={(row) => setViewingTask(row.original)}
        className="bg-white rounded-xl shadow-2xs border border-slate-200"
      />

      {/* Manual Add/Edit Task Form Modal */}
      <TaskCreateModal
        isOpen={isAddingTask || editingTask !== null}
        initialValues={editingTask}
        onClose={() => {
          setIsAddingTask(false);
          setEditingTask(null);
        }}
        onSubmit={async (values) => {
          if (editingTask) {
            try {
              await onUpdateTask(editingTask.id, values);
              setEditingTask(null);
              showToast("🎉 Đã cập nhật công việc thành công!");
            } catch {
              showToast("Không thể cập nhật công việc. Vui lòng thử lại.");
            }
          } else {
            await handleCreateTask(values);
          }
        }}
        staffMembers={staffMembers}
        roles={roles}
      />

      {/* Quick Delegate Modal */}
      <TaskQuickDelegateModal
        isOpen={quickDelegateOpen}
        onClose={() => setQuickDelegateOpen(false)}
        onSubmit={handleQuickDelegate}
        staffMembers={staffMembers}
        tasks={visibleTasks}
      />

      {/* Detail Task Modal */}
      <TaskDetailModal
        isOpen={viewingTask !== null}
        task={viewingTask}
        onClose={() => setViewingTask(null)}
        currentUser={currentUser}
        canUpdate={canUpdate}
        staffMembers={staffMembers}
        onUpdateHelpers={async (taskId, helpers) => {
          try {
            await onUpdateTask(taskId, { helpers });
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, helpers } : null);
            }
            showToast("👥 Đã cập nhật danh sách người phụ giúp!");
          } catch {
            showToast("Không thể cập nhật người phụ giúp. Vui lòng thử lại.");
          }
        }}
        onUpdateStatus={async (taskId, status) => {
          try {
            await onUpdateTaskStatus(taskId, status);
            // Refresh viewing task in state to show new status
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, status } : null);
            }
            showToast(`🔄 Cập nhật trạng thái sang: "${statusMeta[status].text}"`);
          } catch {
            showToast("Không thể cập nhật trạng thái. Vui lòng thử lại.");
          }
        }}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <ActionConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDelete(null);
          }
        }}
        title="Xác nhận xóa công việc"
        description={
          taskToDelete
            ? `Bạn có chắc chắn muốn xóa công việc "${taskToDelete.title}" không? Hành động này không thể hoàn tác.`
            : ''
        }
        onConfirm={async () => {
          if (taskToDelete) {
            try {
              await onDeleteTask(taskToDelete.id);
              setTaskToDelete(null);
              showToast("🗑️ Đã xóa công việc thành công!");
            } catch {
              showToast("Không thể xóa công việc. Vui lòng thử lại.");
            }
          }
        }}
        variant="confirm"
      />
    </div>
  );
}
