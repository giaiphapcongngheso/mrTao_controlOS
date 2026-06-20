import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Calendar,
  CheckCircle2,
  Zap,
  Send,
  Circle,
  Play,
  Clock,
  ListTodo,
  ClipboardList,
  Pencil,
  Trash2,
  AlertTriangle,
  Eye,
  AlertCircle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { TaskItem, TaskRequestType, TaskStatus, SubTask } from '../../types/tasks.types';
import type { StaffMember, StaffRole } from '../../types/staff.types';
import type { UserSession } from '../../stores/app-store';
import {
  Button,
  SearchInput,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  Checkbox,
} from '@shared/ui';
import { CustomTable } from '@shared/components';
import { cn } from '@shared/lib/utils';
import { ModuleHeader } from '@shared/components';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { ActionStack } from '@shared/components/custom/action-stack';
import { toastSuccess, toastError } from '../../shared/lib/toast';
import { Input } from '../../../share/ui/input';
import { TaskCreateModal } from './components/task-create-modal';
import { TaskQuickDelegateModal } from './components/task-quick-delegate-modal';
import { TaskDetailModal } from './components/task-detail-modal';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';
import { TaskCardList } from './components/task-card-list';
import { TaskKanbanView } from './components/task-kanban-view';
import { TaskCalendarView } from './components/task-calendar-view';
import { useIsMobile } from '../../shared/hooks/use-is-mobile';
import { isTaskOverdue, parseTaskDeadline, getDeadlineUrgency, getUrgencyLabel, getUrgencyBadgeClass } from './_hook/use-task-deadline';
import { generateTaskCode, stripHtmlAndTruncate } from './constants/task-meta';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';

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
  onUpdateSubtasks?: (taskId: string, subtasks: SubTask[]) => void | Promise<void>;
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



// ============ RIGHT SIDEBAR COMPONENTS (Mockup Section 8) ============

