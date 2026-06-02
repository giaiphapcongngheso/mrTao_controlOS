import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Layers,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button, Card, ScrollArea } from '../../../../share/ui';
import { DeleteConfirm } from '../../../../share/components/delete-confirm';
import type { ProcessDocument } from '../../../types/checklist.types';
import { cn } from '../../../../share/lib/utils';
import { getChecklistColorMeta, resolveChecklistIcon } from '../checklist-meta';

interface ProcessContentAreaProps {
  processes: ProcessDocument[];
  isLoading?: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (process: ProcessDocument) => void;
  onDeleteProcess: (id: string) => Promise<void>;
  onResetFilters: () => void;
}

const ProcessContentArea = React.memo(function ProcessContentArea({
  processes,
  isLoading = false,
  canCreate,
  canUpdate,
  canDelete,
  onOpenCreateDialog,
  onOpenEditDialog,
  onDeleteProcess,
  onResetFilters,
}: ProcessContentAreaProps) {
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<ProcessDocument | null>(null);

  const summary = React.useMemo(() => {
    return processes.reduce((acc, process) => {
      acc.processCount += 1;
      acc.stepCount += process.steps.length;
      acc.taskCount += process.steps.reduce((stepTotal, step) => {
        const subTaskCount = (step.steps || []).reduce((subTotal, subStep) => subTotal + (subStep.tasks?.length || 0), 0);
        return stepTotal + (step.tasks?.length || 0) + subTaskCount;
      }, 0);
      return acc;
    }, {
      processCount: 0,
      stepCount: 0,
      taskCount: 0,
    });
  }, [processes]);

  const toggleExpand = React.useCallback((processId: string) => {
    setExpandedIds((prev) => prev.includes(processId) ? prev.filter((id) => id !== processId) : [...prev, processId]);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-sans">
      <ScrollArea className="w-full lg:col-span-8 h-auto lg:h-[calc(100dvh-230px)] pr-0 lg:pr-1" viewportClassName="w-full pr-0 sm:pr-2 [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full overflow-x-hidden">
        <div className="space-y-3 pb-4">
          {isLoading ? (
            <Card className="bg-white p-10 text-center rounded-2xl border border-slate-200 gap-3 py-10 shadow-none flex flex-col items-center justify-center">
              <span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
              <p className="text-sm font-semibold text-slate-500">Đang tải quy trình...</p>
            </Card>
          ) : processes.length === 0 ? (
            <Card className="bg-white p-14 text-center rounded-2xl border border-dashed border-slate-200 gap-3 py-14 shadow-none flex flex-col items-center justify-center">
              <Layers className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-500">Không có quy trình phù hợp bộ lọc</p>
                <p className="text-xs text-slate-400 mt-1">Thử đổi vai trò, tìm kiếm khác hoặc tạo quy trình mới.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onResetFilters} className="rounded-xl">
                  Đặt lại bộ lọc
                </Button>
                {canCreate && (
                  <Button type="button" size="sm" onClick={onOpenCreateDialog} className="rounded-xl bg-[#C21A1A] hover:bg-[#A81515]">
                    <Plus className="w-4 h-4 mr-1" />
                    Tạo quy trình
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            processes.map((process) => {
              const isExpanded = expandedIds.includes(process.id);
              const colorMeta = getChecklistColorMeta(process.colorKey || 'rose');
              const ProcessIcon = resolveChecklistIcon(process.iconName || 'Layers');
              return (
                <Card key={process.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-none gap-0 py-0">
                  <div
                    onClick={() => toggleExpand(process.id)}
                    className="p-4 sm:p-5 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
                          <ProcessIcon className={cn("w-5 h-5", colorMeta.iconColor)} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black tracking-tight text-slate-800 truncate">{process.title}</h3>
                            <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", colorMeta.iconBg)}>
                              {process.roleCode}
                            </span>
                          </div>
                          {process.description && (
                            <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{process.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                            <span>{process.steps.length} bước</span>
                            <span>{process.steps.reduce((total, step) => total + (step.tasks?.length || 0), 0)} task chính</span>
                            <span>{process.steps.reduce((total, step) => total + (step.steps?.length || 0), 0)} bước nhỏ</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(event) => event.stopPropagation()}>
                        {canUpdate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Chỉnh sửa quy trình"
                            onClick={() => onOpenEditDialog(process)}
                            className="w-8 h-8 rounded-xl bg-slate-50 border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Xóa quy trình"
                            onClick={() => setDeleteTarget(process)}
                            className="w-8 h-8 rounded-xl bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-white p-4 sm:p-5 space-y-4">
                      {process.steps.map((step, stepIndex) => (
                        <div key={step.id} className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {stepIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-black text-slate-800">{step.title}</h4>
                            {(step.tasks || []).length > 0 && (
                              <ul className="mt-2 space-y-1.5">
                                {(step.tasks || []).map((task, taskIndex) => (
                                  <li key={`${step.id}-task-${taskIndex}`} className="text-sm text-slate-600 font-medium flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C21A1A] shrink-0 mt-2" />
                                    <span>{task}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {(step.steps || []).length > 0 && (
                              <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-3">
                                {(step.steps || []).map((subStep, subIndex) => (
                                  <div key={subStep.id}>
                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                      <span>Bước {stepIndex + 1}.{subIndex + 1}: {subStep.title}</span>
                                    </h5>
                                    {(subStep.tasks || []).length > 0 && (
                                      <ul className="mt-2 space-y-1.5">
                                        {(subStep.tasks || []).map((task, taskIndex) => (
                                          <li key={`${subStep.id}-task-${taskIndex}`} className="text-sm text-slate-500 font-medium flex items-start gap-2">
                                            <span className="text-slate-300 shrink-0">•</span>
                                            <span>{task}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="lg:col-span-4 space-y-3">
        <Card className="bg-white rounded-2xl border border-slate-200/80 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-none">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-blue-500" />
          <div className="p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Tổng quan quy trình
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider block">Quy trình</span>
                <span className="mt-1 block text-xl font-extrabold text-rose-700 tabular-nums">{summary.processCount}</span>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">Bước</span>
                <span className="mt-1 block text-xl font-extrabold text-blue-700 tabular-nums">{summary.stepCount}</span>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">Task</span>
                <span className="mt-1 block text-xl font-extrabold text-amber-700 tabular-nums">{summary.taskCount}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 text-left shadow-none">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Nguyên tắc</h4>
          <div className="space-y-2 text-xs text-slate-500 font-medium leading-relaxed">
            <p>Mỗi quy trình là 1 bản ghi độc lập gồm đầy đủ các bước chính và bước nhỏ.</p>
            <p>Task checklist ngày vẫn tách riêng, không dùng quy trình để hoàn thành trực tiếp.</p>
            <p>Chỉnh sửa quy trình sẽ không ảnh hưởng đến bản lưu checklist đã tạo.</p>
          </div>
        </Card>
      </div>

      <DeleteConfirm
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa quy trình"
        description={`Bạn có chắc chắn muốn xóa quy trình "${deleteTarget?.title || ''}"?`}
        confirmText="Xóa quy trình"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteProcess(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
});

export default ProcessContentArea;
