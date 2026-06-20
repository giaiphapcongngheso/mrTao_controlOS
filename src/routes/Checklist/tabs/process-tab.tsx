import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Info, Layers, User, Award, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';
import type { ProcessDocument, ProcessStep } from '../../../types/checklist.types';
import type { ChecklistPermissions } from '../checklist-view.types';
import ProcessContentArea from './_process-content-area';
import ProcessCreateDialog, { type ProcessDialogValues } from './_process-create-dialog';
import { ProcessDetailSheet } from './_process-detail-sheet';
import { ProcessDetailCard } from './_process-detail-card';

// Helper: create default values for process dialog
function createProcessDialogDefaults(roleCode: string): ProcessDialogValues {
  return {
    title: '',
    roleCode,
    description: '',
    iconName: 'Layers',
    colorKey: 'rose',
    steps: [{
      id: `step-${Date.now()}`,
      title: '',
      tasksText: '',
      subSteps: [],
    }],
    objective: '',
    whenToUse: '',
    responsibleRole: '',
    mandatoryControls: [''],
    attachments: [],
  };
}

// Helper: map existing process to dialog values
function mapProcessToDialogValues(process: ProcessDocument): ProcessDialogValues {
  return {
    title: process.title,
    roleCode: process.roleCode,
    description: process.description || '',
    iconName: process.iconName || 'Layers',
    colorKey: process.colorKey || 'rose',
    steps: (process.steps || []).map((step) => ({
      id: step.id,
      title: step.title,
      tasksText: (step.tasks || []).join('\n'),
      subSteps: (step.steps || []).map((subStep) => ({
        id: subStep.id,
        title: subStep.title,
        tasksText: (subStep.tasks || []).join('\n'),
      })),
    })),
    objective: process.objective || '',
    whenToUse: process.whenToUse || '',
    responsibleRole: process.responsibleRole || '',
    mandatoryControls: process.mandatoryControls || [''],
    attachments: process.attachments || [],
  };
}

interface ProcessTabProps {
  processes: ProcessDocument[];
  permissions: ChecklistPermissions;
  isLoading: boolean;
  roleOptions: Array<{ code: string; name: string }>;
  defaultRoleCode: string;
  dialogRoleCode: string;
  onCreateProcess?: (payload: {
    title: string;
    description?: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
    objective?: string;
    whenToUse?: string;
    responsibleRole?: string;
    mandatoryControls?: string[];
    attachments?: Array<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>;
  }) => Promise<void>;
  onUpdateProcess?: (id: string, updates: Partial<ProcessDocument>) => Promise<void>;
  onDeleteProcess?: (id: string) => Promise<void>;
  onResetFilters: () => void;
  isCreatingProcess?: boolean;
  onCloseCreatingProcess?: () => void;
}

