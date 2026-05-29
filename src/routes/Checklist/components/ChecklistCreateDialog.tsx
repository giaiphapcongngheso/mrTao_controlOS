import React from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { Button, Input, Textarea } from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { Label } from '../../../../share/ui/label';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import type { ChecklistCategory } from '../../../types/checklist.types';

type DialogTask = { title: string; timeLimit: string };

interface ChecklistCreateDialogProps {
  isOpen: boolean;
  dialogError: string | null;
  dialogRoleCode: string;
  dialogCategoryId: string;
  dialogChecklistName: string;
  dialogTasks: DialogTask[];
  roleOptions: Array<{ code: string; name: string }>;
  activeCategories: ChecklistCategory[];
  isSubmittingDialog: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChangeRoleCode: (value: string) => void;
  onChangeCategoryId: (value: string) => void;
  onChangeChecklistName: (value: string) => void;
  onAddTaskRow: () => void;
  onRemoveTaskRow: (index: number) => void;
  onUpdateTask: (index: number, fields: Partial<DialogTask>) => void;
}

const ChecklistCreateDialog = React.memo(function ChecklistCreateDialog({
  isOpen,
  dialogError,
  dialogRoleCode,
  dialogCategoryId,
  dialogChecklistName,
  dialogTasks,
  roleOptions,
  activeCategories,
  isSubmittingDialog,
  onClose,
  onSubmit,
  onChangeRoleCode,
  onChangeCategoryId,
  onChangeChecklistName,
  onAddTaskRow,
  onRemoveTaskRow,
  onUpdateTask,
}: ChecklistCreateDialogProps) {
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
        <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col border border-slate-200 relative gap-0">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 pt-1">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
              <span>Thêm cấu hình checklist mới</span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>

          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto pr-1 my-4 space-y-4 text-sm font-bold text-slate-700">
            {dialogError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-rose-700 animate-in slide-in-from-top-2 duration-150">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="font-bold leading-normal">{dialogError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                  Chọn vai trò
                </Label>
                <CustomSelect
                  value={dialogRoleCode}
                  onChangeValue={(value) => onChangeRoleCode(String(value))}
                  options={roleOptions.map((role) => ({
                    label: `${role.name} (${role.code})`,
                    value: role.code,
                  }))}
                  clearable={false}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer"
                />
              </div>

              <div>
                <Label className="block text-sm font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                  Chọn nhóm checklist
                </Label>
                <CustomSelect
                  value={dialogCategoryId}
                  onChangeValue={(value) => onChangeCategoryId(String(value))}
                  options={activeCategories.map((cat) => ({
                    label: cat.title,
                    value: cat.id,
                  }))}
                  clearable={false}
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-black text-slate-400 mb-1.5 uppercase tracking-wider">
                Tên bộ checklist / quy trình
              </Label>
              <Input
                type="text"
                value={dialogChecklistName}
                onChange={(e) => onChangeChecklistName(e.target.value)}
                placeholder="Ví dụ: Quy trình bàn giao ca sáng..."
                required
                clearable={false}
                className="w-full bg-slate-50 border border-slate-250 focus:outline-slate-850 focus:ring-1 focus:ring-slate-850 px-3.5 py-2.5 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black text-slate-400 uppercase tracking-wider block">
                  Danh sách công việc con
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onAddTaskRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-sm font-extrabold tracking-wide cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Thêm dòng mới</span>
                </Button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {dialogTasks.map((task, index) => (
                  <div key={index} className="w-full flex gap-2 items-center animate-in slide-in-from-bottom-2 duration-150">
                    <span className="text-slate-400 text-sm shrink-0 font-mono">#{index + 1}</span>
                    <Textarea
                      rows={1}
                      value={task.title}
                      onChange={(e) => onUpdateTask(index, { title: e.target.value })}
                      placeholder="Nhiệm vụ: VD: Dọn sạch quầy, Kiểm két..."
                      required
                      style={{ minHeight: 36 }}
                      className="flex-1 min-w-0 py-2 resize-none overflow-hidden bg-slate-50 border border-slate-250 rounded-xl px-3.5 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium text-sm leading-normal align-middle"
                    />
                    <Input
                      type="time"
                      value={task.timeLimit}
                      onChange={(e) => onUpdateTask(index, { timeLimit: e.target.value })}
                      required
                      clearable={false}
                      containerClassName="w-32"
                      className="bg-slate-50 border border-slate-250 rounded-xl px-2 py-2 focus:outline-none focus:border-slate-800 text-center font-mono font-bold"
                      title="Giờ giới hạn quy định"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onRemoveTaskRow(index)}
                      disabled={dialogTasks.length <= 1}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${dialogTasks.length <= 1
                        ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                        }`}
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-3.5 border-t border-slate-100 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isSubmittingDialog}
                className="h-10 px-6 text-sm font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/20 transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingDialog ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu cấu hình</span>
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
