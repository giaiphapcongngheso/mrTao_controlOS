import { z } from 'zod';
import type { TaskRequestType } from '../../../types/tasks.types';

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên công việc'),
  department: z.string().trim().min(1, 'Vui lòng chọn phòng ban'),
  priority: z.enum(['high', 'medium', 'low']),
  deadline: z.string().trim().min(1, 'Vui lòng nhập hạn chót'),
  assignee: z.string().trim().min(1, 'Vui lòng nhập người phụ trách'),
  notes: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskQuickDelegateFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên công việc'),
  assignee: z.string().trim().min(1, 'Vui lòng chọn người nhận'),
  department: z.string().trim().min(1, 'Vui lòng chọn phòng ban'),
});

export type TaskQuickDelegateFormValues = z.infer<typeof taskQuickDelegateFormSchema>;

export const DEFAULT_TASK_FORM_VALUES: TaskFormValues = {
  title: '',
  department: 'Kho',
  priority: 'medium',
  deadline: 'Today',
  assignee: 'Lê Văn C',
  notes: '',
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
    deadline: values.deadline.trim(),
    assignee: values.assignee.trim(),
    notes: values.notes?.trim() ?? '',
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
