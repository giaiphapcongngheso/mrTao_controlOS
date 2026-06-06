import React, { useCallback, useEffect, useMemo } from 'react';
import { Plus, Pencil, Bold, Italic, Underline, Heading, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { CustomMultiSelect } from '../../../../share/components/custom/custom-multi-select';
import { DatePicker } from '../../../../share/components/custom/date-picker';
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
} from '@shared/ui';
import type { TaskRequestType, TaskItem } from '../../../types/tasks.types';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import { getRoleFriendlyName } from '../../../constants';
import {
  DEFAULT_TASK_FORM_VALUES,
  taskFormSchema,
  taskFormToRequest,
  type TaskFormValues,
} from '../_hook/use-task-form';

function parseDeadlineStringToDate(deadline: string): Date {
  if (!deadline) return new Date();

  // format dd/MM/yyyy
  const match = deadline.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // format yyyy-MM-dd
  const match2 = deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match2) {
    const d = new Date(Number(match2[1]), Number(match2[2]) - 1, Number(match2[3]));
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(deadline);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseDateStringToDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;

  // format dd/MM/yyyy
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // format yyyy-MM-dd
  const match2 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match2) {
    const d = new Date(Number(match2[1]), Number(match2[2]) - 1, Number(match2[3]));
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: TaskRequestType) => void | Promise<void>;
  staffMembers?: StaffMember[];
  roles?: StaffRole[];
  initialValues?: TaskItem | null;
}

