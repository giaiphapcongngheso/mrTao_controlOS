import React, { useEffect } from 'react';
import { Sparkles, Edit2, X } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  SOP_ISSUE_STATUSES,
  type SOPIssue,
  type SOPIssueCategory,
} from '../../../types/issues.types';
import {
  Button,
  Input,
  Textarea,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { INITIAL_STAFF_MEMBERS } from '../../../data';
import { useChecklistProcessCategoriesQuery } from '../../Checklist/_hook/use-checklist';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SOPIssue, 'id' | 'storeId' | 'date'>) => void;
  initialData?: SOPIssue;
  canCreate: boolean;
  canUpdate: boolean;
}

const CATEGORY_LABELS = {
  sop_error: 'Lỗi SOP',
  exception: 'Ngoại lệ',
  risk: 'Rủi ro',
  improvement: 'Cải tiến',
} as const;

const issueFormSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên lỗi / tên đề xuất cải tiến'),
  category: z.enum(['sop_error', 'exception', 'risk', 'improvement']),
  severity: z.enum(['High', 'Medium', 'Low']),
  status: z.enum(SOP_ISSUE_STATUSES),
  actor: z.string(),
  process: z.string(),
  occurrence: z.number().min(1, 'Số lần xảy ra phải ít nhất là 1'),
  assignee: z.string(),
  description: z.string().min(1, 'Vui lòng nhập mô tả thực tế phòng ngừa / đề xuất chi tiết'),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

interface OccurrenceInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: number;
  onValueChange: (value: number) => void;
}

const OccurrenceInput = React.memo(function OccurrenceInput({
  value,
  onValueChange,
  ...props
}: OccurrenceInputProps) {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(Number(event.target.value) || 1);
    },
    [onValueChange]
  );

  return (
    <Input
      type="number"
      min={1}
      value={value}
      onChange={handleChange}
      clearable={false}
      {...props}
    />
  );
});

interface IssueCategoryButtonProps {
  category: SOPIssueCategory;
  activeCategory: SOPIssueCategory;
  onSelectCategory: (category: SOPIssueCategory) => void;
}

const IssueCategoryButton = React.memo(function IssueCategoryButton({
  category,
  activeCategory,
  onSelectCategory,
}: IssueCategoryButtonProps) {
  const handleClick = React.useCallback(() => {
    onSelectCategory(category);
  }, [category, onSelectCategory]);

  const buttonColor = React.useMemo(() => {
    if (activeCategory !== category) {
      return 'border-slate-200 text-slate-600 hover:bg-slate-50';
    }
    if (category === 'sop_error') {
      return 'bg-[#C21A1A] border-[#C21A1A] text-white shadow-sm shadow-red-500/20';
    }
    if (category === 'exception') {
      return 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/20';
    }
    if (category === 'risk') {
      return 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-500/20';
    }
    return 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20';
  }, [activeCategory, category]);

  return (
    <button
      key={category}
      type="button"
      onClick={handleClick}
      className={`py-2 px-1 text-[11px] font-extrabold uppercase tracking-tighter text-center rounded-xl border cursor-pointer duration-100 transition-all ${buttonColor}`}
    >
      {CATEGORY_LABELS[category]}
    </button>
  );
});

