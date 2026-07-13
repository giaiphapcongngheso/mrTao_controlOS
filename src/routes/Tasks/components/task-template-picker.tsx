import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { TaskTemplate } from '../../../types/task-template.types';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/ui';

interface TaskTemplatePickerProps {
  templates: TaskTemplate[];
  onSelect: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate, e: React.MouseEvent) => void;
  onDelete: (template: TaskTemplate, e: React.MouseEvent) => void;
  activeTemplateId?: string | null;
  className?: string;
}

export const TaskTemplatePicker = React.memo(function TaskTemplatePicker({
  templates,
  onSelect,
  onEdit,
  onDelete,
  activeTemplateId,
  className,
}: TaskTemplatePickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
        ⚡ Mẫu công việc đã lưu
      </p>
      {templates.length === 0 ? (
        <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl p-4 text-center">
          Chưa có mẫu nào được lưu. Hãy điền thông tin rồi bấm "Lưu thành mẫu mới" ở dưới.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {templates.map((tpl) => {
            const isActive = tpl.id === activeTemplateId;
            return (
              <div
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left min-h-[52px] group relative",
                  isActive
                    ? "border-[#C21A1A] bg-red-50/30 shadow-xs"
                    : "border-slate-200 bg-slate-50 hover:bg-white hover:border-[#C21A1A]/30 hover:shadow-xs"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-12">
                  <span className="text-lg shrink-0">{tpl.icon || '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-bold transition-colors truncate",
                      isActive ? "text-[#C21A1A]" : "text-slate-700 group-hover:text-[#C21A1A]"
                    )}>
                      {tpl.name}
                    </p>
                    <p className="text-[10px] text-slate-450 font-semibold">
                      {tpl.defaultSubtasks?.length || 0} bước | {tpl.defaultDepartment}
                    </p>
                  </div>
                </div>
                
                {/* Actions overlay */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit pl-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => onEdit(tpl, e)}
                    className="w-7 h-7 p-0 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer border-none"
                    tooltip="Đổi tên mẫu"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => onDelete(tpl, e)}
                    className="w-7 h-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer border-none"
                    tooltip="Xóa mẫu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
