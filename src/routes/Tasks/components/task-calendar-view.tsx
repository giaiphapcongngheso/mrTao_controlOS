import React, { useCallback, useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Circle, Play, Clock, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import type { TaskItem, TaskStatus } from '../../../types/tasks.types';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/ui';
import { parseTaskDeadline, isTaskOverdue, getDeadlineUrgency } from '../_hook/use-task-deadline';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';

interface TaskCalendarViewProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
}

// Status config following the mockup design system
const statusConfig: Record<TaskStatus, { dot: string; pill: string; pillText: string; label: string }> = {
  in_progress: { dot: 'bg-blue-500', pill: 'bg-blue-50 border-blue-100', pillText: 'text-blue-700', label: 'Đang thực hiện' },
  waiting: { dot: 'bg-amber-500', pill: 'bg-amber-50 border-amber-100', pillText: 'text-amber-700', label: 'Chờ duyệt' },
  completed: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-100', pillText: 'text-emerald-700', label: 'Hoàn thành' },
  not_started: { dot: 'bg-slate-400', pill: 'bg-slate-50 border-slate-200', pillText: 'text-slate-600', label: 'Chưa khởi động' },
};

const priorityConfig: Record<string, { dot: string; text: string }> = {
  high: { dot: 'bg-rose-500', text: 'Cao' },
  medium: { dot: 'bg-amber-500', text: 'Trung bình' },
  low: { dot: 'bg-blue-400', text: 'Thấp' },
};

const WEEKDAY_LABELS_DESKTOP = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_LABELS_MOBILE = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Task pill inside calendar cell (mockup style: colored rounded tag with title)
const TaskPill = React.memo(function TaskPill({
  task,
  onClick,
}: {
  task: TaskItem;
  onClick: (task: TaskItem) => void;
}) {
  const isOverdue = isTaskOverdue(task);
  const config = isOverdue
    ? { pill: 'bg-rose-50 border-rose-100', pillText: 'text-rose-700', dot: 'bg-rose-500' }
    : statusConfig[task.status];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      className={cn(
        'w-full text-left px-1.5 py-0.5 rounded text-[9px] font-semibold truncate border transition-all hover:shadow-sm cursor-pointer leading-tight',
        config.pill,
        config.pillText,
      )}
      title={task.title}
    >
      <span className={cn('inline-block w-1 h-1 rounded-full mr-1 align-middle', config.dot)} />
      {task.title}
    </button>
  );
});

// Today's task item in sidebar
const TodayTaskItem = React.memo(function TodayTaskItem({
  task,
  onClick,
}: {
  task: TaskItem;
  onClick: (task: TaskItem) => void;
}) {
  const isOverdue = isTaskOverdue(task);
  const statusCfg = statusConfig[task.status];
  const priCfg = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      className="w-full text-left flex items-start gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer min-h-[52px] group"
    >
      {/* Time column */}
      <div className="w-12 shrink-0 text-[11px] font-bold text-slate-400 pt-0.5">
        {task.deadline?.includes(' ') ? task.deadline.split(' ')[1]?.substring(0, 5) : '—'}
      </div>

      {/* Vertical line + dot */}
      <div className="flex flex-col items-center shrink-0 pt-1.5">
        <span className={cn('w-2 h-2 rounded-full shrink-0', isOverdue ? 'bg-rose-500' : statusCfg.dot)} />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-[#C21A1A] transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 font-medium">{task.assignee}</span>
          {isOverdue && (
            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Quá hạn
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priCfg.dot)} />
          <span className="text-[9px] text-slate-400 font-semibold">{priCfg.text}</span>
          <span className={cn(
            'text-[8px] font-bold px-1.5 py-0.5 rounded-full border',
            statusCfg.pill, statusCfg.pillText,
          )}>
            {statusCfg.label}
          </span>
        </div>
      </div>
    </button>
  );
});

// Upcoming deadline item
const UpcomingItem = React.memo(function UpcomingItem({
  task,
  onClick,
}: {
  task: TaskItem;
  onClick: (task: TaskItem) => void;
}) {
  const isOverdue = isTaskOverdue(task);
  const priCfg = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      className="w-full text-left flex items-start gap-2.5 py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', isOverdue ? 'bg-rose-500' : priCfg.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-700 line-clamp-1">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 font-medium">{task.deadline}</span>
          <span className="text-[10px] text-slate-400 font-medium">{task.assignee}</span>
        </div>
      </div>
    </button>
  );
});