// Mini calendar widget for sidebar
const MiniCalendarWidget = React.memo(function MiniCalendarWidget({
  tasks,
  onTaskClick,
}: {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
}) {
  const [month, setMonth] = useState(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of tasks) {
      const date = parseTaskDeadline(task.deadline);
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        const arr = map.get(key) || [];
        arr.push(task);
        map.set(key, arr);
      }
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const handlePrev = useCallback(() => setMonth((m) => subMonths(m, 1)), []);
  const handleNext = useCallback(() => setMonth((m) => addMonths(m, 1)), []);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={handlePrev} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 cursor-pointer">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="text-[11px] font-black text-slate-700 capitalize">
          Tháng {format(month, 'M, yyyy')}
        </span>
        <button type="button" onClick={handleNext} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 cursor-pointer">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
          <div key={d} className="text-center text-[9px] font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) || [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const hasOverdue = dayTasks.some((t) => isTaskOverdue(t));

          return (
            <button
              key={key}
              type="button"
              className={cn(
                'w-full aspect-square flex flex-col items-center justify-center rounded-md text-[10px] font-bold transition-colors cursor-pointer relative',
                today && 'bg-[#C21A1A] text-white font-black',
                !today && inMonth && 'text-slate-700 hover:bg-slate-50',
                !today && !inMonth && 'text-slate-300',
              )}
            >
              {format(day, 'd')}
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={cn('w-1 h-1 rounded-full', hasOverdue ? 'bg-rose-500' : 'bg-blue-500')}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// Upcoming tasks list for sidebar
const UpcomingTasksList = React.memo(function UpcomingTasksList({
  tasks,
  onTaskClick,
}: {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
}) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => {
        if (t.status === 'completed') return false;
        const d = parseTaskDeadline(t.deadline);
        if (!d) return false;
        const diff = d.getTime() - now.getTime();
        return diff > -7 * 24 * 60 * 60 * 1000; // include up to 7 days overdue
      })
      .sort((a, b) => {
        const da = parseTaskDeadline(a.deadline)?.getTime() ?? 0;
        const db = parseTaskDeadline(b.deadline)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 8);
  }, [tasks]);

  if (upcoming.length === 0) {
    return (
      <p className="text-xs text-slate-300 italic text-center py-6 font-medium">
        Không có việc sắp đến hạn
      </p>
    );
  }

  const priorityDot: Record<string, string> = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-400',
  };

  return (
    <div className="divide-y divide-slate-50">
      {upcoming.map((task) => {
        const overdue = isTaskOverdue(task);
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onTaskClick(task)}
            className="w-full text-left flex items-start gap-2.5 py-2.5 px-3 hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <span className={cn(
              'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
              overdue ? 'bg-rose-500' : (priorityDot[task.priority] || 'bg-blue-400'),
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-700 line-clamp-1 group-hover:text-[#C21A1A] transition-colors">
                {task.title}
              </p>
              <span className={cn(
                'text-[10px] font-semibold',
                overdue ? 'text-rose-500' : 'text-slate-400',
              )}>
                {task.deadline}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

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
  onUpdateSubtasks,
  canCreate = false,
  canUpdate = false,
  currentUser,
}: TasksViewProps) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'late' | 'completed'>('all');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'calendar'>('list');

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
          <span className="text-slate-900">{datePart}</span>
          <span className="flex items-center gap-1 text-slate-700 font-normal bg-slate-100 px-1.5 py-0.5 rounded text-sm">
            <Clock className="w-3 h-3 text-slate-400" />
            {timePart}
          </span>
        </div>
      );
    }
    return <span className="text-slate-900 font-normal text-sm">{deadline}</span>;
  }, []);

  const columns = useMemo<ColumnDef<TaskItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
        meta: {
          sticky: 'left',
        },
      },
      {
        accessorKey: 'title',
        header: 'Tên công việc',
        size: 250,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <button
              type="button"
              className="text-left font-medium text-slate-900 hover:text-[#C21A1A] hover:underline text-sm leading-snug break-words transition-colors cursor-pointer w-full focus:outline-none"
              onClick={() => setViewingTask(task)}
            >
              {task.title}
            </button>
          );
        },
        meta: {
          filterElement: (column) => (
            <Input
              size="sm"
              placeholder="Lọc tên..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              clearable={false}
              className="font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'notes',
        header: 'Mô tả chi tiết',
        size: 300,
        cell: ({ row }) => (
          <div className="text-slate-800 font-normal text-sm text-left line-clamp-2 break-words max-w-sm whitespace-pre-line leading-relaxed">
            {stripHtmlAndTruncate(row.original.notes, 150) || <span className="text-slate-400 italic">Không có mô tả...</span>}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <Input
              size="sm"
              placeholder="Lọc mô tả..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              clearable={false}
              className="font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'priority',
        header: 'Độ ưu tiên',
        size: 130,
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
            const val = (column.getFilterValue() as string) ?? '';
            return (
              <CustomSelect
                options={[
                  { label: 'Tất cả', value: 'all' },
                  { label: 'Cao', value: 'high' },
                  { label: 'Trung bình', value: 'medium' },
                  { label: 'Thấp', value: 'low' },
                ]}
                value={val || 'all'}
                onChangeValue={(v) => column.setFilterValue(v === 'all' ? undefined : v)}
                placeholder="Tất cả"
                clearable={false}
                size="sm"
              />
            );
          },
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 160,
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
            const val = (column.getFilterValue() as string) ?? '';
            return (
              <CustomSelect
                options={[
                  { label: 'Tất cả', value: 'all' },
                  { label: 'Chưa làm', value: 'not_started' },
                  { label: 'Đang làm', value: 'in_progress' },
                  { label: 'Chờ duyệt', value: 'waiting' },
                  { label: 'Hoàn thành', value: 'completed' },
                ]}
                value={val || 'all'}
                onChangeValue={(v) => column.setFilterValue(v === 'all' ? undefined : v)}
                placeholder="Tất cả"
                clearable={false}
                size="sm"
              />
            );
          },
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Người phụ trách',
        size: 180,
        cell: ({ row }) => {
          const assigneeVal = row.original.assignee;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-sm flex items-center justify-center font-medium text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
                {assigneeVal?.charAt(0) || 'U'}
              </div>
              <span className="text-slate-900 font-normal truncate text-sm">{assigneeVal || 'Chưa phân công'}</span>
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <Input
              size="sm"
              placeholder="Lọc người phụ trách..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              clearable={false}
              className="font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'department',
        header: 'Bộ phận',
        size: 160,
        cell: ({ row }) => (
          <div className="text-slate-900 font-normal text-sm truncate text-left">
            {row.original.department}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <Input
              size="sm"
              placeholder="Lọc bộ phận..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              clearable={false}
              className="font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'deadline',
        header: 'Hạn hoàn thành',
        size: 200,
        cell: ({ row }) => {
          const task = row.original;
          const urgency = getDeadlineUrgency(task);
          const urgencyLabel = getUrgencyLabel(urgency);
          const urgencyClass = getUrgencyBadgeClass(urgency);
          const subtaskCount = task.subtasks?.length ?? 0;
          const subtaskCompleted = task.subtasks?.filter((s) => s.completed).length ?? 0;
          const progress = task.progress ?? 0;

          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {renderDeadline(task.deadline)}
                {urgencyLabel && (
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap',
                    urgencyClass,
                  )}>
                    {urgency === 'overdue' && <AlertTriangle className="w-2.5 h-2.5" />}
                    {urgencyLabel}
                  </span>
                )}
              </div>
              {subtaskCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {subtaskCompleted}/{subtaskCount}
                  </span>
                </div>
              )}
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <Input
              size="sm"
              placeholder="Lọc hạn..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              clearable={false}
              className="font-medium"
            />
          ),
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 110,
        cell: ({ row }) => {
          const task = row.original;
          const actions = [
            {
              key: 'view',
              label: 'Xem',
              variant: 'ghost' as const,
              onClick: () => setViewingTask(task),
              element: (
                <Button
                  key="view"
                  variant="ghost"
                  tooltip="Xem chi tiết"
                  className="w-8 h-8 p-0 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 active:scale-95 hover:scale-105 transition-all duration-200 flex items-center justify-center border-none shadow-none cursor-pointer"
                  onClick={() => setViewingTask(task)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              ),
            },
            {
              key: 'edit',
              label: 'Sửa',
              variant: 'ghost' as const,
              onClick: () => setEditingTask(task),
              element: (
                <Button
                  key="edit"
                  variant="ghost"
                  tooltip="Chỉnh sửa công việc"
                  className="w-8 h-8 p-0 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50/80 active:scale-95 hover:scale-105 transition-all duration-200 flex items-center justify-center border-none shadow-none cursor-pointer"
                  onClick={() => setEditingTask(task)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              ),
            },
            {
              key: 'delete',
              label: 'Xóa',
              variant: 'ghost' as const,
              onClick: () => setTaskToDelete(task),
              element: (
                <Button
                  key="delete"
                  variant="ghost"
                  tooltip="Xóa công việc"
                  className="w-8 h-8 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50/80 active:scale-95 hover:scale-105 transition-all duration-200 flex items-center justify-center border-none shadow-none cursor-pointer"
                  onClick={() => setTaskToDelete(task)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ),
            },
          ];

          return (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <ActionStack
                actions={actions}
                size="sm"
                className="justify-center gap-1.5"
              />
            </div>
          );
        },
        meta: {
          sticky: 'right',
        },
      },
    ],
    [renderDeadline, setEditingTask, setTaskToDelete, setViewingTask]
  );

  // Filter tasks based on current user roles & permissions
  const visibleTasks = useMemo(() => {
    const isManager = canUpdate || canCreate;
    if (isManager || !currentUser) return tasks;
    return tasks.filter(task =>
      task.assignee === currentUser.fullName ||
      (task.helpers || []).includes(currentUser.fullName)
    );
  }, [tasks, canUpdate, canCreate, currentUser]);


  const handleCreateTask = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
      setIsAddingTask(false);
      toastSuccess("Đã lưu và giao việc mới thành công!");
    } catch {
      toastError("Không thể lưu công việc. Vui lòng thử lại.");
    }
  }, [onAddTask]);

  const handleQuickDelegate = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
      setQuickDelegateOpen(false);
      toastSuccess(`Đã kích hoạt Giao nhanh cho nhân viên ${taskPayload.assignee}!`);
    } catch {
      toastError("Không thể giao nhanh công việc. Vui lòng thử lại.");
    }
  }, [onAddTask]);


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
      return isTaskOverdue(task);
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
    const overdue = visibleTasks.filter((t) => isTaskOverdue(t)).length;

    return [
      {
        label: 'CHƯA KHỞI ĐỘNG',
        count: notStarted,
        icon: Circle,
        wrapperClass: 'bg-white border-slate-200 shadow-2xs',
        labelColor: 'text-slate-400',
        countColor: 'text-slate-800',
        iconBg: 'bg-slate-100 text-slate-400',
        dotColor: 'bg-slate-400',
      },
      {
        label: 'ĐANG THỰC HIỆN',
        count: inProgress,
        icon: Play,
        wrapperClass: 'bg-blue-50/50 border-blue-100 shadow-2xs',
        labelColor: 'text-blue-600',
        countColor: 'text-blue-700',
        iconBg: 'bg-blue-100 text-blue-600',
        dotColor: 'bg-blue-500',
      },
      {
        label: 'CHỜ DUYỆT',
        count: waiting,
        icon: Clock,
        wrapperClass: 'bg-amber-50/50 border-amber-100 shadow-2xs',
        labelColor: 'text-amber-600',
        countColor: 'text-amber-700',
        iconBg: 'bg-amber-100 text-amber-600',
        dotColor: 'bg-amber-500',
      },
      {
        label: 'HOÀN THÀNH',
        count: completed,
        icon: CheckCircle2,
        wrapperClass: 'bg-emerald-50/40 border-emerald-150 shadow-2xs',
        labelColor: 'text-emerald-600',
        countColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100 text-emerald-600',
        dotColor: 'bg-emerald-500',
      },
      {
        label: 'QUÁ HẠN',
        count: overdue,
        icon: AlertTriangle,
        wrapperClass: 'bg-rose-50 border-rose-100 shadow-2xs',
        labelColor: 'text-rose-600',
        countColor: 'text-rose-700',
        iconBg: 'bg-rose-100 text-rose-600',
        dotColor: 'bg-rose-500',
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
    <div className="h-[calc(100vh-128px)] space-y-3.5 overflow-y-auto pb-24 pr-1 text-left scrollbar-none md:h-[calc(100vh-96px)] md:flex md:flex-col md:overflow-hidden md:pb-0 md:pr-0 font-sans text-sm text-slate-650 min-w-0 w-full overflow-x-hidden">



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

      {/* 3. CORE ANALYTICAL PILLS STRIP (Mockup Section 3) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('p-3.5 rounded-xl border flex items-center gap-3 relative', stat.wrapperClass)}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.iconBg)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-[10px] font-black uppercase tracking-wider leading-tight', stat.labelColor)}>{stat.label}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={cn('text-2xl font-black font-sans leading-none', stat.countColor)}>{stat.count}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
                  {visibleTasks.length > 0 ? `${Math.round((stat.count / visibleTasks.length) * 100)}% tổng việc` : ''}
                </span>
              </div>
              {/* Dot indicator (mockup: small colored dot top-right) */}
              <span className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', stat.dotColor)} />
            </div>
          );
        })}
      </div>

      {/* 5. VIEW TABS ROW (Mockup Section 5: Danh sách/Kanban/Lịch + Search + Bộ lọc) */}
      {!isMobile && (
        <div className="flex items-center justify-between gap-4">
          {/* View Tabs with underline */}
          <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-200 pb-0">
            {([
              { key: 'list' as const, label: 'Danh sách', icon: <ListTodo className="w-4 h-4 shrink-0" /> },
              { key: 'kanban' as const, label: 'Kanban', icon: <ClipboardList className="w-4 h-4 shrink-0" /> },
              { key: 'calendar' as const, label: 'Lịch', icon: <Calendar className="w-4 h-4 shrink-0" /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={cn(
                  'flex items-center gap-1.5 px-0 pb-3 text-sm font-bold transition-all cursor-pointer relative border-b-2 border-transparent -mb-[1px]',
                  activeView === key
                    ? 'text-[#C21A1A] border-b-[#C21A1A]'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {icon}
                <span>{label}</span>
                {/* Badge count */}
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-colors',
                  activeView === key
                    ? 'bg-[#C21A1A] text-white'
                    : 'bg-slate-100 text-slate-400'
                )}>
                  {key === 'list' ? filteredTasks.length : key === 'kanban' ? filteredTasks.length : filteredTasks.length}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Search + Filter button */}
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchInput
                placeholder="Tìm kiếm công việc..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="font-semibold"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
              Bộ lọc
            </Button>
          </div>
        </div>
      )}

      {/* FILTER ROW (Mockup: pills + dropdowns) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 min-w-0">
        {/* Filter pills row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'all' as const, label: 'Tất cả', count: visibleTasks.length },
            { key: 'mine' as const, label: 'Của tôi', count: visibleTasks.filter(t => t.assignee === currentUser?.fullName).length },
            { key: 'late' as const, label: 'Trễ hạn', count: visibleTasks.filter(t => isTaskOverdue(t)).length, isRed: true },
            { key: 'completed' as const, label: 'Hạn hoàn thành', count: visibleTasks.filter(t => t.status === 'completed').length },
          ] as const).map(({ key, label, count, ...rest }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap',
                activeFilter === key
                  ? ('isRed' in rest && rest.isRed)
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-white text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter dropdowns (Mockup: Vai trò, Người phụ trách, Trạng thái, Thời gian) */}
        {!isMobile && (
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <div className="w-36">
              <CustomSelect
                options={roles?.map((role) => ({ label: role.name, value: role.id })) ?? []}
                placeholder="Chọn vai trò"
                size="sm"
              />
            </div>
            <div className="w-36">
              <CustomSelect
                options={staffMembers?.map((s) => ({ label: s.fullName, value: s.fullName })) ?? []}
                placeholder="Chọn người"
                size="sm"
              />
            </div>
            <div className="w-36">
              <CustomSelect
                options={[
                  { label: 'Tất cả', value: 'all' },
                  { label: 'Chưa làm', value: 'not_started' },
                  { label: 'Đang làm', value: 'in_progress' },
                  { label: 'Chờ duyệt', value: 'waiting' },
                  { label: 'Hoàn thành', value: 'completed' },
                ]}
                placeholder="Tất cả"
                size="sm"
                clearable={false}
              />
            </div>
            <div className="w-44">
              <CustomSelect
                options={[
                  { label: 'Hôm nay', value: 'today' },
                  { label: 'Tuần này', value: 'week' },
                  { label: 'Tháng này', value: 'month' },
                ]}
                placeholder="Chọn khoảng thời gian"
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Mobile: search + view toggle */}
        {isMobile && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <SearchInput
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* VIEW RENDERING */}

      {/* Mobile: always show Card List */}
      {isMobile && (
        <div className="flex-1 min-h-0 px-1">
          <TaskCardList
            tasks={filteredTasks}
            onCardClick={setViewingTask}
            onEdit={canUpdate ? setEditingTask : undefined}
            onDelete={canUpdate ? setTaskToDelete : undefined}
          />
        </div>
      )}

      {/* MAIN CONTENT AREA (Mockup: Table + Right Sidebar) */}
      {!isMobile && (
        <div className={cn('flex gap-4', activeView === 'list' ? 'flex-row' : 'flex-col')}>
          {/* Left: Table / Kanban / Calendar */}
          <div className="flex-1 min-w-0">
            {/* Desktop: List View (Table) */}
            {activeView === 'list' && (
              <CustomTable<TaskItem>
                columns={columns}
                data={filteredTasks}
                loading={isLoading}
                enableFiltering={true}
                showFilterRow={true}
                enablePagination={true}
                tableMinWidth={1500}
                emptyMessage="Không tìm thấy nhiệm vụ nào."
                onRowClick={(row) => setViewingTask(row.original)}
                className="flex-1 min-h-0 bg-white rounded-xl shadow-2xs border border-slate-200"
                enableRowSelection={true}
                bulkSelectionActions={(table) => {
                  const selectedRows = table.getFilteredSelectedRowModel().rows;
                  const count = selectedRows.length;
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold"
                        onClick={async () => {
                          if (window.confirm(`Bạn có chắc chắn muốn xóa ${count} công việc đã chọn không?`)) {
                            const selectedIds = selectedRows.map((r) => r.original.id);
                            await Promise.all(selectedIds.map((id) => onDeleteTask(id)));
                            table.resetRowSelection();
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa {count} mục</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border-slate-200"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Đổi trạng thái</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400">
                            Chọn trạng thái mới
                          </DropdownMenuLabel>
                          {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => (
                            <DropdownMenuItem
                              key={st}
                              className="text-xs font-semibold cursor-pointer"
                              onClick={async () => {
                                const selectedIds = selectedRows.map((r) => r.original.id);
                                await Promise.all(selectedIds.map((id) => onUpdateTaskStatus(id, st)));
                                table.resetRowSelection();
                                toastSuccess(`Đã cập nhật ${count} công việc sang "${statusMeta[st].text}"`);
                              }}
                            >
                              {statusMeta[st].text}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                }}
              />
            )}

            {/* Desktop: Kanban View */}
            {activeView === 'kanban' && (
              <TaskKanbanView
                tasks={filteredTasks}
                onUpdateStatus={onUpdateTaskStatus}
                onCardClick={setViewingTask}
                isLoading={isLoading}
              />
            )}

            {/* Desktop: Calendar View */}
            {activeView === 'calendar' && (
              <TaskCalendarView
                tasks={filteredTasks}
                onTaskClick={setViewingTask}
              />
            )}
          </div>

          {/* RIGHT SIDEBAR (Mockup Section 8: Lịch hôm nay + Việc sắp đến hạn) */}
          {activeView === 'list' && (
            <div className="w-[280px] shrink-0 space-y-3">
              {/* Mini Calendar Widget */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/30">
                  <h4 className="text-[11px] font-black text-slate-700">Lịch hôm nay</h4>
                </div>
                <div className="p-3">
                  <MiniCalendarWidget tasks={filteredTasks} onTaskClick={setViewingTask} />
                </div>
              </div>

              {/* Việc sắp đến hạn */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/30">
                  <h4 className="text-[11px] font-black text-slate-700">Việc sắp đến hạn</h4>
                  <button type="button" className="text-[10px] font-bold text-[#C21A1A] hover:underline cursor-pointer">Xem tất cả</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <UpcomingTasksList tasks={filteredTasks} onTaskClick={setViewingTask} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
              toastSuccess("Đã cập nhật công việc thành công!");
            } catch {
              toastError("Không thể cập nhật công việc. Vui lòng thử lại.");
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
            toastSuccess("Đã cập nhật danh sách người phụ giúp!");
          } catch {
            toastError("Không thể cập nhật người phụ giúp. Vui lòng thử lại.");
          }
        }}
        onUpdateSubtasks={onUpdateSubtasks ? async (taskId, subtasks) => {
          try {
            await onUpdateSubtasks(taskId, subtasks);
            const completed = subtasks.filter(s => s.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : undefined;
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, subtasks, progress } : null);
            }
          } catch {
            toastError("Không thể cập nhật checklist. Vui lòng thử lại.");
          }
        } : undefined}
        onUpdateStatus={async (taskId, status) => {
          try {
            await onUpdateTaskStatus(taskId, status);
            // Refresh viewing task in state to show new status
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, status } : null);
            }
            toastSuccess(`Cập nhật trạng thái sang: "${statusMeta[status].text}"`);
          } catch {
            toastError("Không thể cập nhật trạng thái. Vui lòng thử lại.");
          }
        }}
        onUpdateTaskFields={async (taskId, fields) => {
          try {
            await onUpdateTask(taskId, fields);
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, ...fields } : null);
            }
            toastSuccess("Đã cập nhật thông tin công việc!");
          } catch {
            toastError("Không thể cập nhật công việc. Vui lòng thử lại.");
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
              toastSuccess("Đã xóa công việc thành công!");
            } catch {
              toastError("Không thể xóa công việc. Vui lòng thử lại.");
            }
          }
        }}
        variant="confirm"
      />
    </div>
  );
}