const ProcessTab = React.memo(function ProcessTab({
  processes,
  permissions,
  isLoading,
  roleOptions,
  defaultRoleCode,
  dialogRoleCode,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
  onResetFilters,
  isCreatingProcess,
  onCloseCreatingProcess,
}: ProcessTabProps) {
  // Detail sheet state
  const [activeDetailProcess, setActiveDetailProcess] = useState<ProcessDocument | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Process dialog states
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processDialogInitialValues, setProcessDialogInitialValues] = useState<ProcessDialogValues | null>(null);
  const [processDialogError, setProcessDialogError] = useState<string | null>(null);
  const [processDialogEditId, setProcessDialogEditId] = useState<string | null>(null);
  const [isSubmittingProcessDialog, setIsSubmittingProcessDialog] = useState(false);

  // Compute SOP summary metrics
  const sopSummary = useMemo(() => {
    const activeCount = processes.filter((p) => (p.status || 'active') === 'active').length;
    return processes.reduce((acc, process) => {
      acc.stepCount += process.steps.length;
      acc.taskCount += process.steps.reduce((stepTotal, step) => {
        const subTaskCount = (step.steps || []).reduce((subTotal, subStep) => subTotal + (subStep.tasks?.length || 0), 0);
        return stepTotal + (step.tasks?.length || 0) + subTaskCount;
      }, 0);
      return acc;
    }, {
      processCount: processes.length,
      activeCount,
      stepCount: 0,
      taskCount: 0,
    });
  }, [processes]);

  // Compute departments/roles SOP count statistics
  const departmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    processes.forEach((p) => {
      const code = (p.roleCode || '').toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    });

    return roleOptions
      .map((role) => ({
        name: role.name,
        code: role.code,
        count: counts[role.code.toUpperCase()] || 0,
      }))
      .filter((dept) => dept.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [processes, roleOptions]);

  const handleOpenCreateDialog = useCallback(() => {
    setProcessDialogEditId(null);
    setProcessDialogError(null);
    setProcessDialogInitialValues(createProcessDialogDefaults(dialogRoleCode || defaultRoleCode));
    setIsProcessDialogOpen(true);
  }, [defaultRoleCode, dialogRoleCode]);

  useEffect(() => {
    if (isCreatingProcess) {
      handleOpenCreateDialog();
      onCloseCreatingProcess?.();
    }
  }, [isCreatingProcess, handleOpenCreateDialog, onCloseCreatingProcess]);

  const handleOpenEditProcessDialog = useCallback((process: ProcessDocument) => {
    setProcessDialogEditId(process.id);
    setProcessDialogError(null);
    setProcessDialogInitialValues(mapProcessToDialogValues(process));
    setIsProcessDialogOpen(true);
  }, []);

  const handleCloseProcessDialog = useCallback(() => {
    setIsProcessDialogOpen(false);
    setProcessDialogError(null);
    setProcessDialogEditId(null);
  }, []);

  const handleSubmitProcessDialog = useCallback(async (payload: {
    title: string;
    roleCode: string;
    description?: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
    objective?: string;
    whenToUse?: string;
    responsibleRole?: string;
    mandatoryControls?: string[];
    attachments?: Array<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>;
  }) => {
    setProcessDialogError(null);
    setIsSubmittingProcessDialog(true);

    try {
      if (processDialogEditId) {
        await onUpdateProcess?.(processDialogEditId, payload);
      } else {
        await onCreateProcess?.(payload);
      }
      handleCloseProcessDialog();
    } catch (error: any) {
      setProcessDialogError(error?.message || 'Không thể lưu quy trình. Vui lòng thử lại.');
      throw error;
    } finally {
      setIsSubmittingProcessDialog(false);
    }
  }, [handleCloseProcessDialog, onCreateProcess, onUpdateProcess, processDialogEditId]);

  const handleOpenDetail = useCallback((process: ProcessDocument) => {
    setActiveDetailProcess(process);
  }, []);

  const handleOnCloseDetail = useCallback(() => {
    setActiveDetailProcess(null);
  }, []);

  const handleOnEditFromSheet = useCallback(() => {
    if (activeDetailProcess) {
      handleOpenEditProcessDialog(activeDetailProcess);
      setActiveDetailProcess(null);
    }
  }, [activeDetailProcess, handleOpenEditProcessDialog]);

  const handleOnDeleteFromSheet = useCallback(async () => {
    if (activeDetailProcess && onDeleteProcess) {
      if (confirm(`Bạn có chắc chắn muốn xóa quy trình "${activeDetailProcess.title}"?`)) {
        await onDeleteProcess(activeDetailProcess.id);
        setActiveDetailProcess(null);
      }
    }
  }, [activeDetailProcess, onDeleteProcess]);

  const handleDeleteProcess = useCallback(async (id: string) => {
    await onDeleteProcess?.(id);
  }, [onDeleteProcess]);

  const showDetailPane = !isMobile && activeDetailProcess !== null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 items-start">
        {/* Cột 1: Danh sách quy trình */}
        <div className={cn("w-full min-w-0 transition-all duration-300", showDetailPane ? "lg:col-span-4" : "lg:col-span-8")}>
          <ProcessContentArea
            processes={processes}
            roleOptions={roleOptions}
            isLoading={isLoading}
            canCreate={permissions.canCreate}
            canUpdate={permissions.canUpdate}
            canDelete={permissions.canDelete}
            onOpenCreateDialog={handleOpenCreateDialog}
            onOpenEditDialog={handleOpenEditProcessDialog}
            onDeleteProcess={handleDeleteProcess}
            onResetFilters={onResetFilters}
            onOpenDetail={handleOpenDetail}
          />
        </div>

        {/* Cột 2: Chi tiết quy trình (Chỉ hiển thị inline trên Desktop khi chọn quy trình) */}
        {showDetailPane && (
          <div className="lg:col-span-4 w-full transition-all duration-300">
            <ProcessDetailCard
              process={activeDetailProcess!}
              onClose={handleOnCloseDetail}
              onEdit={handleOnEditFromSheet}
              onDelete={handleOnDeleteFromSheet}
              canUpdate={permissions.canUpdate}
              canDelete={permissions.canDelete}
            />
          </div>
        )}

        {/* Cột 3: Tổng quan quy trình (Luôn hiển thị) */}
        <div className="lg:col-span-4 w-full space-y-3.5 text-left h-full transition-all duration-300">
          <div className="space-y-3.5">
            {/* Card 1: Dashboard Thống kê */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
              <div className="h-1 bg-gradient-to-r from-red-600 via-orange-400 to-rose-500 shrink-0" />
              <div className="p-4.5 space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-red-600" />
                  <span>Tổng quan quy trình (SOP)</span>
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-rose-50/50 border border-rose-100/40 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider block">Tổng SOP</span>
                    <span className="mt-1 block text-base font-black text-rose-700 tabular-nums">{sopSummary.processCount}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/40 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider block">Đang dùng</span>
                    <span className="mt-1 block text-base font-black text-emerald-700 tabular-nums">{sopSummary.activeCount}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/50 border border-blue-100/40 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider block">Phòng ban</span>
                    <span className="mt-1 block text-base font-black text-blue-700 tabular-nums">{departmentStats.length}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Nhóm Nghiệp Vụ */}
            {departmentStats.length > 0 && (
              <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
                <div className="p-4.5 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-500" />
                    <span>Theo nhóm nghiệp vụ</span>
                  </h3>
                  <div className="divide-y divide-slate-100/75">
                    {departmentStats.map((dept) => (
                      <div key={dept.code} className="py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#C21A1A]/85 shrink-0" />
                          <span className="truncate">{dept.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-250/30 text-[10px] font-black text-slate-500 tabular-nums">
                          {dept.count} SOP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Card 3: SOP Nguyên tắc */}
            <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
              <div className="p-4.5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Info className="w-4.5 h-4.5 text-slate-400" />
                  <span>Nguyên tắc SOP vận hành</span>
                </h4>
                <ul className="text-xs font-semibold text-slate-500 leading-relaxed pl-3.5 list-disc space-y-2 text-left">
                  <li><strong className="text-slate-700">Đúng quy trình - Đúng chuẩn:</strong> Mở ra là làm đúng, làm nhanh, làm đồng nhất mọi showroom.</li>
                  <li><strong className="text-slate-700">Dễ hiểu - Dễ nhớ - Dễ làm:</strong> Trực quan hóa các bước thực hiện, phân chia rõ ràng trách nhiệm.</li>
                  <li><strong className="text-slate-700">Kiểm soát chặt chẽ:</strong> Tuân thủ tuyệt đối các điểm kiểm soát bắt buộc và biểu mẫu liên quan.</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Process Details Sheet - Triggered only on Mobile */}
      <ProcessDetailSheet
        process={activeDetailProcess}
        isOpen={isMobile && activeDetailProcess !== null}
        onClose={handleOnCloseDetail}
        onEdit={handleOnEditFromSheet}
        onDelete={handleOnDeleteFromSheet}
        canUpdate={permissions.canUpdate}
        canDelete={permissions.canDelete}
      />

      {/* Process Create/Edit Dialog */}
      <ProcessCreateDialog
        isOpen={isProcessDialogOpen}
        roleOptions={roleOptions}
        initialValues={processDialogInitialValues}
        isSubmitting={isSubmittingProcessDialog}
        errorMessage={processDialogError}
        isEditMode={processDialogEditId !== null}
        onClose={handleCloseProcessDialog}
        onSubmit={handleSubmitProcessDialog}
      />
    </>
  );
});

export default ProcessTab;
