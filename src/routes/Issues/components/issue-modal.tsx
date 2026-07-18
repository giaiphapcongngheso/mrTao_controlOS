import React, { useEffect } from 'react';
import { Sparkles, Edit2, Check, AlertOctagon, FileText, Shield, Lightbulb, Upload, Trash2, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SOP_ISSUE_STATUSES, type SOPIssue, type SOPIssueCategory } from '../../../types/issues.types';
import { Button, Input, Textarea, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../share/ui';
import { Sheet, SheetContent, SheetTitle, SheetFooter, SheetHeader } from '../../../../share/ui/sheet';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { useChecklistProcessCategoriesQuery } from '../../Checklist/_hook/use-checklist';
import { useStaffQuery } from '../../StaffPermissions/_hook/use-staff';
import { getRoleFriendlyName } from '../../../constants';
import { uploadImageToStorage, deleteImageFromStorage } from '../../../services/firebase-storage-service';

// --- Types ---
interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SOPIssue, 'id' | 'storeId' | 'date'>) => void;
  initialData?: SOPIssue;
  canCreate: boolean;
  canUpdate: boolean;
}

// --- Constants ---
const CATEGORY_CONFIG = {
  sop_error: { label: 'Lỗi SOP', icon: AlertOctagon, activeClass: 'border-[#C21A1A] text-[#C21A1A] bg-red-50 dark:bg-red-950/20' },
  exception: { label: 'Ngoại lệ', icon: FileText, activeClass: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
  risk: { label: 'Rủi ro', icon: Shield, activeClass: 'border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/20' },
  improvement: { label: 'Sáng kiến', icon: Lightbulb, activeClass: 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
} as const;



// --- Form Schema ---
const issueFormSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề').max(100),
  category: z.enum(['sop_error', 'exception', 'risk', 'improvement']),
  severity: z.enum(['High', 'Medium', 'Low']),
  status: z.enum(SOP_ISSUE_STATUSES),
  actor: z.string(),
  process: z.string(),
  occurrence: z.number().min(1, 'Số lần xảy ra phải ít nhất là 1'),
  assignee: z.string(),
  reporter: z.string().optional(),
  relatedPerson: z.string().optional(),
  description: z.string().min(1, 'Vui lòng nhập mô tả thực tế'),
  rootCause: z.string().optional(),
  proposedSolution: z.string().optional(),
  expectedTimeSaved: z.string().optional(),
  expectedCostSaved: z.string().optional(),
  expectedRevenueIncrease: z.string().optional(),
  expectedOtherBenefit: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

// --- Sub-components ---

// Section header (no number badge)
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  isRequired?: boolean;
}

const SectionHeader = React.memo(function SectionHeader({ title, subtitle, isRequired }: SectionHeaderProps) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
        {title}
        {isRequired && <span className="text-[#C21A1A] font-bold">*</span>}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      )}
    </div>
  );
});