export const TaskCalendarView = React.memo(function TaskCalendarView({
  tasks,
  onTaskClick,
}: TaskCalendarViewProps) {
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Map tasks by date
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

  // Calendar grid (start on Monday)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Today's tasks
  const todayTasks = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return tasksByDate.get(todayKey) || [];
  }, [tasksByDate]);

  // Upcoming tasks (next 7 days, not completed)
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => {
        if (t.status === 'completed') return false;
        const d = parseTaskDeadline(t.deadline);
        if (!d) return false;
        const diff = d.getTime() - now.getTime();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        const da = parseTaskDeadline(a.deadline)?.getTime() ?? 0;
        const db = parseTaskDeadline(b.deadline)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 6);
  }, [tasks]);

  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate((prev) => (prev && isSameDay(prev, day) ? null : day));
  }, []);

  // Tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
  }, [selectedDate, tasksByDate]);

  return (
    <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'flex-row')}>
      {/* Left: Main Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Month navigation (mockup style) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToPrevMonth}
              className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </Button>
            <h3 className="text-sm font-black text-slate-800 min-w-[140px] text-center capitalize">
              Tháng {format(currentMonth, 'M, yyyy')}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Button>
          </div>

          {/* View mode toggle (mockup: Tháng/Tuần/Ngày) */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {(['Tháng', 'Tuần', 'Ngày'] as const).map((mode, i) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  'px-3.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
                  i === 0
                    ? 'bg-[#C21A1A] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Weekday headers (mockup style) */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {WEEKDAY_LABELS_DESKTOP.map((label) => (
            <div key={label} className="py-2.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {label}
            </div>
          ))}
        </div>

        {/* Day cells (mockup: show task pills, not dots) */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDay = isToday(day);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative border-b border-r border-slate-100 p-1.5 text-left transition-colors cursor-pointer group',
                  isMobile ? 'min-h-[64px]' : 'min-h-[100px]',
                  !isCurrentMonth && 'bg-slate-50/40',
                  isSelected && 'bg-blue-50/80 ring-1 ring-inset ring-blue-300',
                  !isSelected && isCurrentMonth && 'hover:bg-slate-50/80',
                )}
              >
                {/* Day number (mockup: red circle for today) */}
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mb-0.5',
                    isTodayDay && 'bg-[#C21A1A] text-white font-black',
                    !isTodayDay && isCurrentMonth && 'text-slate-700',
                    !isTodayDay && !isCurrentMonth && 'text-slate-300',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Task pills (mockup shows colored text pills) */}
                {!isMobile && dayTasks.length > 0 && (
                  <div className="space-y-0.5 mt-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <TaskPill key={task.id} task={task} onClick={onTaskClick} />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] font-bold text-slate-400 pl-1">
                        +{dayTasks.length - 3} việc khác
                      </span>
                    )}
                  </div>
                )}

                {/* Mobile: dots only */}
                {isMobile && dayTasks.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                    {dayTasks.slice(0, 4).map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <span
                          key={task.id}
                          className={cn('w-1.5 h-1.5 rounded-full', overdue ? 'bg-rose-500' : statusConfig[task.status].dot)}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom legend (mockup style) */}
        <div className="flex items-center justify-center gap-6 py-3 border-t border-slate-100 bg-slate-50/30">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
              <span className="text-[10px] text-slate-500 font-semibold">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] text-slate-500 font-semibold">Quá hạn</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar (mockup: Việc hôm nay + Sắp đến hạn + Ghi chú) */}
      <div className={cn('shrink-0 space-y-3', isMobile ? 'w-full' : 'w-[300px]')}>
        {/* Selected date panel (when clicked) */}
        {selectedDate && selectedDateTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Ngày {format(selectedDate, 'dd/MM/yyyy')} ({selectedDateTasks.length})
              </h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
              {selectedDateTasks.map((task) => (
                <UpcomingItem key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          </div>
        )}

        {/* Việc hôm nay - Today's tasks (mockup section 6) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              Việc hôm nay
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C21A1A] text-white text-[9px] font-black">
                {todayTasks.length}
              </span>
            </h4>
            <button type="button" className="text-[10px] font-bold text-[#C21A1A] hover:underline cursor-pointer">
              Xem tất cả
            </button>
          </div>
          <div className="max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {todayTasks.length === 0 ? (
              <p className="text-xs text-slate-300 italic text-center py-6 font-medium">
                Không có việc hôm nay
              </p>
            ) : (
              todayTasks.map((task) => (
                <TodayTaskItem key={task.id} task={task} onClick={onTaskClick} />
              ))
            )}
          </div>
        </div>

        {/* Sắp đến hạn (mockup section) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-[11px] font-black text-slate-700">Sắp đến hạn</h4>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black border border-amber-200">
              {upcomingTasks.length}
            </span>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-slate-300 italic text-center py-6 font-medium">
                Không có việc sắp đến hạn
              </p>
            ) : (
              upcomingTasks.map((task) => (
                <UpcomingItem key={task.id} task={task} onClick={onTaskClick} />
              ))
            )}
          </div>
        </div>

        {/* Ghi chú nhanh (mockup bottom section) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-[11px] font-black text-slate-700">Ghi chú nhanh</h4>
            <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3">
            <textarea
              placeholder="Viết ghi chú nhanh cho hôm nay..."
              className="w-full text-xs text-slate-600 font-medium bg-transparent border-none outline-none resize-none min-h-[60px] placeholder:text-slate-300"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
