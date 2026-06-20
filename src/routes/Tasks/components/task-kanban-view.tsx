import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Circle, Play, Clock, CheckCircle2, GripVertical, AlertTriangle } from 'lucide-react';
import type { TaskItem, TaskStatus } from '../../../types/tasks.types';
import { cn } from '@shared/lib/utils';
import { getDeadlineUrgency, getUrgencyLabel, getUrgencyBadgeClass } from '../_hook/use-task-deadline';

interface TaskKanbanViewProps {
  tasks: TaskItem[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void | Promise<void>;
  onCardClick: (task: TaskItem) => void;
  isLoading?: boolean;
}

const COLUMNS: { id: TaskStatus; title: string; icon: React.ElementType; colorClass: string; headerBg: string }[] = [
  { id: 'not_started', title: 'Chưa làm', icon: Circle, colorClass: 'text-slate-500', headerBg: 'bg-slate-100 border-slate-200' },
  { id: 'in_progress', title: 'Đang làm', icon: Play, colorClass: 'text-blue-600', headerBg: 'bg-blue-50 border-blue-200' },
  { id: 'waiting', title: 'Chờ duyệt', icon: Clock, colorClass: 'text-amber-600', headerBg: 'bg-amber-50 border-amber-200' },
  { id: 'completed', title: 'Hoàn thành', icon: CheckCircle2, colorClass: 'text-emerald-600', headerBg: 'bg-emerald-50 border-emerald-200' },
];

const priorityDotColor: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-400',
};

// Droppable column wrapper
const KanbanColumn = React.memo(function KanbanColumn({
  columnId,
  title,
  icon: Icon,
  colorClass,
  headerBg,
  children,
  count,
}: {
  columnId: string;
  title: string;
  icon: React.ElementType;
  colorClass: string;
  headerBg: string;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-white/80 backdrop-blur-sm min-h-[400px] transition-all duration-200',
        isOver ? 'ring-2 ring-blue-400 bg-blue-50/30 border-blue-300 scale-[1.01]' : 'border-slate-200',
      )}
    >
      {/* Column header */}
      <div className={cn('px-3.5 py-2.5 rounded-t-xl border-b flex items-center justify-between shrink-0', headerBg)}>
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', colorClass)} />
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">{title}</span>
        </div>
        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
          {count}
        </span>
      </div>

      {/* Cards area */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {children}
      </div>
    </div>
  );
});

// Sortable card
const SortableKanbanCard = React.memo(function SortableKanbanCard({
  task,
  onCardClick,
}: {
  task: TaskItem;
  onCardClick: (task: TaskItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task, status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const urgency = getDeadlineUrgency(task);
  const urgencyLabel = getUrgencyLabel(urgency);
  const urgencyClass = getUrgencyBadgeClass(urgency);
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskCompleted = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const progress = task.progress ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onCardClick(task)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 break-words">
            {task.title}
          </h4>

          {/* Department tag */}
          {task.department && (
            <span className="inline-block mt-1.5 text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              {task.department}
            </span>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityDotColor[task.priority] || 'bg-amber-500')} />
            <span className="text-[10px] text-slate-400 font-semibold">{task.deadline}</span>
            {urgencyLabel && (
              <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded border', urgencyClass)}>
                {urgency === 'overdue' && <AlertTriangle className="w-2 h-2" />}
                {urgencyLabel}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {subtaskCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 font-bold shrink-0">
                {subtaskCompleted}/{subtaskCount}
              </span>
            </div>
          )}

          {/* Assignee */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-6 h-6 rounded-full bg-red-50 text-[9px] flex items-center justify-center font-bold text-[#C21A1A] border border-[#C21A1A]/15 uppercase shrink-0">
              {task.assignee?.charAt(0) || 'U'}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold truncate">
              {task.assignee || 'Chưa phân công'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Drag overlay card (what you see while dragging)
const DragOverlayCard = React.memo(function DragOverlayCard({ task }: { task: TaskItem }) {
  return (
    <div className="bg-white rounded-lg border-2 border-blue-400 p-3 shadow-xl w-[280px] rotate-2">
      <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{task.title}</h4>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-[9px] flex items-center justify-center font-bold text-blue-600 border border-blue-200 uppercase">
          {task.assignee?.charAt(0) || 'U'}
        </div>
        <span className="text-[10px] text-slate-500 font-semibold truncate">{task.assignee}</span>
      </div>
    </div>
  );
});

export const TaskKanbanView = React.memo(function TaskKanbanView({
  tasks,
  onUpdateStatus,
  onCardClick,
}: TaskKanbanViewProps) {
  const [activeTask, setActiveTask] = React.useState<TaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Group tasks by status
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      not_started: [],
      in_progress: [],
      waiting: [],
      completed: [],
    };
    for (const task of tasks) {
      (map[task.status] || map.not_started).push(task);
    }
    return map;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Determine target column
      let targetStatus: TaskStatus | null = null;

      // Check if dropped on a column directly
      const isColumn = COLUMNS.some((c) => c.id === over.id);
      if (isColumn) {
        targetStatus = over.id as TaskStatus;
      } else {
        // Dropped on another card — find its column
        const overTask = tasks.find((t) => t.id === over.id);
        if (overTask) {
          targetStatus = overTask.status;
        }
      }

      if (targetStatus && targetStatus !== task.status) {
        void onUpdateStatus(taskId, targetStatus);
      }
    },
    [tasks, onUpdateStatus],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const columnTasks = grouped[col.id];
          return (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              icon={col.icon}
              colorClass={col.colorClass}
              headerBg={col.headerBg}
              count={columnTasks.length}
            >
              <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-[10px] text-slate-300 font-bold uppercase">
                    Kéo thả task vào đây
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <SortableKanbanCard key={task.id} task={task} onCardClick={onCardClick} />
                  ))
                )}
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
});
