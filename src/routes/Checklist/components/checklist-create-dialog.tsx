import React, { useCallback, useEffect, useMemo } from 'react';
import { AlertTriangle, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Label,
} from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { SheetFooter } from '../../../../share/ui/sheet';
import { cn } from '../../../../share/lib/utils';
import { TimeSelect } from '@/src/components/custom/time-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../share/ui/table';
import {
  CHECKLIST_COLOR_META,
  CHECKLIST_ICON_OPTIONS,
  getChecklistColorMeta,
  resolveChecklistIcon,
} from '../checklist-meta';
import { checklistFormSchema, type ChecklistFormValues } from '../_hook/use-checklist-dialog';

interface ChecklistTaskRowProps {
  index: number;
  control: any;
  canRemove: boolean;
  onRemove: (index: number) => void;
}

const ChecklistTaskRow = React.memo(function ChecklistTaskRow({
  index,
  control,
  canRemove,
  onRemove,
}: ChecklistTaskRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <TableRow className="animate-in fade-in duration-100 !border-b last:!border-b-0">
      <TableCell className="!bg-white !px-3 !py-1.5 text-center">
        <span className="text-slate-400 text-xs font-sans font-bold">{index + 1}</span>
      </TableCell>
      <TableCell className="!bg-white !px-2 !py-1.5">
        <FormField
          control={control}
          name={`tasks.${index}.title`}
          render={({ field }) => (
            <FormItem className="grid gap-0">
              <FormControl>
                <Textarea
                  {...field}
                  rows={1}
                  placeholder="VD: Dọn sạch quầy, kiểm két, báo cáo..."
                  style={{ minHeight: 32 }}
                  className="font-sans w-full py-1.5 resize-none overflow-hidden bg-transparent border-0 focus:ring-0 focus:outline-none font-medium text-sm leading-normal placeholder:text-slate-300"
                />
              </FormControl>
              <FormMessage className="text-[11px] mt-0.5" />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="!bg-white !px-2 !py-1.5 text-center">
        <FormField
          control={control}
          name={`tasks.${index}.timeLimit`}
          render={({ field }) => (
            <FormItem className="grid gap-0">
              <FormControl>
                <TimeSelect value={field.value} onChangeValue={field.onChange} />
              </FormControl>
              <FormMessage className="text-[11px] mt-0.5" />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="!bg-white !px-1.5 !py-1.5 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemove}
          disabled={!canRemove}
          className={!canRemove ? 'rounded-lg text-slate-200' : 'rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50'}
          title="Xóa dòng"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

interface ChecklistCreateDialogProps {
  isOpen: boolean;
  initialValues: ChecklistFormValues | null;
  roleOptions: Array<{ code: string; name: string }>;
  isSubmittingDialog: boolean;
  dialogError: string | null;
  onClose: () => void;
  onSubmit: (values: ChecklistFormValues) => Promise<void>;
  isEditMode?: boolean;
}

const ChecklistCreateDialog = React.memo(function ChecklistCreateDialog({
  isOpen,
  initialValues,
  roleOptions,
  isSubmittingDialog,
  dialogError,
  onClose,
  onSubmit,
  isEditMode = false,
}: ChecklistCreateDialogProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      roleCode: '',
      title: '',
      iconName: 'Layers',
      colorKey: 'rose',
      tasks: [{ title: '', timeLimit: '08:00' }],
    },
  });

  const selectedColorKey = form.watch('colorKey');
  const selectedIconName = form.watch('iconName');
  const previewColor = useMemo(() => getChecklistColorMeta(selectedColorKey), [selectedColorKey]);
  const PreviewIcon = useMemo(() => resolveChecklistIcon(selectedIconName), [selectedIconName]);

  const [isMetaDialogOpen, setIsMetaDialogOpen] = React.useState(false);
  const [tempIconName, setTempIconName] = React.useState('Layers');
  const [tempColorKey, setTempColorKey] = React.useState('rose');

  const handleOpenMetaDialog = useCallback(() => {
    setTempIconName(form.getValues('iconName') || 'Layers');
    setTempColorKey(form.getValues('colorKey') || 'rose');
    setIsMetaDialogOpen(true);
  }, [form]);

  const handleSaveMeta = useCallback(() => {
    form.setValue('iconName', tempIconName, { shouldDirty: true, shouldValidate: true });
    form.setValue('colorKey', tempColorKey, { shouldDirty: true, shouldValidate: true });
    setIsMetaDialogOpen(false);
  }, [form, tempIconName, tempColorKey]);

  const tempColorMeta = useMemo(() => getChecklistColorMeta(tempColorKey), [tempColorKey]);
  const TempPreviewIcon = useMemo(() => resolveChecklistIcon(tempIconName), [tempIconName]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  useEffect(() => {
    if (isOpen && initialValues) {
      form.reset(initialValues);
    }
  }, [form, initialValues, isOpen]);

  const handleRemoveRow = useCallback((index: number) => remove(index), [remove]);
  const handleAddRow = useCallback(() => append({ title: '', timeLimit: '08:00' }), [append]);
  const onSubmitHandler = useCallback(async (values: ChecklistFormValues) => {
    try {
      await onSubmit(values);
    } catch {
      // handled upstream
    }
  }, [onSubmit]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-4 !border-0 !bg-transparent !shadow-none flex items-center justify-center"
      >
        <div className="font-sans w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                {isEditMode ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
              </span>
              <span>{isEditMode ? 'Chỉnh sửa checklist mẫu' : 'Thêm checklist mẫu mới'}</span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </DialogClose>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmitHandler)} className="flex-1 overflow-y-auto flex flex-col">
              <div className="px-6 py-5 space-y-5">
                {dialogError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-2 text-rose-700 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="font-semibold leading-normal">{dialogError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[128px_1fr] gap-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleOpenMetaDialog}
                    title="Cấu hình icon và màu checklist"
                    className="h-auto rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none outline-none border border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:ring-offset-2"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", previewColor.iconBg)}>
                      <PreviewIcon className={cn("w-5.5 h-5.5", previewColor.iconColor)} />
                    </div>
                    <p className="mt-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Preview</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500 leading-relaxed max-w-[100px] truncate">
                      {form.watch('title') || 'Nhóm checklist'}
                    </p>
                  </Button>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="roleCode"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Vai trò
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={roleOptions.map((role) => ({
                                  label: role.name,
                                  value: role.code,
                                }))}
                                clearable={false}
                                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Tên nhóm
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="VD: Ca sáng, chốt ca, kiểm kho..."
                                clearable={false}
                                {...field}
                                className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      Danh sách công việc
                    </FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold h-8 px-2.5 rounded-xl"
                    >
                      <Plus className="size-3.5 stroke-[2.5]" />
                      <span>Thêm dòng</span>
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="!border-b-0">
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3 w-10 text-center">#</TableHead>
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3">Nội dung công việc</TableHead>
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3 w-28 text-center">Giờ quy định</TableHead>
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-2 w-10 text-center" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((fieldItem, index) => (
                            <ChecklistTaskRow
                              key={fieldItem.id}
                              index={index}
                              control={form.control}
                              canRemove={fields.length > 1}
                              onRemove={handleRemoveRow}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-2.5 justify-end shrink-0 bg-slate-50/50 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-10 px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmittingDialog}
                  className="h-10 px-5 text-sm font-bold text-white bg-[#C21A1A] hover:bg-[#A81515] rounded-xl shadow-sm uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingDialog ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo checklist'}</span>
                  )}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </DialogContent>

      <Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-lg p-5 rounded-[22px] bg-white border border-slate-200 shadow-2xl text-left font-sans">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                Cấu hình hiển thị nhóm checklist
              </DialogTitle>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Chọn icon và màu sắc đặc trưng cho nhóm checklist
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setIsMetaDialogOpen(false)}
              className="rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[130px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl border", tempColorMeta.iconBg)}>
                <TempPreviewIcon className={cn("h-7 w-7", tempColorMeta.iconColor)} />
              </div>
              <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Preview
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Icon hiển thị
                </Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {CHECKLIST_ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = tempIconName === option.name;
                    return (
                      <Button
                        key={option.name}
                        type="button"
                        variant="ghost"
                        onClick={() => setTempIconName(option.name)}
                        title={option.label}
                        className={cn(
                          "h-11 rounded-xl border p-0 flex flex-col items-center justify-center gap-0.5 focus:outline-none",
                          isSelected
                            ? "border-[#C21A1A] bg-rose-50 text-[#C21A1A]"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold leading-none">{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Màu giao diện
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {Object.entries(CHECKLIST_COLOR_META).map(([key, meta]) => {
                    const isSelected = tempColorKey === key;
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        onClick={() => setTempColorKey(key)}
                        title={meta.label}
                        className={cn(
                          "h-10 rounded-xl border p-0 focus:outline-none",
                          isSelected ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200",
                          meta.filterIdleClass
                        )}
                      >
                        <span className="w-3 h-3 rounded-full bg-current" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-5 flex flex-row justify-end gap-2 border-t border-slate-100 pt-3 p-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsMetaDialogOpen(false)}
              className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50 focus:outline-none"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSaveMeta}
              className="rounded-xl bg-[#C21A1A] px-4 py-2 text-xs font-black text-white transition-colors hover:bg-[#A81515] focus:outline-none"
            >
              Lưu cấu hình
            </Button>
          </SheetFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
});

export default ChecklistCreateDialog;
