import { z } from 'zod';
import { format } from 'date-fns';
import type { TaskRequestType } from '../../../types/tasks.types';

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
};

export const DEFAULT_QUICK_DELEGATE_FORM_VALUES: TaskQuickDelegateFormValues = {
  title: '',
  assignee: 'Lê Văn C',
  department: 'Kho',
};

export function taskFormToRequest(values: TaskFormValues): TaskRequestType {
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
