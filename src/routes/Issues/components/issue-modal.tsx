import React, { useEffect } from 'react';
import {
  Sparkles,
  Edit2,
  X,
  Plus,
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Building,
  AlertOctagon,
  Check,
} from 'lucide-react';
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

  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editorInitialized, setEditorInitialized] = React.useState(false);

  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setValue('description', editorRef.current.innerHTML, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const descriptionValue = form.watch('description') || '';

  useEffect(() => {
    if (isOpen) {
      if (!editorInitialized && editorRef.current) {
        editorRef.current.innerHTML = descriptionValue || '';
        setEditorInitialized(true);
      }
    } else {
      setEditorInitialized(false);
    }
  }, [isOpen, editorInitialized, descriptionValue]);

  // Image compressor & insertion
  const compressAndInsertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 800;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          
          if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(
              'insertHTML', 
              false, 
              `<img src="${compressedBase64}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh sự cố" />`
            );
            handleEditorInput();
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      compressAndInsertImage(files[0]);
    }
  };

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
      setEditorInitialized(false);
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
        className="p-0 border-none bg-transparent shadow-none sm:max-w-5xl w-full max-h-[95vh] flex flex-col focus:outline-none"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-0 w-full shadow-2xl flex flex-col border border-slate-200/80 dark:border-slate-800 relative overflow-hidden text-left animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/40">
            <DialogTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C21A1A] to-[#971212] text-white flex items-center justify-center text-xs font-black shadow-xs">
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
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </DialogClose>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmitHandler)} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="px-6 py-5 space-y-5 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                
                {/* Section 1: Campaign Basic Info Style for Issues */}
                <div className="p-4.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-3xs transition-all">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/40 uppercase tracking-wider">
                    <AlertOctagon className="h-4 w-4 text-[#C21A1A]" />
                    Thông tin sự cố / Đề xuất
                  </h3>

                  {/* Category picker matching mockup buttons */}
                  <div className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                      <FormItem className="grid gap-1">
                        <FormLabel isRequired className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Tên Lỗi / Tên Đề xuất cải tiến
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Ví dụ: Sai quy trình bàn giao máy"
                            {...field}
                            clearable={true}
                            className="w-full bg-background border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 focus-visible:ring-1 focus-visible:ring-primary/30 px-3.5 py-2.5 text-xs font-medium rounded-lg h-9.5 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Grid with severity and occurrence */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 rounded-lg text-xs h-9 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="occurrence"
                      render={({ field: { value, onChange, ...rest } }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Số lần xảy ra
                          </FormLabel>
                          <FormControl>
                            <OccurrenceInput
                              value={value}
                              onValueChange={onChange}
                              {...rest}
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs rounded-lg h-9 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Operational details bento box */}
                <div className="p-4.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-3xs transition-all">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/40 uppercase tracking-wider">
                    <Building className="h-4 w-4 text-[#C21A1A]" />
                    Chi tiết vận hành
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="actor"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Người liên quan
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn nhân sự..."
                              clearable={true}
                              options={staffOptions}
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 text-xs rounded-lg h-9 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="process"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Quy trình vận hành
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn quy trình..."
                              clearable={true}
                              options={processOptions}
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 text-xs rounded-lg h-9 transition-all"
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
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Người xử lý
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              placeholder="Chọn người xử lý..."
                              clearable={true}
                              options={assigneeOptions}
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 text-xs rounded-lg h-9 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 3: Rich Text Editor for Detailed description */}
                <div className="p-4.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-3xs transition-all">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-200/40 dark:border-slate-800/40 uppercase tracking-wider">
                    📝 Mô tả chi tiết & Đề xuất
                  </h3>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel isRequired className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Mô tả thực tế phòng ngừa / Đề xuất chi tiết (Được phép chèn định dạng & ảnh)
                        </FormLabel>
                        <FormControl>
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-[#C21A1A] focus-within:border-[#C21A1A] transition-all">
                            {/* Format Toolbar */}
                            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 select-none">
                              <button
                                type="button"
                                onClick={() => document.execCommand('bold', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="In đậm"
                              >
                                <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('italic', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="In nghiêng"
                              >
                                <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('underline', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Gạch dưới"
                              >
                                <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

                              <button
                                type="button"
                                onClick={() => document.execCommand('formatBlock', false, '<h3>')}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Tiêu đề H3"
                              >
                                <Heading className="w-3 h-3 stroke-[2.5]" />
                                <span>H3</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('formatBlock', false, '<h4>')}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Tiêu đề H4"
                              >
                                <Heading className="w-3 h-3 stroke-[2.5]" />
                                <span>H4</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('formatBlock', false, '<p>')}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[10px] font-black transition-colors cursor-pointer"
                                title="Văn bản thường"
                              >
                                P
                              </button>

                              <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

                              <button
                                type="button"
                                onClick={() => document.execCommand('insertUnorderedList', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Danh sách dấu tròn"
                              >
                                <List className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('insertOrderedList', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Danh sách số"
                              >
                                <ListOrdered className="w-3.5 h-3.5" />
                              </button>

                              <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

                              <button
                                type="button"
                                onClick={() => document.execCommand('justifyLeft', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Căn lề trái"
                              >
                                <AlignLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('justifyCenter', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Căn lề giữa"
                              >
                                <AlignCenter className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('justifyRight', false)}
                                className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded transition-colors cursor-pointer"
                                title="Căn lề phải"
                              >
                                <AlignRight className="w-3.5 h-3.5" />
                              </button>

                              <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

                              <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#C21A1A] hover:border-[#C21A1A]/40 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                                title="Tải ảnh từ máy"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Ảnh</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt("Nhập URL của ảnh:");
                                  if (url) {
                                    if (editorRef.current) editorRef.current.focus();
                                    document.execCommand('insertHTML', false, `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 dark:border-slate-800 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh" />`);
                                    handleEditorInput();
                                  }
                                }}
                                className="p-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                                title="Dán link ảnh"
                              >
                                <span>Link Ảnh</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt("Nhập URL liên kết:", "https://");
                                  if (url) {
                                    document.execCommand('createLink', false, url);
                                  }
                                }}
                                className="p-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-700 hover:border-purple-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                                title="Chèn liên kết"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span>Link</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => document.execCommand('removeFormat', false)}
                                className="p-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 hover:border-amber-200 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                title="Xóa định dạng"
                              >
                                Xóa Format
                              </button>
                            </div>

                            {/* ContentEditable Window */}
                            <div
                              ref={editorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={handleEditorInput}
                              onBlur={handleEditorInput}
                              className="min-h-[300px] max-h-[450px] p-4 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-250 text-xs font-medium focus:outline-none overflow-y-auto leading-relaxed text-left select-text rounded-b-xl
                                        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
                                        [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-100 dark:[&_h3]:border-slate-800 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
                                        [&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                                        [&_p]:mb-2 [&_p]:leading-relaxed
                                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                                        [&_li]:text-xs [&_li]:text-slate-750 dark:[&_li]:text-slate-350
                                        [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150 dark:[&_img]:border-slate-800
                                        [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3
                                        [&_a]:text-[#C21A1A] dark:[&_a]:text-red-400 [&_a]:underline [&_a]:font-semibold [&_a:hover]:text-red-800 dark:[&_a:hover]:text-red-300"
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex gap-2.5 justify-end shrink-0 bg-slate-50/40 dark:bg-slate-900/10 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-lg px-4 h-9 flex items-center gap-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-400 transition-all active:scale-97 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg px-5 h-9 bg-gradient-to-r from-[#C21A1A] to-[#A31414] hover:from-[#A31414] hover:to-[#850F0F] text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-97 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