// Category button (outlined style with icon)
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

  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const isActive = activeCategory === category;

  const buttonClass = React.useMemo(() => {
    if (isActive) {
      return `${config.activeClass} border-2 font-bold`;
    }
    return 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent';
  }, [isActive, config.activeClass]);

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className={`py-2.5 px-3 text-xs font-semibold text-center rounded-lg cursor-pointer transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 h-auto ${buttonClass}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Button>
  );
});

// Occurrence input
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

// Textarea with character count
interface CountedTextareaProps extends React.ComponentProps<typeof Textarea> {
  maxChars?: number;
  currentLength: number;
}

const CountedTextarea = React.memo(function CountedTextarea({
  maxChars = 1000,
  currentLength,
  ...props
}: CountedTextareaProps) {
  return (
    <div className="relative">
      <Textarea {...props} />
      <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
        {currentLength}/{maxChars}
      </span>
    </div>
  );
});

// File drop zone
interface FileDropZoneProps {
  attachments: string[];
  onAddAttachment: (base64: string) => void;
  onRemoveAttachment: (index: number) => void;
}

const FileDropZone = React.memo(function FileDropZone({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
}: FileDropZoneProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const processFiles = React.useCallback(async (files: File[]) => {
    try {
      const uploadPromises = files.map((file) => uploadImageToStorage(file, 'issue-attachments'));
      const results = await Promise.all(uploadPromises);
      results.forEach((url) => {
        if (url) {
          onAddAttachment(url);
        }
      });
    } catch (error) {
      console.error("Lỗi khi xử lý file đính kèm:", error);
    }
  }, [onAddAttachment]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) void processFiles(files);
  }, [processFiles]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      void processFiles(files);
      e.target.value = '';
    }
  }, [processFiles]);

  const handleClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleFileChange}
      />

      {attachments.length === 0 ? (
        // Khung DropZone lớn mặc định khi chưa có ảnh
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${isDragging
              ? 'border-[#C21A1A] bg-red-50/50 dark:bg-red-950/10'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
            }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">
            Kéo thả file vào đây hoặc <span className="text-[#C21A1A] font-semibold">bấm để chọn file</span>
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Hỗ trợ: .jpg, .png (tối đa 10MB/file)
          </p>
        </div>
      ) : (
        // Giao diện thu gọn khi đã có ảnh
        <div className="flex flex-wrap gap-2 items-center">
          {/* Thumbnails */}
          {attachments.map((src, index) => (
            <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
              <img src={src} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                onClick={() => onRemoveAttachment(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 p-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {/* Ô "Thêm ảnh" nét đứt nhỏ xếp cùng hàng */}
          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 shrink-0 ${isDragging
                ? 'border-[#C21A1A] bg-red-50/50 dark:bg-red-950/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
          >
            <Upload className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold text-center">
              Thêm mới
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// --- Main Component ---
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
      reporter: '',
      relatedPerson: '',
      description: '',
      rootCause: '',
      proposedSolution: '',
      expectedTimeSaved: '',
      expectedCostSaved: '',
      expectedRevenueIncrease: '',
      expectedOtherBenefit: '',
    },
  });

  // Attachments state (managed outside form for simplicity)
  const [attachments, setAttachments] = React.useState<string[]>([]);

  const handleAddAttachment = React.useCallback((base64: string) => {
    setAttachments((prev) => [...prev, base64]);
  }, []);

  const handleRemoveAttachment = React.useCallback((index: number) => {
    const urlToRemove = attachments[index];
    if (urlToRemove) {
      void deleteImageFromStorage(urlToRemove);
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, [attachments]);

  const category = form.watch('category');
  const actor = form.watch('actor');
  const assignee = form.watch('assignee');
  const reporter = form.watch('reporter');
  const relatedPerson = form.watch('relatedPerson');
  const process = form.watch('process');
  const descriptionValue = form.watch('description') || '';
  const rootCauseValue = form.watch('rootCause') || '';
  const proposedSolutionValue = form.watch('proposedSolution') || '';
  const expectedOtherBenefitValue = form.watch('expectedOtherBenefit') || '';

  // Record date state (managed outside zod for Date type)
  const [recordDate, setRecordDate] = React.useState<Date | undefined>(new Date());

  const handleRecordDateChange = React.useCallback((date: Date | undefined) => {
    setRecordDate(date);
  }, []);

  // Fetch checklist categories (processes) using query hook
  const { data: categories = [] } = useChecklistProcessCategoriesQuery();

  // Fetch staff list using query hook
  const { data: staffMembers = [] } = useStaffQuery();

  // Generate staff options
  const staffOptions = React.useMemo(() => {
    const baseOptions = staffMembers.map((staff) => ({
      label: `${staff.fullName} (${staff.position || getRoleFriendlyName(staff.role)})`,
      value: staff.fullName,
    }));
    if (actor && !staffMembers.some((s) => s.fullName === actor)) {
      baseOptions.unshift({ label: actor, value: actor });
    }
    return baseOptions;
  }, [staffMembers, actor]);

  // Generate assignee options
  const assigneeOptions = React.useMemo(() => {
    const baseOptions = staffMembers.map((staff) => ({
      label: `${staff.fullName} (${staff.position || getRoleFriendlyName(staff.role)})`,
      value: staff.fullName,
    }));
    if (assignee && !staffMembers.some((s) => s.fullName === assignee)) {
      baseOptions.unshift({ label: assignee, value: assignee });
    }
    return baseOptions;
  }, [staffMembers, assignee]);

  // Generate reporter options
  const reporterOptions = React.useMemo(() => {
    const baseOptions = staffMembers.map((staff) => ({
      label: `${staff.fullName} (${staff.position || getRoleFriendlyName(staff.role)})`,
      value: staff.fullName,
    }));
    if (reporter && !staffMembers.some((s) => s.fullName === reporter)) {
      baseOptions.unshift({ label: reporter, value: reporter });
    }
    return baseOptions;
  }, [staffMembers, reporter]);

  // Generate related person options
  const relatedPersonOptions = React.useMemo(() => {
    const baseOptions = staffMembers.map((staff) => ({
      label: `${staff.fullName} (${staff.position || getRoleFriendlyName(staff.role)})`,
      value: staff.fullName,
    }));
    if (relatedPerson && !staffMembers.some((s) => s.fullName === relatedPerson)) {
      baseOptions.unshift({ label: relatedPerson, value: relatedPerson });
    }
    return baseOptions;
  }, [staffMembers, relatedPerson]);

  // Generate process options
  const processOptions = React.useMemo(() => {
    const baseOptions = categories
      .filter((cat) => !cat.deletedAt)
      .map((cat) => ({
        label: cat.title,
        value: cat.title,
      }));
    if (process && !baseOptions.some((opt) => opt.value === process)) {
      baseOptions.unshift({ label: process, value: process });
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
          reporter: initialData.submittedBy || '',
          relatedPerson: '',
          description: initialData.description || '',
          rootCause: initialData.rootCause || '',
          proposedSolution: initialData.proposedSolution || '',
          expectedTimeSaved: initialData.expectedBenefit?.timeSaved || '',
          expectedCostSaved: initialData.expectedBenefit?.costSaved || '',
          expectedRevenueIncrease: initialData.expectedBenefit?.revenueIncrease || '',
          expectedOtherBenefit: initialData.expectedBenefit?.otherBenefit || '',
        });
        setRecordDate(initialData.date ? new Date(initialData.date) : new Date());
        setAttachments(initialData.attachments || []);
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
          reporter: '',
          relatedPerson: '',
          description: '',
          rootCause: '',
          proposedSolution: '',
          expectedTimeSaved: '',
          expectedCostSaved: '',
          expectedRevenueIncrease: '',
          expectedOtherBenefit: '',
        });
        setAttachments([]);
        setRecordDate(new Date());
      }
    }
  }, [initialData, isOpen, form]);

  const handleCategoryChange = React.useCallback((cat: SOPIssueCategory) => {
    form.setValue('category', cat);
    if (cat === 'sop_error') form.setValue('status', 'Xử lý ngay');
    else if (cat === 'exception') form.setValue('status', 'Chờ duyệt');
    else if (cat === 'risk') form.setValue('status', 'Xử lý ngay');
    else form.setValue('status', 'Đang triển khai');
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
      submittedBy: values.reporter?.trim() || '',
      description: values.description.trim(),
      rootCause: values.rootCause?.trim() || '',
      proposedSolution: values.proposedSolution?.trim() || '',
      expectedBenefit: {
        timeSaved: values.expectedTimeSaved?.trim() || '',
        costSaved: values.expectedCostSaved?.trim() || '',
        revenueIncrease: values.expectedRevenueIncrease?.trim() || '',
        otherBenefit: values.expectedOtherBenefit?.trim() || '',
      },
      attachments,
    });
  }, [onSubmit, attachments]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const isEdit = !!initialData;
  const canSubmit = isEdit ? canUpdate : canCreate;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="p-0 border-none bg-white dark:bg-slate-900 shadow-2xl w-[90%] sm:w-[65%] sm:max-w-[65%] h-full flex flex-col focus:outline-none"
      >
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmitHandler)} className="flex-1 flex flex-col min-h-0 h-full overflow-hidden text-left">

            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div className="space-y-1">
                <SheetTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C21A1A] to-[#971212] text-white flex items-center justify-center text-xs font-black shadow-xs">
                    {isEdit ? <Edit2 className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                  </span>
                  {isEdit ? 'Chỉnh sửa phiếu phát sinh' : 'Ghi nhận cải tiến mới'}
                </SheetTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500 pl-[38px]">
                  Chia sẻ vấn đề, đề xuất giải pháp và cùng nhau cải thiện mỗi ngày.
                </p>
              </div>
            </SheetHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 min-h-0 bg-white dark:bg-slate-900 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">

              {/* Phân loại cải tiến */}
              <div className="space-y-3">
                <SectionHeader
                  title="Phân loại cải tiến"
                  subtitle="Chọn loại cải tiến phù hợp để hệ thống phân loại và theo dõi hiệu quả."
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['sop_error', 'exception', 'risk', 'improvement'] as const).map((cat) => (
                    <IssueCategoryButton
                      key={cat}
                      category={cat}
                      activeCategory={category}
                      onSelectCategory={handleCategoryChange}
                    />
                  ))}
                </div>
              </div>

              {/* Thông tin chính */}
              <div className="space-y-3">
                <SectionHeader title="Thông tin chính" />

                {/* Row 1: Title, Severity, Occurrence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel isRequired className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Tiêu đề cải tiến
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Nhập tiêu đề ngắn gọn, rõ ràng (5–100 ký tự)"
                              maxLength={100}
                              {...field}
                              clearable={true}
                              className="w-full bg-background border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-650 focus-visible:ring-1 focus-visible:ring-[#C21A1A]/30 px-3 py-2 text-xs font-medium rounded-lg h-9 transition-all pr-12"
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-slate-400 pointer-events-none">
                              {field.value?.length || 0}/100
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Mức độ ưu tiên *
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
                          Số lần xảy ra *
                        </FormLabel>
                        <FormControl>
                          <OccurrenceInput
                            value={value}
                            onValueChange={onChange}
                            placeholder="Nhập số lần xảy ra"
                            {...rest}
                            className="w-full bg-background border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs rounded-lg h-9 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Actor, Process, Related person */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="actor"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Bộ phận liên quan *
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            placeholder="Chọn bộ phận"
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
                          Quy trình liên quan *
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            placeholder="Chọn quy trình / SOP"
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
                    name="relatedPerson"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Người liên quan
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            placeholder="Chọn người liên quan"
                            clearable={true}
                            options={relatedPersonOptions}
                            className="w-full bg-background border border-slate-200 dark:border-slate-700 text-xs rounded-lg h-9 transition-all"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 3: Reporter, Date, Assignee */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="reporter"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Người ghi nhận *
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            placeholder="Chọn người ghi nhận"
                            clearable={true}
                            options={reporterOptions}
                            className="w-full bg-background border border-slate-200 dark:border-slate-700 text-xs rounded-lg h-9 transition-all"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormItem className="grid gap-1">
                    <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Ngày ghi nhận
                    </FormLabel>
                    <DatePicker
                      value={recordDate}
                      onChange={handleRecordDateChange}
                      placeholder="dd/mm/yyyy"
                      clearable={false}
                    />
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="assignee"
                    render={({ field }) => (
                      <FormItem className="grid gap-1">
                        <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Người xử lý đề xuất *
                        </FormLabel>
                        <FormControl>
                          <CustomSelect
                            value={field.value}
                            onChangeValue={field.onChange}
                            placeholder="Chọn người xử lý"
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

              {/* Chi tiết nội dung vấn đề (Mô tả, Nguyên nhân, Giải pháp) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Mô tả thực tế */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Mô tả thực tế"
                    subtitle="Mô tả chi tiết vấn đề đang xảy ra."
                    isRequired
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormControl>
                            <CountedTextarea
                              maxChars={1000}
                              currentLength={descriptionValue.length}
                              placeholder="Nhập mô tả chi tiết..."
                              {...field}
                              className="min-h-[120px] text-xs border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Nguyên nhân gốc rễ */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Nguyên nhân gốc rễ"
                    subtitle="Vì sao vấn đề này xảy ra? (5 Whys, Pareto...)"
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="rootCause"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormControl>
                            <CountedTextarea
                              maxChars={1000}
                              currentLength={rootCauseValue.length}
                              placeholder="Nhập nguyên nhân gốc rễ..."
                              {...field}
                              className="min-h-[120px] text-xs border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Đề xuất giải pháp */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Đề xuất giải pháp"
                    subtitle="Giải pháp dự kiến để khắc phục / cải thiện."
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="proposedSolution"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormControl>
                            <CountedTextarea
                              maxChars={1000}
                              currentLength={proposedSolutionValue.length}
                              placeholder="Nhập đề xuất giải pháp..."
                              {...field}
                              className="min-h-[120px] text-xs border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Ảnh đính kèm & Hiệu quả kỳ vọng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Ảnh / Đính kèm */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Ảnh / Đính kèm"
                    subtitle="Đính kèm hình ảnh, file minh chứng (nếu có)."
                  />
                  <div>
                    <FileDropZone
                      attachments={attachments}
                      onAddAttachment={handleAddAttachment}
                      onRemoveAttachment={handleRemoveAttachment}
                    />
                  </div>
                </div>

                {/* Hiệu quả kỳ vọng */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Hiệu quả kỳ vọng"
                    subtitle="Dự kiến lợi ích khi áp dụng giải pháp này."
                  />
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="expectedTimeSaved"
                        render={({ field }) => (
                          <FormItem className="grid gap-1">
                            <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#C21A1A]" />
                              Tiết kiệm thời gian
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-9">
                                <Input
                                  type="text"
                                  placeholder=""
                                  {...field}
                                  clearable={false}
                                  className="border-none shadow-none h-full text-xs rounded-none flex-1 focus-visible:ring-0"
                                />
                                <span className="text-[10px] text-slate-400 px-2.5 bg-slate-50 dark:bg-slate-800 h-full flex items-center border-l border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium shrink-0">
                                  giờ / tháng
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedCostSaved"
                        render={({ field }) => (
                          <FormItem className="grid gap-1">
                            <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-[#C21A1A]" />
                              Tiết kiệm chi phí
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-9">
                                <Input
                                  type="text"
                                  placeholder=""
                                  {...field}
                                  clearable={false}
                                  className="border-none shadow-none h-full text-xs rounded-none flex-1 focus-visible:ring-0"
                                />
                                <span className="text-[10px] text-slate-400 px-2.5 bg-slate-50 dark:bg-slate-800 h-full flex items-center border-l border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium shrink-0">
                                  VNĐ / tháng
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedRevenueIncrease"
                        render={({ field }) => (
                          <FormItem className="grid gap-1">
                            <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-[#C21A1A]" />
                              Tăng doanh thu
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-9">
                                <Input
                                  type="text"
                                  placeholder=""
                                  {...field}
                                  clearable={false}
                                  className="border-none shadow-none h-full text-xs rounded-none flex-1 focus-visible:ring-0"
                                />
                                <span className="text-[10px] text-slate-400 px-2.5 bg-slate-50 dark:bg-slate-800 h-full flex items-center border-l border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium shrink-0">
                                  VNĐ / tháng
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="expectedOtherBenefit"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Hiệu quả khác (nếu có)
                          </FormLabel>
                          <FormControl>
                            <CountedTextarea
                              maxChars={300}
                              currentLength={expectedOtherBenefitValue.length}
                              placeholder="Ví dụ: nâng cao sự hài lòng khách hàng, giảm sai sót..."
                              {...field}
                              className="min-h-[60px] text-xs border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <SheetFooter className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-2 justify-end shrink-0 bg-white dark:bg-slate-900 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-lg px-5 h-9 flex items-center gap-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-650 dark:text-slate-400 transition-all active:scale-97 cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg px-5 h-9 bg-gradient-to-r from-[#C21A1A] to-[#A31414] hover:from-[#A31414] hover:to-[#850F0F] text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-97 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {isEdit ? 'Lưu cập nhật' : 'Ghi nhận vào hệ thống'}
              </Button>
            </SheetFooter>

          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
});

export default IssueModal;