export const TaskCreateModal = React.memo(function TaskCreateModal({
  isOpen,
  onClose,
  onSubmit,
  staffMembers = [],
  roles = [],
  initialValues = null,
}: TaskCreateModalProps) {
  const isEditing = !!initialValues;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialValues ? {
      title: initialValues.title,
      department: initialValues.department,
      priority: initialValues.priority,
      deadline: parseDeadlineStringToDate(initialValues.deadline),
      assignee: initialValues.assignee || '',
      notes: initialValues.notes || '',
      startDate: parseDateStringToDate(initialValues.startDate),
      helpers: initialValues.helpers || [],
      link: initialValues.link || '',
    } : DEFAULT_TASK_FORM_VALUES,
  });

  const staffOptions = useMemo(() => {
    return (staffMembers || []).map((staff) => ({
      value: staff.fullName,
      label: `${staff.fullName} (${staff.position || getRoleFriendlyName(staff.role)})`,
    }));
  }, [staffMembers]);

  const roleOptions = useMemo(() => {
    return (roles || []).map((role) => ({
      value: role.name,
      label: role.name,
    }));
  }, [roles]);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editorInitialized, setEditorInitialized] = React.useState(false);

  // Sync state with content editable content
  const handleEditorInput = () => {
    if (editorRef.current) {
      form.setValue('notes', editorRef.current.innerHTML, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        form.reset({
          title: initialValues.title,
          department: initialValues.department,
          priority: initialValues.priority,
          deadline: parseDeadlineStringToDate(initialValues.deadline),
          assignee: initialValues.assignee || '',
          notes: initialValues.notes || '',
          startDate: parseDateStringToDate(initialValues.startDate),
          helpers: initialValues.helpers || [],
          link: initialValues.link || '',
        });
      } else {
        form.reset(DEFAULT_TASK_FORM_VALUES);
      }
      setEditorInitialized(false);
    }
  }, [isOpen, initialValues, form]);

  const notesValue = form.watch('notes') || '';

  // Sync editor HTML value once when modal is mounted / displayed or form resets
  useEffect(() => {
    if (isOpen) {
      if (!editorInitialized && editorRef.current) {
        editorRef.current.innerHTML = notesValue || '';
        setEditorInitialized(true);
      }
    } else {
      setEditorInitialized(false);
    }
  }, [isOpen, editorInitialized, notesValue]);

  // Image compressor & insertion
  const compressAndInsertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Limit max width to 800px to maintain performant Firestore & LocalStorage storage
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
          // Compress JPEG to 0.75 quality for super high resolution with tiny footprint
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          
          if (editorRef.current) {
            editorRef.current.focus();
            
            // Insert base64 image with proper premium design style
            document.execCommand(
              'insertHTML', 
              false, 
              `<img src="${compressedBase64}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh tài liệu" />`
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

  const dialogWidthClass = React.useMemo(() => {
    return 'max-w-3xl'; // We need plenty of width for side-by-side inputs and Rich Text toolbar
  }, []);

  const handleSubmit = useCallback(async (values: TaskFormValues) => {
    await onSubmit(taskFormToRequest(values));
  }, [onSubmit]);

  if (!isOpen) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`bg-white rounded-2xl p-6 w-full ${dialogWidthClass} max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl space-y-4 text-left border border-slate-100 overflow-hidden transition-all duration-300 ease-in-out`}>
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-[#C21A1A] stroke-[2.5]" />
            ) : (
              <Plus className="w-5 h-5 text-[#C21A1A] stroke-[2.5]" />
            )}
            {isEditing ? 'Chỉnh sửa công việc chi tiết' : 'Tạo công việc mới chi tiết'}
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                    <FormItem className="space-y-1 min-w-0">
                      <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                        Vai trò
                      </FormLabel>
                      <FormControl>
                        <CustomSelect
                          options={roleOptions}
                          value={field.value}
                          onChangeValue={field.onChange}
                          placeholder="Chọn vai trò"
                          clearable={false}
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10 min-w-0"
                          containerClassName="w-full min-w-0"
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
                    <FormItem className="space-y-1 min-w-0">
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
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10 min-w-0"
                          containerClassName="w-full min-w-0"
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1 min-w-0">
                      <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                        Ngày bắt đầu
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value as any}
                          onChange={field.onChange as any}
                          className="w-full text-xs font-semibold h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem className="space-y-1 min-w-0">
                      <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                        Hạn chót
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value as any}
                          onChange={field.onChange as any}
                          className="w-full text-xs font-semibold h-10"
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
                  name="assignee"
                  render={({ field }) => (
                    <FormItem className="space-y-1 min-w-0">
                      <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                        Người phụ trách
                      </FormLabel>
                      <FormControl>
                        <CustomSelect
                          options={staffOptions}
                          value={field.value}
                          onChangeValue={field.onChange}
                          placeholder="Chọn nhân sự"
                          clearable={false}
                          className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg h-10 min-w-0"
                          containerClassName="w-full min-w-0"
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="helpers"
                  render={({ field }) => (
                    <FormItem className="space-y-1 min-w-0">
                      <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                        Người phụ giúp (Helpers)
                      </FormLabel>
                      <FormControl>
                        <CustomMultiSelect
                          options={staffOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Chọn người phụ giúp"
                          searchPlaceholder="Tìm nhân sự..."
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                      Liên kết đính kèm
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        clearable={true}
                        placeholder="Ví dụ: https://docs.google.com/document/d/..."
                        className="w-full bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 text-xs font-semibold rounded-lg"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="block text-[10px] font-black text-slate-400 uppercase">
                      Ghi chú hướng dẫn (Rich Text Editor)
                    </FormLabel>
                    <FormControl>
                      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-[#C21A1A] focus-within:border-[#C21A1A]">
                        {/* Format Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 select-none">
                          <button
                            type="button"
                            onClick={() => document.execCommand('bold', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-800 rounded transition-colors cursor-pointer"
                            title="In đậm"
                          >
                            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('italic', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-800 rounded transition-colors cursor-pointer"
                            title="In nghiêng"
                          >
                            <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('underline', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-800 rounded transition-colors cursor-pointer"
                            title="Gạch dưới"
                          >
                            <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => document.execCommand('formatBlock', false, '<h3>')}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Tiêu đề H3"
                          >
                            <Heading className="w-3 h-3 stroke-[2.5]" />
                            <span>H3</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('formatBlock', false, '<h4>')}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Tiêu đề H4"
                          >
                            <Heading className="w-3 h-3 stroke-[2.5]" />
                            <span>H4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('formatBlock', false, '<p>')}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer"
                            title="Văn bản thường"
                          >
                            P
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => document.execCommand('insertUnorderedList', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded transition-colors cursor-pointer"
                            title="Danh sách dấu tròn"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('insertOrderedList', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded transition-colors cursor-pointer"
                            title="Danh sách số"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => document.execCommand('justifyLeft', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded transition-colors cursor-pointer"
                            title="Căn lề trái"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('justifyCenter', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded transition-colors cursor-pointer"
                            title="Căn lề giữa"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('justifyRight', false)}
                            className="p-1 px-1.5 hover:bg-slate-200 text-slate-850 rounded transition-colors cursor-pointer"
                            title="Căn lề phải"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          {/* Text Colors */}
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs h-[24px]">
                            <button
                              type="button"
                              onClick={() => document.execCommand('foreColor', false, '#C21A1A')}
                              className="w-3 h-3 rounded-full bg-[#C21A1A] border border-white hover:scale-120 transition-all cursor-pointer"
                              title="Đỏ thương hiệu"
                            />
                            <button
                              type="button"
                              onClick={() => document.execCommand('foreColor', false, '#1E40AF')}
                              className="w-3 h-3 rounded-full bg-[#1E40AF] border border-white hover:scale-120 transition-all cursor-pointer"
                              title="Xanh lam"
                            />
                            <button
                              type="button"
                              onClick={() => document.execCommand('foreColor', false, '#10B981')}
                              className="w-3 h-3 rounded-full bg-[#10B981] border border-white hover:scale-120 transition-all cursor-pointer"
                              title="Xanh lá"
                            />
                            <button
                              type="button"
                              onClick={() => document.execCommand('foreColor', false, '#F59E0B')}
                              className="w-3 h-3 rounded-full bg-[#F59E0B] border border-white hover:scale-120 transition-all cursor-pointer"
                              title="Hổ phách"
                            />
                            <button
                              type="button"
                              onClick={() => document.execCommand('foreColor', false, '#475569')}
                              className="w-3 h-3 rounded-full bg-[#475569] border border-white hover:scale-120 transition-all cursor-pointer"
                              title="Xám"
                            />
                          </div>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          {/* Media upload, link insertion, formatting helpers */}
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
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-[#C21A1A] hover:border-[#C21A1A]/40 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="Tải ảnh từ máy"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Ảnh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt("Nhập URL của ảnh:");
                              if (url) {
                                if (editorRef.current) editorRef.current.focus();
                                document.execCommand('insertHTML', false, `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh" />`);
                                handleEditorInput();
                              }
                            }}
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
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
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-purple-50 text-purple-750 hover:border-purple-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="Chèn liên kết"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('removeFormat', false)}
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-amber-50 text-amber-700 hover:border-amber-200 rounded-lg text-[10px] font-black transition-all cursor-pointer"
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
                          className="min-h-[200px] max-h-[350px] p-4 bg-white text-slate-800 text-xs font-semibold focus:outline-none overflow-y-auto leading-relaxed text-left select-text rounded-b-xl
                                    [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
                                    [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-105 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
                                    [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                                    [&_p]:mb-2 [&_p]:leading-relaxed
                                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                                    [&_li]:text-xs [&_li]:text-slate-700
                                    [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150
                                    [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-506 [&_blockquote]:my-3
                                    [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
                          placeholder="Mô tả công việc chi tiết. Định dạng Word có thể đổi màu, chèn danh sách và hình ảnh trực quan..."
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 shrink-0">
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
                {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Lưu thay đổi' : 'Giao việc')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
});