const IssueModal = React.memo(function IssueModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canCreate,
  canUpdate,
}: IssueModalProps) {
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: '',
      category: 'sop_error',
      severity: 'Medium',
      status: 'Xử lý ngay',
      actor: '',
      process: '',
      occurrence: 1,
      assignee: '',
      description: '',
    },
  });

  const actor = form.watch('actor');
  const assignee = form.watch('assignee');
  const process = form.watch('process');
  const category = form.watch('category');

  // Fetch checklist categories (processes) using query hook
  const { data: categories = [] } = useChecklistProcessCategoriesQuery();

  // Generate staff options, including active value if it doesn't match default list
  const staffOptions = React.useMemo(() => {
    const baseOptions = INITIAL_STAFF_MEMBERS.map((staff) => ({
      label: `${staff.fullName} (${staff.role})`,
      value: staff.fullName,
    }));

    if (actor && !INITIAL_STAFF_MEMBERS.some((s) => s.fullName === actor)) {
      baseOptions.unshift({
        label: actor,
        value: actor,
      });
    }

    return baseOptions;
  }, [actor]);

  // Generate assignee options from staff list
  const assigneeOptions = React.useMemo(() => {
    const baseOptions = INITIAL_STAFF_MEMBERS.map((staff) => ({
      label: `${staff.fullName} (${staff.role})`,
      value: staff.fullName,
    }));

    if (assignee && !INITIAL_STAFF_MEMBERS.some((s) => s.fullName === assignee)) {
      baseOptions.unshift({
        label: assignee,
        value: assignee,
      });
    }

    return baseOptions;
  }, [assignee]);

  // Generate process options from checklist categories query
  const processOptions = React.useMemo(() => {
    const baseOptions = categories.map((cat) => ({
      label: cat.title,
      value: cat.title,
    }));

    if (process && !baseOptions.some((opt) => opt.value === process)) {
      baseOptions.unshift({
        label: process,
        value: process,
      });
    }

    return baseOptions;
  }, [categories, process]);

  // Initializing state based on initialData
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          title: initialData.title || '',
          category: initialData.category || 'sop_error',
          severity: initialData.severity || 'Medium',
          status: initialData.status || 'Xử lý ngay',
          actor: initialData.actor || '',
          process: initialData.process || '',
          occurrence: initialData.occurrence || 1,
          assignee: initialData.assignee || '',
          description: initialData.description || '',
        });
      } else {
        form.reset({
          title: '',
          category: 'sop_error',
          severity: 'Medium',
          status: 'Xử lý ngay',
          actor: '',
          process: '',
          occurrence: 1,
          assignee: '',
          description: '',
        });
      }
    }
  }, [initialData, isOpen, form]);

  const handleCategoryChange = React.useCallback((cat: SOPIssueCategory) => {
    form.setValue('category', cat);
    if (cat === 'sop_error') {
      form.setValue('status', 'Xử lý ngay');
    } else if (cat === 'exception') {
      form.setValue('status', 'Chờ duyệt');
    } else if (cat === 'risk') {
      form.setValue('status', 'Xử lý ngay');
    } else {
      form.setValue('status', 'Đang triển khai');
    }
  }, [form]);

  const onSubmitHandler = React.useCallback((values: IssueFormValues) => {
    onSubmit({
      title: values.title.trim(),
      severity: values.severity,
      status: values.status,
      category: values.category,
      actor: values.actor.trim() || 'Hệ thống ca trực',
      process: values.process.trim() || 'Vận hành chung',
      occurrence: Number(values.occurrence) || 1,
      assignee: values.assignee.trim() || 'Quản lý cửa hàng',
      description: values.description.trim(),
    });
  }, [onSubmit]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const isEdit = !!initialData;
  const canSubmit = isEdit ? canUpdate : canCreate;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-4 !border-0 !bg-transparent !shadow-none flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl p-0 w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200/80 relative overflow-hidden text-left">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white flex items-center justify-center text-xs font-black animate-pulse">
                {isEdit ? <Edit2 className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
              </span>
              <span>
                {isEdit ? 'Chỉnh sửa phiếu phát sinh' : 'Ghi Nhận Thực Tế Sự Cố / Cải Tiến mới'}
              </span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </DialogClose>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmitHandler)} className="flex-1 overflow-y-auto flex flex-col">
              <div className="px-5 py-4 space-y-4">

                {/* Category picker matching mockup buttons */}
                <div className="space-y-1.5">
                  <FormLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Phân loại theo Nhóm
                  </FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {(['sop_error', 'exception', 'risk', 'improvement'] as const).map((cat) => {
                      return (
                        <IssueCategoryButton
                          key={cat}
                          category={cat}
                          activeCategory={category}
                          onSelectCategory={handleCategoryChange}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Title input */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="grid gap-0">
                      <FormLabel isRequired className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Tên Lỗi / Tên Đề xuất cải tiến
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Ví dụ: Sai quy trình bàn giao máy"
                          {...field}
                          clearable={true}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grid with severity and occurrence */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem className="grid gap-0">
                        <FormLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                          Mức độ ưu tiên
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            clearable={false}
                            options={[
                              { label: 'Cao (Xử lý gấp)', value: 'High' },
                              { label: 'Trung bình', value: 'Medium' },
                              { label: 'Thấp', value: 'Low' },
                            ]}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="occurrence"
                    render={({ field: { value, onChange, ...rest } }) => (
                      <FormItem className="grid gap-0">
                        <FormLabel className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                          Số lần xảy ra
                        </FormLabel>
                        <FormControl>
                          <OccurrenceInput
                            value={value}
                            onValueChange={onChange}
                            {...rest}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Grid with related processes, actors and managers */}
                <div className="space-y-3 bg-slate-50/65 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-1.5 mb-3">
                    Thông tin vận hành chi tiết
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="actor"
                      render={({ field }) => (
                        <FormItem className="grid gap-0">
                          <FormLabel className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Người liên quan
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn nhân sự..."
                              clearable={true}
                              options={staffOptions}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-755 transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="process"
                      render={({ field }) => (
                        <FormItem className="grid gap-0">
                          <FormLabel className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Quy trình vận hành
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn quy trình..."
                              clearable={true}
                              options={processOptions}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-755 transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignee"
                      render={({ field }) => (
                        <FormItem className="grid gap-0">
                          <FormLabel className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Người xử lý
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn người xử lý..."
                              clearable={true}
                              options={assigneeOptions}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-755 transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Description field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="grid gap-0">
                      <FormLabel isRequired className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Mô tả thực tế phòng ngừa / Đề xuất chi tiết
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ví dụ: Khách hàng yêu cầu... Cần bổ sung quy trình hướng dẫn..."
                          {...field}
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 p-3 text-xs font-medium rounded-lg leading-relaxed text-slate-700 transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2.5 justify-end shrink-0 bg-slate-50/40 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={!canSubmit}
                  className="h-9 px-5 text-sm font-bold text-white bg-[#C21A1A] hover:bg-[#971212] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEdit ? 'Lưu cập nhật' : 'Ghi nhận vào hệ thống'}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default IssueModal;
