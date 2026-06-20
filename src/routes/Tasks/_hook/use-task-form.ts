import { z } from 'zod';
import { format } from 'date-fns';
import type { TaskRequestType, SubTask } from '../../../types/tasks.types';

const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  completed: z.boolean(),
  completedBy: z.string().optional(),
  completedAt: z.string().optional(),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên công việc'),
  department: z.string().trim().min(1, 'Vui lòng chọn vai trò'),
  priority: z.enum(['high', 'medium', 'low']),
  deadline: z.date({
    message: 'Vui lòng chọn hạn chót ca trực',
  }),
  assignee: z.string().trim().min(1, 'Vui lòng chọn người phụ trách'),
  notes: z.string().optional(),
  startDate: z.date().optional(),
  helpers: z.array(z.string()).optional(),
  link: z.string().trim().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskQuickDelegateFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên công việc'),
  assignee: z.string().trim().min(1, 'Vui lòng chọn người nhận'),
  department: z.string().trim().min(1, 'Vui lòng chọn vai trò'),
});

export type TaskQuickDelegateFormValues = z.infer<typeof taskQuickDelegateFormSchema>;

export const DEFAULT_TASK_FORM_VALUES: TaskFormValues = {
  title: '',
  department: '',
  priority: 'medium',
  deadline: new Date(),
  assignee: '',
  notes: '',
  startDate: undefined,
  helpers: [],
  link: '',
  subtasks: [],
};

export const DEFAULT_QUICK_DELEGATE_FORM_VALUES: TaskQuickDelegateFormValues = {
  title: '',
  assignee: 'Lê Văn C',
  department: 'Kho',
};

/**
 * Calculate progress from subtasks array.
 */
function calculateProgressFromSubtasks(subtasks?: SubTask[]): number | undefined {
  if (!subtasks || subtasks.length === 0) return undefined;
  const completed = subtasks.filter((s) => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

export function taskFormToRequest(values: TaskFormValues): TaskRequestType {
  const subtasks = values.subtasks?.filter((s) => s.title.trim().length > 0);
  return {
    title: values.title.trim(),
    department: values.department,
    priority: values.priority,
    status: 'not_started',
    deadline: format(values.deadline, 'dd/MM/yyyy'),
    assignee: values.assignee.trim(),
    notes: values.notes?.trim() ?? '',
    startDate: values.startDate ? format(values.startDate, 'dd/MM/yyyy') : undefined,
    helpers: values.helpers,
    link: values.link,
    subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
    progress: calculateProgressFromSubtasks(subtasks),
  };
}

export function quickDelegateFormToRequest(values: TaskQuickDelegateFormValues): TaskRequestType {
  return {
    title: values.title.trim(),
    department: values.department,
    priority: 'high',
    status: 'in_progress',
    deadline: 'Today',
    assignee: values.assignee,
    notes: 'Giao nhanh từ thanh Thao tác nhanh thời gian thực.',
  };
}
