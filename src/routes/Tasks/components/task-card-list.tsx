import React, { useCallback, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Play,
  Clock,
  Pencil,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { TaskItem, TaskStatus } from '../../../types/tasks.types';
import { cn } from '@shared/lib/utils';
import { getDeadlineUrgency, getUrgencyLabel, getUrgencyBadgeClass } from '../_hook/use-task-deadline';

interface TaskCardListProps {
  tasks: TaskItem[];
  onCardClick: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
}

const statusMeta: Record<TaskStatus, { text: string; icon: React.ElementType; iconColor: string; dotColor: string }> = {
  not_started: { text: 'Chưa làm', icon: Circle, iconColor: 'text-slate-400', dotColor: 'bg-slate-400' },
  in_progress: { text: 'Đang làm', icon: Play, iconColor: 'text-blue-500', dotColor: 'bg-blue-500' },
  waiting: { text: 'Chờ duyệt', icon: Clock, iconColor: 'text-amber-500', dotColor: 'bg-amber-500' },
  completed: { text: 'Hoàn thành', icon: CheckCircle2, iconColor: 'text-emerald-600', dotColor: 'bg-emerald-500' },
};

const priorityMeta: Record<string, { text: string; dotColor: string }> = {
  high: { text: 'Cao', dotColor: 'bg-rose-500' },
  medium: { text: 'Trung bình', dotColor: 'bg-amber-500' },
  low: { text: 'Thấp', dotColor: 'bg-blue-400' },
};

// Individual card with swipe support
const TaskCard = React.memo(function TaskCard({
  task,
  onCardClick,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  onCardClick: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // If horizontal movement > vertical, consider it a swipe
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwipingRef.current = true;
      // Only allow left swipe (negative), clamped
      const clampedX = Math.max(-120, Math.min(0, dx));
      setSwipeX(clampedX);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeX < -60) {
      // Snap to reveal actions
      setSwipeX(-120);
    } else {
      setSwipeX(0);
    }
    touchStartRef.current = null;
  }, [swipeX]);

  const handleCardClick = useCallback(() => {
    if (isSwipingRef.current) return;
    if (swipeX !== 0) {
      setSwipeX(0);
      return;
    }
    onCardClick(task);
  }, [task, onCardClick, swipeX]);

  const status = statusMeta[task.status] || statusMeta.not_started;
  const priority = priorityMeta[task.priority] || priorityMeta.medium;
  const urgency = getDeadlineUrgency(task);
  const urgencyLabel = getUrgencyLabel(urgency);
  const urgencyClass = getUrgencyBadgeClass(urgency);

  const progress = task.progress;
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskCompleted = task.subtasks?.filter((s) => s.completed).length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-xl w-full">
      {/* Swipe action buttons (behind the card) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {onEdit && (
          <button
            type="button"
            onClick={() => { onEdit(task); setSwipeX(0); }}
            className="w-[60px] bg-blue-500 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold"
          >
            <Pencil className="w-4 h-4" />
            Sửa
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => { onDelete(task); setSwipeX(0); }}
            className="w-[60px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold"
          >
            <Trash2 className="w-4 h-4" />
            Xóa
          </button>
        )}
      </div>

      {/* Card content (slides left on swipe) */}
      <div
        className="relative w-full bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs active:bg-slate-50 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex items-start gap-3">
          {/* Avatar (mockup: red brand color) */}
          <div className="w-9 h-9 rounded-full bg-red-50 text-xs flex items-center justify-center font-bold text-[#C21A1A] border border-[#C21A1A]/20 uppercase shrink-0 mt-0.5">
            {task.assignee?.charAt(0) || 'U'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 break-words">
                {task.title}
              </h4>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
            </div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {task.assignee} {task.department ? `• ${task.department}` : ''}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Priority dot */}
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priority.dotColor)} />

              {/* Status badge */}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                <status.icon className={cn('w-2.5 h-2.5', status.iconColor)} />
                {status.text}
              </span>

              {/* Urgency badge */}
              {urgencyLabel && (
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
                  urgencyClass,
                )}>
                  {urgency === 'overdue' && <AlertTriangle className="w-2.5 h-2.5" />}
                  {urgencyLabel}
                </span>
              )}

              {/* Deadline */}
              <span className="text-[10px] text-slate-400 font-semibold">
                {task.deadline}
              </span>
            </div>

            {/* Progress bar (if subtasks exist) */}
            {subtaskCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress ?? 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                  {subtaskCompleted}/{subtaskCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const TaskCardList = React.memo(function TaskCardList({
  tasks,
  onCardClick,
  onEdit,
  onDelete,
}: TaskCardListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Circle className="w-5 h-5 text-slate-300" />
        </div>
        <p className="text-sm text-slate-400 font-semibold">
          Không tìm thấy nhiệm vụ nào
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Vui lòng rà soát bộ lọc hoặc tạo việc mới
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onCardClick={onCardClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});
