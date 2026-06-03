import React, { useCallback, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
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
  Label,
} from '@shared/ui';
import type { TaskItem, TaskRequestType } from '../../../types/tasks.types';
import type { StaffMember } from '../../../types/staff.types';
import { getRoleFriendlyName } from '../../../constants';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import {
  DEFAULT_QUICK_DELEGATE_FORM_VALUES,
  quickDelegateFormToRequest,
  taskQuickDelegateFormSchema,
  type TaskQuickDelegateFormValues,
} from '../_hook/use-task-form';

interface TaskQuickDelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: TaskRequestType) => void | Promise<void>;
  staffMembers?: StaffMember[];
  tasks?: TaskItem[];
}

export const TaskQuickDelegateModal = React.memo(function TaskQuickDelegateModal({
  isOpen,
  onClose,
  onSubmit,
  staffMembers = [],
  tasks = [],
}: TaskQuickDelegateModalProps) {
  const form = useForm<TaskQuickDelegateFormValues>({
    resolver: zodResolver(taskQuickDelegateFormSchema),
    defaultValues: DEFAULT_QUICK_DELEGATE_FORM_VALUES,
  });

  const taskOptions = useMemo(() => {
    const titles = new Set<string>();
    (tasks || []).forEach((task) => {
      if (task.title) {
        titles.add(task.title.trim());
      }
    });
    return Array.from(titles).map((title) => ({
      value: title,
      label: title,
    }));
  }, [tasks]);

  const selectedAssignee = useWatch({
    control: form.control,
    name: 'assignee',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(DEFAULT_QUICK_DELEGATE_FORM_VALUES);
    }
  }, [isOpen, form]);

  const handleSubmit = useCallback(async (values: TaskQuickDelegateFormValues) => {
    await onSubmit(quickDelegateFormToRequest(values));
  }, [onSubmit]);

  const handleSelectCandidate = useCallback((staff: StaffMember) => {
    form.setValue('assignee', staff.fullName, { shouldValidate: true, shouldDirty: true });
    form.setValue('department', staff.department || 'Kho', { shouldValidate: true, shouldDirty: true });
  }, [form]);

  if (!isOpen) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-left border border-slate-100">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-150">
          <h3 className="text-xs font-black text-[#C21A1A] uppercase tracking-wider flex items-center gap-2">
            <Send className="w-3.5 h-3.5" />
            Giao việc siêu tốc ca làm việc
          </h3>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-750 text-lg cursor-pointer h-auto p-0 hover:bg-transparent"
          >
            x
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
          Giao khẩn phần việc đột xuất cho ca trực. Chỉ cần mô tả ngắn và chọn nhân sự chốt nhanh.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                    Tên phần việc khẩn cấp
                  </FormLabel>
                  <FormControl>
                    <CustomSelect
                      options={taskOptions}
                      value={field.value}
                      onChangeValue={field.onChange}
                      placeholder="Chọn công việc cần giao nhanh"
                      clearable={false}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10"
                      containerClassName="w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <Label className="block text-[10px] font-black text-slate-400 uppercase">
                Chọn người nhận nhanh
              </Label>
              <div className="grid grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pr-1">
                {staffMembers.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-slate-400 text-xs font-semibold">
                    Không có nhân sự nào trong ca trực
                  </div>
                ) : (
                  staffMembers.map((staff) => (
                    <Button
                      key={staff.id}
                      type="button"
                      variant="ghost"
                      onClick={() => handleSelectCandidate(staff)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between items-start h-auto font-normal hover:bg-transparent ${
                        selectedAssignee === staff.fullName
                          ? 'border-[#C21A1A] bg-[#C21A1A]/5 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <h4 className="font-extrabold text-slate-800 text-xs">{staff.fullName}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{staff.position || getRoleFriendlyName(staff.role)}</p>
                    </Button>
                  ))
                )}
              </div>
            </div>

            <Input type="hidden" containerClassName="hidden" {...form.register('assignee')} />
            <Input type="hidden" containerClassName="hidden" {...form.register('department')} />

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer h-auto"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer h-auto disabled:cursor-wait disabled:opacity-70"
              >
                <Send className="w-3.5 h-3.5" />
                Giao nhanh
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
});
