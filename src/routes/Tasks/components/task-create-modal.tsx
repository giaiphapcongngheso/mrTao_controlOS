import React, { useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@shared/ui';
import type { TaskRequestType } from '../../../types/tasks.types';
import {
  DEFAULT_TASK_FORM_VALUES,
  taskFormSchema,
  taskFormToRequest,
  type TaskFormValues,
} from '../_hook/use-task-form';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: TaskRequestType) => void | Promise<void>;
}

export const TaskCreateModal = React.memo(function TaskCreateModal({
  isOpen,
  onClose,
  onSubmit,
}: TaskCreateModalProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: DEFAULT_TASK_FORM_VALUES,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(DEFAULT_TASK_FORM_VALUES);
    }
  }, [isOpen, form]);

  const handleSubmit = useCallback(async (values: TaskFormValues) => {
    await onSubmit(taskFormToRequest(values));
  }, [onSubmit]);

  if (!isOpen) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left border border-slate-100">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#C21A1A] stroke-[2.5]" />
            Tạo công việc mới chi tiết
          </h3>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-750 text-lg cursor-pointer h-auto p-0 hover:bg-transparent"
          >
            x
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                    Tên phần việc / Nhiệm vụ
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      clearable={false}
                      placeholder="Ví dụ: Kiểm tra hàng iPhone 11 tồn kho"
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 text-xs font-semibold rounded-lg"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                      Phòng ban
                    </FormLabel>
                    <FormControl>
                      <CustomSelect
                        options={[
                          { value: 'Kho', label: 'Kho hàng' },
                          { value: 'Marketing', label: 'Marketing (MKT)' },
                          { value: 'Kỹ thuật', label: 'Kỹ thuật (KT)' },
                          { value: 'Vận hành', label: 'Vận hành (VH)' },
                        ]}
                        value={field.value}
                        onChangeValue={field.onChange}
                        clearable={false}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10"
                        containerClassName="w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                      Mức ưu tiên
                    </FormLabel>
                    <FormControl>
                      <CustomSelect
                        options={[
                          { value: 'high', label: 'Cao' },
                          { value: 'medium', label: 'Trung bình' },
                          { value: 'low', label: 'Thấp' },
                        ]}
                        value={field.value}
                        onChangeValue={field.onChange}
                        clearable={false}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10"
                        containerClassName="w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                      Hạn chót
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        clearable={false}
                        placeholder="Today hoặc 08/04/2026"
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-semibold rounded-lg"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                      Người phụ trách
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        clearable={false}
                        placeholder="Họ tên nhân sự"
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-semibold rounded-lg"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                    Ghi chú hướng dẫn
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Ghi rõ thông điệp, quy trình tránh nhầm lẫn..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs font-medium rounded-lg"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer animate-none h-auto"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer h-auto disabled:cursor-wait disabled:opacity-70"
              >
                Giao việc
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
});
