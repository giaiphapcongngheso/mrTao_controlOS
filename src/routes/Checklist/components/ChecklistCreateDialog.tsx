import React from 'react';
import { AlertTriangle, Plus, Trash2, X, Edit2 } from 'lucide-react';
import { Button, Input, Textarea } from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { Label } from '../../../../share/ui/label';
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

const parseTimeToDate = (timeStr: string) => {
  if (!timeStr) return undefined;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const formatDateToTime = (date: Date | undefined) => {
  if (!date) return '08:00';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

type DialogTask = { id?: string; title: string; timeLimit: string };

interface ChecklistCreateDialogProps {
  isOpen: boolean;
  subTab: 'today' | 'process' | 'completed';
  dialogError: string | null;
  dialogRoleCode: string;
  dialogCategoryId: string;
  dialogTasks: DialogTask[];
  roleOptions: Array<{ code: string; name: string }>;
  isSubmittingDialog: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChangeRoleCode: (value: string) => void;
  onChangeCategoryId: (value: string) => void;
  onAddTaskRow: () => void;
  onRemoveTaskRow: (index: number) => void;
  onUpdateTask: (index: number, fields: Partial<DialogTask>) => void;
  isEditMode?: boolean;
}

const ChecklistCreateDialog = React.memo(function ChecklistCreateDialog({
  isOpen,
  subTab,
  dialogError,
  dialogRoleCode,
  dialogCategoryId,
  dialogTasks,
  roleOptions,
  isSubmittingDialog,
  onClose,
  onSubmit,
  onChangeRoleCode,
  onChangeCategoryId,
  onAddTaskRow,
  onRemoveTaskRow,
  onUpdateTask,
  isEditMode = false,
}: ChecklistCreateDialogProps) {
  if (!isOpen) {
    return null;
  }

  // Determine if timeLimit column should be visible (only for daily checklist)
  const showTimeLimit = subTab === 'today';

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

          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto flex flex-col">
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
                <div>
                  <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Vai trò
                  </Label>
                  <CustomSelect
                    value={dialogRoleCode}
                    onChangeValue={(value) => onChangeRoleCode(String(value))}
                    options={roleOptions.map((role) => ({
                      label: role.name,
                      value: role.code,
                    }))}
                    clearable={false}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg cursor-pointer transition-colors"
                  />
                </div>

                <div>
                  <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nhóm công việc
                  </Label>
                  <Input
                    type="text"
                    value={dialogCategoryId}
                    onChange={(e) => onChangeCategoryId(e.target.value)}
                    placeholder="VD: Ca sáng, Bếp, Kho..."
                    required
                    clearable={false}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Task Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Danh sách công việc
                  </Label>
                  <button
                    type="button"
                    onClick={onAddTaskRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Thêm dòng</span>
                  </button>
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
                        {dialogTasks.map((task, index) => (
                          <TableRow key={index} className="animate-in fade-in duration-100 !border-b last:!border-b-0">
                            <TableCell className="!bg-white !px-3 !py-1.5 text-center">
                              <span className="text-slate-400 text-xs font-mono font-bold">{index + 1}</span>
                            </TableCell>
                            <TableCell className="!bg-white !px-2 !py-1.5">
                              <Textarea
                                rows={1}
                                value={task.title}
                                onChange={(e) => onUpdateTask(index, { title: e.target.value })}
                                placeholder="VD: Dọn sạch quầy, Kiểm két..."
                                required
                                style={{ minHeight: 32 }}
                                className="w-full py-1.5 resize-none overflow-hidden bg-transparent border-0 focus:ring-0 focus:outline-none font-medium text-sm leading-normal placeholder:text-slate-300"
                              />
                            </TableCell>
                            {showTimeLimit && (
                              <TableCell className="!bg-white !px-2 !py-1.5 text-center">
                                <TimeSelect
                                  value={task.timeLimit}
                                  onChangeValue={(time) => onUpdateTask(index, { timeLimit: time })}
                                />
                              </TableCell>
                            )}
                            <TableCell className="!bg-white !px-1.5 !py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => onRemoveTaskRow(index)}
                                disabled={dialogTasks.length <= 1}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${dialogTasks.length <= 1
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
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
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ChecklistCreateDialog;
