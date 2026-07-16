import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Bold, Italic, Underline, Heading, List, ListOrdered, Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Trash2, ListChecks, X } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@shared/ui';
import { cn } from '@shared/lib/utils';
import type { TaskRequestType, TaskItem, SubTask } from '../../../types/tasks.types';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import { getRoleFriendlyName } from '../../../constants';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import {
  DEFAULT_TASK_FORM_VALUES,
  taskFormSchema,
  taskFormToRequest,
  type TaskFormValues,
} from '../_hook/use-task-form';
import { TaskTemplatePicker } from './task-template-picker';
import type { TaskTemplate } from '../../../types/task-template.types';
import { taskTemplateService } from '../../../services/task-template-service';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import { toastSuccess, toastError } from '../../../shared/lib/toast';
import { compressAndConvertToBase64 } from '../../../services/firebase-storage-service';

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
      subtasks: initialValues.subtasks || [],
    } : DEFAULT_TASK_FORM_VALUES,
  });

  const staffOptions = useMemo(() => {
    return (staffMembers || []).map((staff) => {
      const foundRole = (roles || []).find(
        (r) => r.code.toUpperCase().trim() === (staff.role || '').toUpperCase().trim()
      );
      const roleName = foundRole ? foundRole.name : getRoleFriendlyName(staff.role);
      return {
        value: staff.fullName,
        label: `${staff.fullName} (${staff.position || roleName})`,
      };
    });
  }, [staffMembers, roles]);

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

  // --- Dynamic Templates State & Handlers ---
  const [templates, setTemplates] = React.useState<TaskTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = React.useState<string | null>(null);

  // Custom dialogues targets
  const [renameTemplateTarget, setRenameTemplateTarget] = React.useState<TaskTemplate | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = React.useState<TaskTemplate | null>(null);
  const [overwriteTemplateTarget, setOverwriteTemplateTarget] = React.useState<TaskTemplate | null>(null);
  const [isSaveNewPromptOpen, setIsSaveNewPromptOpen] = React.useState(false);

  const loadTemplates = useCallback(async () => {
    const list = await taskTemplateService.getAll();
    setTemplates(list);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setActiveTemplateId(null);
    }
  }, [isOpen, loadTemplates]);

  const handleSelectTemplate = useCallback((tpl: TaskTemplate) => {
    form.setValue('title', tpl.defaultTitle);
    form.setValue('department', tpl.defaultDepartment);
    form.setValue('priority', tpl.defaultPriority);
    if (tpl.defaultNotes) {
      form.setValue('notes', tpl.defaultNotes);
      if (editorRef.current) {
        editorRef.current.innerHTML = tpl.defaultNotes;
      }
    } else {
      form.setValue('notes', '');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
    if (tpl.defaultAssignee) form.setValue('assignee', tpl.defaultAssignee);
    const newSubtasks = (tpl.defaultSubtasks || []).map((s) => ({
      id: crypto.randomUUID(),
      title: s.title,
      completed: false,
    }));
    form.setValue('subtasks', newSubtasks);
    setActiveTemplateId(tpl.id);
  }, [form]);

  const handleRenameTemplate = useCallback((tpl: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTemplateTarget(tpl);
  }, []);

  const onConfirmRename = useCallback(async (newName: string) => {
    if (renameTemplateTarget) {
      try {
        await taskTemplateService.update(renameTemplateTarget.id, { name: newName });
        setRenameTemplateTarget(null);
        await loadTemplates();
        toastSuccess(`Đã đổi tên mẫu thành "${newName}" thành công!`);
      } catch {
        toastError("Không thể đổi tên mẫu công việc.");
      }
    }
  }, [renameTemplateTarget, loadTemplates]);

  const handleDeleteTemplate = useCallback((tpl: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTemplateTarget(tpl);
  }, []);

  const onConfirmDelete = useCallback(async () => {
    if (deleteTemplateTarget) {
      try {
        await taskTemplateService.delete(deleteTemplateTarget.id);
        if (activeTemplateId === deleteTemplateTarget.id) {
          setActiveTemplateId(null);
        }
        const deletedName = deleteTemplateTarget.name;
        setDeleteTemplateTarget(null);
        await loadTemplates();
        toastSuccess(`Đã xóa mẫu công việc "${deletedName}" thành công!`);
      } catch {
        toastError("Không thể xóa mẫu công việc.");
      }
    }
  }, [deleteTemplateTarget, activeTemplateId, loadTemplates]);

  const handleSaveAsNewTemplate = useCallback(() => {
    setIsSaveNewPromptOpen(true);
  }, []);

  const onConfirmSaveAsNew = useCallback(async (templateName: string) => {
    try {
      const currentValues = form.getValues();
      const newTpl = await taskTemplateService.create({
        name: templateName,
        defaultTitle: currentValues.title || '',
        defaultDepartment: currentValues.department || 'Showroom',
        defaultPriority: currentValues.priority || 'medium',
        defaultSubtasks: (currentValues.subtasks || []).map(s => ({ title: s.title })),
        defaultNotes: currentValues.notes || '',
      });
      await loadTemplates();
      setActiveTemplateId(newTpl.id);
      setIsSaveNewPromptOpen(false);
      toastSuccess(`Đã lưu mẫu "${templateName}" thành công!`);
    } catch {
      toastError("Không thể lưu mẫu công việc mới.");
    }
  }, [form, loadTemplates]);

  const handleOverwriteTemplate = useCallback(() => {
    if (!activeTemplateId) return;
    const tpl = templates.find(t => t.id === activeTemplateId);
    if (tpl) {
      setOverwriteTemplateTarget(tpl);
    }
  }, [activeTemplateId, templates]);

  const onConfirmOverwrite = useCallback(async () => {
    if (activeTemplateId && overwriteTemplateTarget) {
      try {
        const currentValues = form.getValues();
        await taskTemplateService.update(activeTemplateId, {
          defaultTitle: currentValues.title || '',
          defaultDepartment: currentValues.department || 'Showroom',
          defaultPriority: currentValues.priority || 'medium',
          defaultSubtasks: (currentValues.subtasks || []).map(s => ({ title: s.title })),
          defaultNotes: currentValues.notes || '',
        });
        const name = overwriteTemplateTarget.name;
        setOverwriteTemplateTarget(null);
        await loadTemplates();
        toastSuccess(`Đã cập nhật đè mẫu "${name}" thành công!`);
      } catch {
        toastError("Không thể cập nhật đè mẫu công việc.");
      }
    }
  }, [activeTemplateId, overwriteTemplateTarget, form, loadTemplates]);

  // --- Rich Text Editor Toolbar Custom States & Handlers ---
  const [insertImageLinkOpen, setInsertImageLinkOpen] = React.useState(false);
  const [insertLinkOpen, setInsertLinkOpen] = React.useState(false);

  const [editorStates, setEditorStates] = React.useState({
    bold: false,
    italic: false,
    underline: false,
    h3: false,
    h4: false,
    p: false,
    bulletList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
  });

  const updateEditorToolbarStates = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !editorRef.current.contains(anchorNode)) return;

    const formatBlock = document.queryCommandValue('formatBlock');
    setEditorStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      h3: formatBlock === 'h3' || formatBlock === 'H3',
      h4: formatBlock === 'h4' || formatBlock === 'H4',
      p: formatBlock === 'p' || formatBlock === 'P' || formatBlock === '',
      bulletList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    });
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateEditorToolbarStates();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateEditorToolbarStates]);

  const onConfirmInsertImageLink = useCallback((url: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full max-h-[300px] h-auto object-contain rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh" />`
    );
    handleEditorInput();
  }, []);

  const onConfirmInsertLink = useCallback((url: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand('createLink', false, url);
    handleEditorInput();
  }, []);

  const getButtonClass = (isActive: boolean) =>
    cn(
      "p-1 px-1.5 rounded transition-all cursor-pointer border flex items-center gap-0.5 text-xs font-semibold",
      isActive
        ? "border-[#C21A1A] bg-red-50/50 text-[#C21A1A] font-bold shadow-3xs"
        : "border-transparent hover:bg-slate-200 text-slate-800"
    );

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
          subtasks: initialValues.subtasks || [],
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
  const compressAndInsertImages = async (files: File[]) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const compressedBase64 = await compressAndConvertToBase64(file);
        return { name: file.name, base64: compressedBase64 };
      });
      const results = await Promise.all(uploadPromises);

      if (editorRef.current) {
        editorRef.current.focus();

        const imgTags = results
          .map((res) => 
            `<img src="${res.base64}" referrerPolicy="no-referrer" class="max-w-full max-h-[300px] h-auto object-contain rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="${res.name}" />`
          )
          .join('');

        // Insert all base64 images with proper premium design style
        document.execCommand('insertHTML', false, imgTags);
        handleEditorInput();
      }
    } catch (error) {
      console.error("Lỗi nén và chèn ảnh:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      void compressAndInsertImages(files);
    }
  };

  const dialogWidthClass = React.useMemo(() => {
    return 'max-w-3xl';
  }, []);

  const isMobile = useIsMobile();

  // Subtask local state for input
  const [subtaskInput, setSubtaskInput] = useState('');
  const currentSubtasks = form.watch('subtasks') || [];

  const addSubtask = useCallback(() => {
    const title = subtaskInput.trim();
    if (!title) return;
    const newSubtask: SubTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    form.setValue('subtasks', [...currentSubtasks, newSubtask]);
    setSubtaskInput('');
  }, [subtaskInput, currentSubtasks, form]);

  const removeSubtask = useCallback((id: string) => {
    form.setValue('subtasks', currentSubtasks.filter(s => s.id !== id));
  }, [currentSubtasks, form]);

  const handleSubmit = useCallback(async (values: TaskFormValues) => {
    await onSubmit(taskFormToRequest(values));
  }, [onSubmit]);

  if (!isOpen) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-end md:items-center justify-center md:p-4 z-50 animate-in fade-in duration-200">
      <div className={cn(
        'bg-white flex flex-col shadow-2xl space-y-4 text-left border border-slate-100 overflow-hidden transition-all duration-300 ease-in-out',
        isMobile
          ? 'w-full h-full rounded-t-2xl animate-in slide-in-from-bottom duration-300 p-4'
          : `rounded-2xl p-6 w-full ${dialogWidthClass} max-h-[calc(100vh-2rem)]`
      )}>
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
              {/* Template Picker (only when creating new) */}
              {!isEditing && (
                <TaskTemplatePicker
                  templates={templates}
                  activeTemplateId={activeTemplateId}
                  onSelect={handleSelectTemplate}
                  onEdit={handleRenameTemplate}
                  onDelete={handleDeleteTemplate}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex items-center justify-between">
                      <FormLabel isRequired className="block text-[10px] font-black text-slate-400 uppercase">
                        Tên công việc / Nhiệm vụ
                      </FormLabel>
                      <span className={cn('text-[10px] font-semibold', (field.value?.length || 0) > 100 ? 'text-rose-500' : 'text-slate-300')}>
                        {field.value?.length || 0}/120
                      </span>
                    </div>
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

              {/* Subtasks / Checklist Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Checklist công việc con ({currentSubtasks.length})
                  </span>
                </label>

                {/* Add subtask input */}
                <div className="flex gap-2">
                  <Input
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    placeholder="Nhập mục checklist và nhấn Enter..."
                    className="flex-1 bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 text-xs font-semibold rounded-lg min-h-[44px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSubtask}
                    disabled={!subtaskInput.trim()}
                    className="shrink-0 h-[44px] px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Subtask list */}
                {currentSubtasks.length > 0 && (
                  <div className="space-y-1">
                    {currentSubtasks.map((subtask, idx) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg group min-h-[40px]"
                      >
                        <span className="text-[10px] font-bold text-slate-300 w-4 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 flex-1">
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity cursor-pointer p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                            onClick={() => {
                              document.execCommand('bold', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.bold)}
                            title="In đậm"
                          >
                            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('italic', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.italic)}
                            title="In nghiêng"
                          >
                            <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('underline', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.underline)}
                            title="Gạch dưới"
                          >
                            <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('formatBlock', false, editorStates.h3 ? '<p>' : '<h3>');
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.h3)}
                            title="Tiêu đề H3"
                          >
                            <Heading className="w-3 h-3 stroke-[2.5]" />
                            <span>H3</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('formatBlock', false, editorStates.h4 ? '<p>' : '<h4>');
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.h4)}
                            title="Tiêu đề H4"
                          >
                            <Heading className="w-3 h-3 stroke-[2.5]" />
                            <span>H4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('formatBlock', false, '<p>');
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.p)}
                            title="Văn bản thường"
                          >
                            P
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('insertUnorderedList', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.bulletList)}
                            title="Danh sách dấu tròn"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('insertOrderedList', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.orderedList)}
                            title="Danh sách số"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>

                          <div className="h-4 w-px bg-slate-300 mx-1" />

                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('justifyLeft', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.justifyLeft)}
                            title="Căn lề trái"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('justifyCenter', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.justifyCenter)}
                            title="Căn lề giữa"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              document.execCommand('justifyRight', false);
                              updateEditorToolbarStates();
                            }}
                            className={getButtonClass(editorStates.justifyRight)}
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
                            multiple
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
                            onClick={() => setInsertImageLinkOpen(true)}
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="Dán link ảnh"
                          >
                            <span>Link Ảnh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInsertLinkOpen(true)}
                            className="p-1 px-1.5 bg-white border border-slate-200 hover:bg-purple-50 text-purple-750 hover:border-purple-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="Chèn liên kết"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
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
                                    [&_img]:max-w-full [&_img]:max-h-[300px] [&_img]:h-auto [&_img]:object-contain [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150
                                    [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-506 [&_blockquote]:my-3
                                    [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveAsNewTemplate}
                      className="px-3.5 py-2 text-xs font-bold text-slate-750 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg cursor-pointer h-auto"
                    >
                      Lưu thành mẫu mới
                    </Button>
                    {activeTemplateId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOverwriteTemplate}
                        className="px-3.5 py-2 text-xs font-bold text-[#C21A1A] bg-red-50/50 border border-red-200 hover:bg-red-50 hover:text-rose-700 rounded-lg cursor-pointer h-auto"
                      >
                        Lưu đè mẫu hiện tại
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
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
            </div>
          </form>
        </Form>
      </div>

      {/* Dynamic Templates Confirmation / Prompt Dialogs */}
      <ActionPromptDialog
        open={renameTemplateTarget !== null}
        onOpenChange={(open) => { if (!open) setRenameTemplateTarget(null); }}
        title="Đổi tên mẫu công việc"
        placeholder="Nhập tên mới cho mẫu..."
        defaultValue={renameTemplateTarget?.name || ''}
        onSubmit={onConfirmRename}
      />

      <ActionPromptDialog
        open={isSaveNewPromptOpen}
        onOpenChange={setIsSaveNewPromptOpen}
        title="Lưu mẫu công việc mới"
        placeholder="Nhập tên cho mẫu công việc..."
        defaultValue=""
        onSubmit={onConfirmSaveAsNew}
      />

      <ActionConfirmDialog
        open={deleteTemplateTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTemplateTarget(null); }}
        title="Xác nhận xóa mẫu"
        description={deleteTemplateTarget ? `Bạn có chắc chắn muốn xóa mẫu công việc "${deleteTemplateTarget.name}" không?` : ''}
        variant="danger"
        onConfirm={onConfirmDelete}
      />

      <ActionConfirmDialog
        open={overwriteTemplateTarget !== null}
        onOpenChange={(open) => { if (!open) setOverwriteTemplateTarget(null); }}
        title="Xác nhận cập nhật mẫu"
        description={overwriteTemplateTarget ? `Bạn có chắc chắn muốn lưu đè thông tin hiện tại vào mẫu "${overwriteTemplateTarget.name}" không?` : ''}
        variant="confirm"
        onConfirm={onConfirmOverwrite}
      />

      <ActionPromptDialog
        open={insertImageLinkOpen}
        onOpenChange={setInsertImageLinkOpen}
        title="Chèn ảnh từ liên kết (URL)"
        placeholder="https://example.com/image.jpg"
        defaultValue=""
        onSubmit={onConfirmInsertImageLink}
      />

      <ActionPromptDialog
        open={insertLinkOpen}
        onOpenChange={setInsertLinkOpen}
        title="Chèn liên kết web"
        placeholder="https://example.com"
        defaultValue="https://"
        onSubmit={onConfirmInsertLink}
      />
    </div>
  );
});

interface ActionPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder?: string;
  defaultValue: string;
  onSubmit: (value: string) => void;
}

const ActionPromptDialog = React.memo(function ActionPromptDialog({
  open,
  onOpenChange,
  title,
  placeholder = "Nhập giá trị...",
  defaultValue,
  onSubmit,
}: ActionPromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full text-xs font-semibold"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
        </div>
        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer h-auto border-none shadow-none"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!value.trim()}
            onClick={handleConfirm}
            className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg cursor-pointer h-auto border-none"
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
