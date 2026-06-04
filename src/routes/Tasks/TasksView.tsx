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
import { cn } from '@shared/lib/utils';
import { ModuleHeader } from '@shared/components';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { TaskCreateModal } from './components/task-create-modal';
import { TaskQuickDelegateModal } from './components/task-quick-delegate-modal';
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
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);




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
  const filteredTasks = tasks.filter(task => {
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
    const notStarted = tasks.filter((t) => t.status === 'not_started').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const waiting = tasks.filter((t) => t.status === 'waiting').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(
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
  }, [tasks]);



  const actionOptions = useMemo(() => [
    {
      value: 'create',
      label: (
        <div className="flex items-center gap-2.5 text-xs text-slate-800 font-bold w-full">
          <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>Tạo việc mới</span>
        </div>
      )
    },
    {
      value: 'quick',
      label: (
        <div className="flex items-center gap-2.5 text-xs text-slate-800 font-bold w-full">
          <Send className="w-4 h-4 text-[#C21A1A]" />
          <span>Giao nhanh</span>
        </div>
      )
    },
  ], []);

  const selectPlaceholder = useMemo(() => (
    <div className="flex items-center gap-2 text-white font-extrabold text-[11px] uppercase tracking-wider">
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
        <div className="fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xl text-xs font-bold font-sans max-w-sm transition-all animate-bounce">
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
                className="h-10 rounded-xl bg-[#C21A1A] px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-sm hover:bg-[#A81515]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3]" /> Tạo việc
              </Button>
              <Button
                type="button"
                onClick={() => setQuickDelegateOpen(true)}
                className="h-10 rounded-xl bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#C21A1A] shadow-sm ring-1 ring-[#C21A1A]/20 hover:bg-rose-50"
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
                className="!bg-[#C21A1A] hover:!bg-[#A81515] !text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl border-none shadow-sm flex items-center justify-between px-4 py-2.5 h-10 w-full"
                containerClassName="w-full"
                iconClassName="!text-white opacity-100 right-4"
              />
            </div>
          </div>
        )}
      </ModuleHeader>

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRefresh}
              className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100"
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
            <p className={cn('text-[10px] font-black uppercase tracking-wider', stat.labelColor)}>{stat.label}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn('text-xl font-black font-sans', stat.countColor)}>{stat.count}</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', stat.dotClass)}></span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. FILTER CONTROLS & SEARCH BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 min-w-0">

        {/* Switch Filter Tab Segment */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full min-w-0 md:w-fit">
          <TabsList className="!grid !h-auto !w-full grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 sm:!inline-flex sm:!w-auto sm:flex-row sm:flex-nowrap">
            <TabsTrigger
              value="all"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Tất cả ({tasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Của tôi ({tasks.filter(t => t.assignee === currentUser?.fullName).length})
            </TabsTrigger>
            <TabsTrigger
              value="late"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-rose-100/60 data-[state=active]:border data-[state=active]:border-rose-100 data-[state=active]:text-rose-700 text-slate-500 hover:text-rose-700 bg-transparent"
            >
              Trễ hạn ({tasks.filter(t => t.status !== 'completed' && (t.deadline.toLowerCase().includes('trễ') || t.deadline.includes('08/05'))).length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="min-w-0 w-full px-2 sm:px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Đã hoàn thành ({tasks.filter(t => t.status === 'completed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Dynamic Live Text Input */}
        <div className="md:w-80 w-full">
          <SearchInput
            placeholder="Tìm kiếm theo công việc, vai trò..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
          />
        </div>

      </div>

      {/* 5. PRISTINE CARD STREAM OF TASKS / RECOVERED FROM CUSTOMTABLE */}
      <div className="bg-slate-50/30 rounded-2xl border border-slate-200/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isLoading && filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 font-semibold text-xs">
              Đang tải danh sách công việc...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 font-semibold text-xs">
              Không tìm thấy nhiệm vụ nào. Vui lòng rà soát lại ký tự tìm kiếm hoặc bộ chuyển đổi trạng thái ở trên.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityInfo = priorityMeta[task.priority] || priorityMeta.medium;
              const statusInfo = statusMeta[task.status] || statusMeta.not_started;
              const statusTheme = getStatusTheme(task.status);



              const renderDeadline = (deadline: string) => {
                const parts = deadline.split(' ');
                if (parts.length >= 2) {
                  const datePart = parts[0];
                  const timePart = parts.slice(1).join(' ');
                  return (
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-700">{datePart}</span>
                      <span className="flex items-center gap-1 text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timePart}
                      </span>
                    </div>
                  );
                }
                return <span className="text-slate-700 font-bold">{deadline}</span>;
              };

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-300 relative hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-slate-200/80 hover:-translate-y-[2px] w-full max-w-[420px] mx-auto md:mx-0",
                    statusTheme.border
                  )}
                >
                  {/* Card Header: Clipboard Icon & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap pr-2">
                      {/* Icon clipboard với background nhạt */}
                      <div className={cn("p-1 rounded-lg shrink-0", statusTheme.iconBg)}>
                        <ClipboardList className="w-3.5 h-3.5" />
                      </div>

                      {/* Priority Badge */}
                      <span className={cn("inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full border tracking-wide shrink-0", priorityInfo.bg)}>
                        <span className="w-1 h-1 rounded-full bg-current"></span>
                        {priorityInfo.text}
                      </span>

                      {/* Status Badge */}
                      <span className={cn("inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full border tracking-normal shrink-0", statusInfo.bg)}>
                        {statusInfo.icon && (
                          <statusInfo.icon className={cn("w-2.5 h-2.5 shrink-0", statusInfo.iconColor)} />
                        )}
                        <span>{statusInfo.text}</span>
                      </span>
                    </div>

                    {/* 3-dots Menu for quick status change */}
                    {canUpdate && task.status !== 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center focus-visible:outline-hidden shrink-0"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1.5 z-50 text-slate-800">
                          <DropdownMenuLabel className="px-3 py-1 text-slate-400 text-[8.5px] uppercase font-black tracking-wider border-b border-slate-100 mb-1">
                            Cập nhật nhanh
                          </DropdownMenuLabel>
                          {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => {
                            const Icon = statusMeta[st].icon;
                            return (
                              <DropdownMenuItem
                                key={st}
                                onClick={async () => {
                                  try {
                                    await onUpdateTaskStatus(task.id, st);
                                    showToast(`🔄 Cập nhật trạng thái sang: "${statusMeta[st].text}"`);
                                  } catch {
                                    showToast("Không thể cập nhật trạng thái. Vui lòng thử lại.");
                                  }
                                }}
                                disabled={isSaving}
                                className="px-3 py-2 rounded-lg focus:bg-slate-50 focus:text-slate-900 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between font-bold text-slate-700 transition-colors text-[11px] cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={cn("w-3.5 h-3.5 shrink-0", statusMeta[st].iconColor)} />
                                  <span>{statusMeta[st].text}</span>
                                </div>
                                {task.status === st && <Check className="w-3.5 h-3.5 text-[#C21A1A] stroke-[3]" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Card Title & Code */}
                  <div className="space-y-1 mt-1 text-left">
                    <h4 className="font-extrabold text-slate-900 text-[16px] leading-snug tracking-tight hover:text-slate-950 transition-colors break-words">
                      {task.title}
                    </h4>
                    <div className="text-xs text-slate-400 font-sans tracking-wider">
                      {generateTaskCode(task)}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100/80 my-0.5" />

                  {/* Card Details (Grid key-value list with icons) */}
                  <div className="flex-1 flex flex-col gap-2.5 text-sm text-left">
                    {/* Description */}
                    <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-start py-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                        <AlignLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Mô tả
                      </span>
                      <span className="text-slate-700 font-medium whitespace-pre-line leading-relaxed break-words">
                        {task.notes || <span className="text-slate-350 italic">Không có ghi chú...</span>}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Người phụ trách
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-black text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
                          {task.assignee?.charAt(0) || 'U'}
                        </div>
                        <span className="text-slate-700 font-bold truncate">{task.assignee || 'Chưa phân công'}</span>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Hạn hoàn thành
                      </span>
                      <div className="min-w-0">
                        {renderDeadline(task.deadline)}
                      </div>
                    </div>

                    {/* Branch / Dept */}
                    <div className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] gap-2 items-center py-0.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Bộ phận
                      </span>
                      <span className="text-slate-700 font-bold truncate">
                        {task.department}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {canUpdate && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            className="h-7 text-[10px] px-2 rounded-lg font-bold hover:bg-slate-50 border-slate-200 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                            onClick={() => setEditingTask(task)}
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            className="h-7 text-[10px] px-2 rounded-lg font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                            onClick={() => setTaskToDelete(task)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

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
        tasks={tasks}
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
