import React, { useCallback, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, X, Edit2 } from 'lucide-react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { TimeSelect } from '@/src/components/custom/time-select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../../share/ui/table';
import { checklistFormSchema, type ChecklistFormValues } from '../_hook/use-checklist-dialog';

interface ChecklistTaskRowProps {
  index: number;
  control: any;
  showTimeLimit: boolean;
  canRemove: boolean;
  onRemove: (index: number) => void;
}

const ChecklistTaskRow = React.memo(function ChecklistTaskRow({
  index,
  control,
  showTimeLimit,
  canRemove,
  onRemove,
}: ChecklistTaskRowProps) {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <TableRow className="animate-in fade-in duration-100 !border-b last:!border-b-0">
      <TableCell className="!bg-white !px-3 !py-1.5 text-center">
        <span className="text-slate-400 text-xs font-mono font-bold">{index + 1}</span>
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
                  placeholder="VD: Dọn sạch quầy, Kiểm két..."
                  style={{ minHeight: 32 }}
                  className="w-full py-1.5 resize-none overflow-hidden bg-transparent border-0 focus:ring-0 focus:outline-none font-medium text-sm leading-normal placeholder:text-slate-300"
                />
              </FormControl>
              <FormMessage className="text-[11px] mt-0.5" />
            </FormItem>
          )}
        />
      </TableCell>
      {showTimeLimit && (
        <TableCell className="!bg-white !px-2 !py-1.5 text-center">
          <FormField
            control={control}
            name={`tasks.${index}.timeLimit`}
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormControl>
                  <TimeSelect
                    value={field.value}
                    onChangeValue={field.onChange}
                  />
                </FormControl>
                <FormMessage className="text-[11px] mt-0.5" />
              </FormItem>
            )}
          />
        </TableCell>
      )}
      <TableCell className="!bg-white !px-1.5 !py-1.5 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRemove}
          disabled={!canRemove}
          className={`rounded-lg ${
            !canRemove
              ? 'text-slate-200'
              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
          }`}
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
  subTab: 'today' | 'process' | 'completed';
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
  subTab,
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
      categoryId: '',
      tasks: [{ title: '', timeLimit: '08:00' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  // Reset form values when initialValues updates
  useEffect(() => {
    if (isOpen && initialValues) {
      form.reset(initialValues);
    }
  }, [isOpen, initialValues, form]);

  const handleRemoveRow = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  const handleAddRow = useCallback(() => {
    append({ title: '', timeLimit: '08:00' });
  }, [append]);

  const onSubmitHandler = useCallback(async (values: ChecklistFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      // API error handled by parent dialogError state
    }
  }, [onSubmit]);

  if (!isOpen) {
    return null;
  }

  // Determine if timeLimit column should be visible (only for daily checklist)
  const showTimeLimit = subTab === 'today';
  const canRemove = fields.length > 1;

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
        <div className="bg-white rounded-2xl p-0 w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200/80 relative overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                {isEditMode ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span>
                {isEditMode 
                  ? (subTab === 'process' ? 'Chỉnh sửa quy trình' : 'Chỉnh sửa checklist') 
                  : (subTab === 'process' ? 'Thêm quy trình mới' : 'Thêm checklist mới')
                }
              </span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </DialogClose>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmitHandler)} className="flex-1 overflow-y-auto flex flex-col">
              <div className="px-5 py-4 space-y-4">
                {/* Error Banner */}
                {dialogError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-rose-700 animate-in slide-in-from-top-2 duration-150 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="font-semibold leading-normal">{dialogError}</p>
                  </div>
                )}

                {/* Role & Category Name - side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="roleCode"
                    render={({ field }) => (
                      <FormItem className="grid gap-0">
                        <FormLabel isRequired className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
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
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg cursor-pointer transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem className="grid gap-0">
                        <FormLabel isRequired className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                          Nhóm công việc
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="VD: Ca sáng, Bếp, Kho..."
                            clearable={false}
                            {...field}
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Task Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Danh sách công việc
                    </FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold h-7 px-2"
                    >
                      <Plus className="size-3 stroke-[2.5]" />
                      <span>Thêm dòng</span>
                    </Button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="!border-b-0">
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3 w-10 text-center">
                              #
                            </TableHead>
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3">
                              Nội dung công việc
                            </TableHead>
                            {showTimeLimit && (
                              <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-3 w-28 text-center">
                                Giờ quy định
                              </TableHead>
                            )}
                            <TableHead className="!bg-slate-100 !text-slate-500 !font-bold !text-[11px] !uppercase !tracking-wider !h-8 !px-2 w-10 text-center">
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((fieldItem, index) => (
                            <ChecklistTaskRow
                              key={fieldItem.id}
                              index={index}
                              control={form.control}
                              showTimeLimit={showTimeLimit}
                              canRemove={canRemove}
                              onRemove={handleRemoveRow}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2.5 justify-end shrink-0 bg-slate-50/40 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmittingDialog}
                  className="h-9 px-5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingDialog ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu</span>
                  )}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ChecklistCreateDialog;
