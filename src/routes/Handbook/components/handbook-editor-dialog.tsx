import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  ExternalLink,
  ImageIcon,
  Upload,
  Loader2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading,
  BookOpen,
  Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui';
import { CreatableCombobox } from '@shared/components/custom/creatable-combobox';
import type { HandbookCategoryRequestType } from '../../../types/handbook.types';
import type { HandbookFormFieldErrors } from '../handbook-form-schema';
import type { HandbookFormState } from '../handbook-view.types';
import CategoryCreateMetaDialog from './category-create-meta-dialog';
import { CustomMultiSelect, type MultiSelectOption } from '../../../../share/components/custom/custom-multi-select';

interface HandbookEditorDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  isUploadingImages: boolean;
  editingDocId: string | null;
  formState: HandbookFormState;
  canManageCategories: boolean;
  categoryOptions: string[];
  rolesOptions: MultiSelectOption[];
  errors: HandbookFormFieldErrors;
  onClose: () => void;
  onSave: () => void;
  onFormPatch: (patch: Partial<HandbookFormState>) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  onAddCategory: (payload: HandbookCategoryRequestType) => Promise<void>;
  onDeleteCategory?: (name: string) => Promise<void>;
}

export default function HandbookEditorDialog({
  isOpen,
  isSaving,
  isUploadingImages,
  editingDocId,
  formState,
  canManageCategories,
  categoryOptions,
  rolesOptions,
  errors,
  onClose,
  onSave,
  onFormPatch,
  onUploadImages,
  onAddCategory,
  onDeleteCategory,
}: HandbookEditorDialogProps) {
  const [isCategoryMetaOpen, setIsCategoryMetaOpen] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const pendingCategoryResolver = useRef<{
    resolve: () => void;
    reject: (error?: unknown) => void;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  const form = useForm<HandbookFormState>({
    values: formState,
  });

  const { setError, clearErrors } = form;

  // Đồng bộ hóa lỗi từ props vào react-hook-form
  useEffect(() => {
    clearErrors();
    Object.entries(errors).forEach(([key, message]) => {
      if (message) {
        setError(key as keyof HandbookFormState, {
          type: 'manual',
          message,
        });
      }
    });
  }, [errors, setError, clearErrors]);

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ title: event.target.value });
    },
    [onFormPatch],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      onFormPatch({ category: value });
    },
    [onFormPatch],
  );

  const handleCategoryKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ categoryKey: event.target.value });
    },
    [onFormPatch],
  );

  const handleRolesChange = useCallback(
    (value: string[]) => {
      onFormPatch({ roles: value });
    },
    [onFormPatch],
  );

  const handleDriveLinkChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ driveLink: event.target.value });
    },
    [onFormPatch],
  );

  const handleSummaryChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onFormPatch({ summary: event.target.value });
    },
    [onFormPatch],
  );

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onFormPatch({ content: html });
      form.setValue('content', html);
    }
  }, [onFormPatch, form]);

  const runEditorCommand = useCallback((command: string, value = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleEditorInput();
    }
  }, [handleEditorInput]);

  useEffect(() => {
    if (isOpen) {
      if (!editorInitialized && editorRef.current) {
        editorRef.current.innerHTML = formState.content || '';
        setEditorInitialized(true);
      }
    } else {
      setEditorInitialized(false);
    }
  }, [isOpen, editorInitialized, formState.content]);

  const handleRequiredReadChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ requiredRead: event.target.checked });
    },
    [onFormPatch],
  );

  const handleUpdatedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFormPatch({ isUpdated: event.target.checked });
    },
    [onFormPatch],
  );

  const handleOpenImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageSelection = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = '';
      if (!selectedFiles.length) {
        return;
      }
      const urls = await onUploadImages(selectedFiles);
      if (urls && urls.length > 0) {
        if (editorRef.current) {
          editorRef.current.focus();
          urls.forEach((url) => {
            const imgHtml = `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh tài liệu" />`;
            document.execCommand('insertHTML', false, imgHtml);
          });
          handleEditorInput();
        }
      }
    },
    [onUploadImages, handleEditorInput],
  );

  const handleAddCategoryRequest = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return Promise.reject(new Error('EMPTY_CATEGORY_NAME'));
    }

    setPendingCategoryName(trimmedName);
    setIsCategoryMetaOpen(true);

    return new Promise<void>((resolve, reject) => {
      pendingCategoryResolver.current = { resolve, reject };
    });
  }, []);

  const handleConfirmCategoryMeta = useCallback(async (payload: HandbookCategoryRequestType) => {
    await onAddCategory(payload);
    pendingCategoryResolver.current?.resolve();
    pendingCategoryResolver.current = null;
    setIsCategoryMetaOpen(false);
    setPendingCategoryName('');
  }, [onAddCategory]);

  const handleCancelCategoryMeta = useCallback(() => {
    pendingCategoryResolver.current?.reject(new Error('CATEGORY_CREATE_CANCELLED'));
    pendingCategoryResolver.current = null;
    setIsCategoryMetaOpen(false);
    setPendingCategoryName('');
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSave();
    },
    [onSave],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <Form {...form}>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-red-50 text-[#C21A1A] rounded-xl border border-red-100">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {editingDocId ? 'CẬP NHẬT TÀI LIỆU VẬN HÀNH' : 'THÊM TÀI LIỆU VẬN HÀNH'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Soạn thảo tài liệu chuẩn SOP Lite với bộ công cụ Word
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onClose}
              className="rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus:outline-hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1.5 scrollbar-thin text-left">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">TÊN TÀI LIỆU *</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                        errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                      {...field}
                      onChange={handleTitleChange}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">DANH MỤC TÀI LIỆU *</FormLabel>
                  <FormControl>
                    <CreatableCombobox
                      value={field.value}
                      onValueChange={handleCategoryChange}
                      options={categoryOptions}
                      onAddNew={canManageCategories ? handleAddCategoryRequest : undefined}
                      onDeleteOption={canManageCategories ? onDeleteCategory : undefined}
                      placeholder="Chọn hoặc nhập danh mục"
                      emptyHint="Gõ để tìm hoặc thêm danh mục mới"
                      addNewText="Thêm danh mục"
                      containerClassName={`h-9 rounded-xl ${errors.category ? 'border-rose-400 bg-rose-50/30' : ''}`}
                      className="text-xs"
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                </FormItem>
              )}
            />
          </div>

          <div className="w-full">
            <FormField
              control={form.control}
              name="driveLink"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      ĐỊA CHỈ TÀI LIỆU GỐC (GOOGLE DRIVE / ONEDRIVE)
                    </FormLabel>
                    {field.value && /^https?:\/\/\S+$/i.test(field.value) && (
                      <a
                        href={field.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase tracking-wider text-[#C21A1A] hover:underline flex items-center gap-0.5"
                        title={field.value}
                      >
                        <span>Liên kết xem thêm</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <FormControl>
                    <input
                      type="text"
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                        errors.driveLink ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                      {...field}
                      onChange={handleDriveLinkChange}
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    Kho tài liệu gốc chứa văn bản có mộc và biểu mẫu đầy đủ trên mây.
                  </p>
                </FormItem>
              )}
            />
          </div>

          <div className="w-full">
            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem className="grid gap-0">
                  <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    VAI TRÒ ÁP DỤNG
                  </FormLabel>
                  <FormControl>
                    <CustomMultiSelect
                      options={rolesOptions}
                      selected={field.value || []}
                      onChange={(selected) => {
                        handleRolesChange(selected);
                        form.setValue('roles', selected);
                      }}
                      placeholder="Chọn vai trò áp dụng (mặc định tất cả)..."
                      searchPlaceholder="Tìm vai trò..."
                      className="text-xs"
                    />
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    Tài liệu này sẽ được lọc hiển thị cho các vai trò được chọn.
                  </p>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormLabel className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">TÓM TẮT NGẮN (HIỂN THỊ NGOÀI THẺ DANH SÁCH)</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A] ${
                      errors.summary ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    {...field}
                    onChange={handleSummaryChange}
                  />
                </FormControl>
                <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormLabel className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  NỘI DUNG TÀI LIỆU CHI TIẾT (SOẠN THẢO VĂN BẢN THOẢI MÁI)
                </FormLabel>
                
                {/* Rich Text Editor Container */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  
                  {/* Rich Text Editor Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 p-2 select-none">
                    
                    {/* Text styles */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => runEditorCommand('bold')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Chữ đậm"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('italic')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Chữ nghiêng"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('underline')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Gạch chân"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Paragraph sizes */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => runEditorCommand('formatBlock', '<p>')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer text-[10px] font-black"
                        title="Đoạn văn thường (Paragraph)"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('formatBlock', '<h3>')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer text-[10px] font-bold"
                        title="Tiêu đề lớn (Heading 3)"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('formatBlock', '<h4>')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer text-[10px] font-bold"
                        title="Tiêu đề phụ (Heading 4)"
                      >
                        H4
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => runEditorCommand('insertUnorderedList')}
                        className="p-1 hover:bg-slate-100 text-slate-855 rounded transition-colors cursor-pointer"
                        title="Danh sách dấu tròn"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('insertOrderedList')}
                        className="p-1 hover:bg-slate-100 text-slate-855 rounded transition-colors cursor-pointer"
                        title="Danh sách số"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alignments */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => runEditorCommand('justifyLeft')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Căn lề trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('justifyCenter')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Căn lề giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('justifyRight')}
                        className="p-1 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Căn lề phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Text Colors */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs h-[26px]">
                      <span className="text-[9px] text-slate-400 font-black uppercase select-none mr-0.5">Màu:</span>
                      <button
                        type="button"
                        onClick={() => runEditorCommand('foreColor', '#C21A1A')}
                        className="w-3.5 h-3.5 rounded-full bg-[#C21A1A] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu đỏ thương hiệu"
                      />
                      <button
                        type="button"
                        onClick={() => runEditorCommand('foreColor', '#1E40AF')}
                        className="w-3.5 h-3.5 rounded-full bg-[#1E40AF] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xanh lam"
                      />
                      <button
                        type="button"
                        onClick={() => runEditorCommand('foreColor', '#10B981')}
                        className="w-3.5 h-3.5 rounded-full bg-[#10B981] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xanh lá"
                      />
                      <button
                        type="button"
                        onClick={() => runEditorCommand('foreColor', '#F59E0B')}
                        className="w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu vàng"
                      />
                      <button
                        type="button"
                        onClick={() => runEditorCommand('foreColor', '#1E293B')}
                        className="w-3.5 h-3.5 rounded-full bg-[#1E293B] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xám đen gốc"
                      />
                    </div>

                    {/* Media upload */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingImages}
                        onClick={handleOpenImagePicker}
                        className="h-[26px] bg-white border border-[#C21A1A]/30 text-[#C21A1A] hover:bg-rose-50 hover:border-[#C21A1A]/60 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer px-2.5 py-0"
                      >
                        {isUploadingImages ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3 h-3" />
                            <span>Upload Ảnh</span>
                          </>
                        )}
                      </Button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Nhập địa chỉ URL của ảnh:");
                          if (url) {
                            runEditorCommand('insertHTML', `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh liên kết" />`);
                          }
                        }}
                        className="h-[26px] bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer px-2.5 py-1.5 shadow-2xs"
                        title="Dán link ảnh"
                      >
                        🔗 Dán link ảnh
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Nhập đường dẫn liên kết URL:", "https://");
                          if (url) {
                            runEditorCommand('createLink', url);
                          }
                        }}
                        className="h-[26px] bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-750 hover:border-purple-200 rounded-lg text-slate-700 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer px-2.5 py-1.5 shadow-2xs"
                        title="Thêm link chữ"
                      >
                        <LinkIcon className="w-3 h-3 text-purple-600" />
                        <span>Thêm Link chữ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => runEditorCommand('insertHorizontalRule')}
                        className="h-[26px] bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-black transition-all cursor-pointer px-2 py-1.5 shadow-2xs"
                        title="Chèn đường kẻ ngang"
                      >
                        Kẻ ngang [––]
                      </button>

                      <button
                        type="button"
                        onClick={() => runEditorCommand('removeFormat')}
                        className="h-[26px] bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-705 hover:border-amber-300 rounded-lg text-slate-400 text-[10px] font-black transition-all cursor-pointer px-2 py-1.5 shadow-2xs"
                        title="Xóa định dạng"
                      >
                        Xóa định dạng x
                      </button>
                    </div>

                  </div>

                  {/* HTML Content Editable Editor Area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onBlur={handleEditorInput}
                    className="min-h-[300px] max-h-[450px] p-4 bg-white text-slate-800 text-xs font-semibold focus:outline-none overflow-y-auto leading-relaxed text-left select-text rounded-b-xl
                              [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
                              [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-100 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
                              [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                              [&_p]:mb-2 [&_p]:leading-relaxed
                              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                              [&_li]:text-xs [&_li]:text-slate-700
                              [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150
                              [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3
                              [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
                    {...({ placeholder: "Nhập nội dung tài liệu chi tiết..." } as any)}
                  />

                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                  Bôi đen các từ ngữ bất kỳ để áp dụng nhanh định dạng Bold/Underline hoặc các nút màu trên thanh công cụ.
                </p>
                <FormMessage className="mt-1 text-[10px] font-semibold text-rose-600" />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelection}
                  className="hidden"
                />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-center gap-4">
            <FormField
              control={form.control}
              name="requiredRead"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={handleRequiredReadChange}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-700 cursor-pointer select-none">
                    Bắt buộc đọc
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isUpdated"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={handleUpdatedChange}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-700 cursor-pointer select-none">
                    Đánh dấu mới cập nhật
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Hủy bỏ
            </Button>

            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#C21A1A] px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#A81515] disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{editingDocId ? 'LƯU THAY ĐỔI' : 'LƯU TÀI LIỆU'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      <CategoryCreateMetaDialog
        open={isCategoryMetaOpen}
        name={pendingCategoryName}
        onConfirm={handleConfirmCategoryMeta}
        onCancel={handleCancelCategoryMeta}
      />
    </div>
  );
}
