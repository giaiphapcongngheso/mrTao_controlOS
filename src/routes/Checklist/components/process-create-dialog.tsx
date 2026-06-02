import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Layers, Plus, Trash2, X } from 'lucide-react';
import { Button, Input, Label, Textarea } from '../../../../share/ui';
import { Sheet, SheetContent, SheetTitle, SheetFooter } from '../../../../share/ui/sheet';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../../../../share/ui/card';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { cn } from '../../../../share/lib/utils';
import type { ProcessStep } from '../../../types/checklist.types';
import { Dialog, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import {
  CHECKLIST_COLOR_META,
  CHECKLIST_ICON_OPTIONS,
  getChecklistColorMeta,
  resolveChecklistIcon,
} from '../checklist-meta';

type EditableSubStep = {
  id: string;
  title: string;
  tasksText: string;
};

type EditableStep = {
  id: string;
  title: string;
  tasksText: string;
  subSteps: EditableSubStep[];
};

export type ProcessDialogValues = {
  title: string;
  roleCode: string;
  description: string;
  iconName?: string;
  colorKey?: string;
  steps: EditableStep[];
};

interface ProcessCreateDialogProps {
  isOpen: boolean;
  roleOptions: Array<{ code: string; name: string }>;
  initialValues: ProcessDialogValues | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  isEditMode?: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; roleCode: string; description?: string; iconName?: string; colorKey?: string; steps: ProcessStep[] }) => Promise<void>;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySubStep(): EditableSubStep {
  return {
    id: createId('sub-step'),
    title: '',
    tasksText: '',
  };
}

function createEmptyStep(): EditableStep {
  return {
    id: createId('step'),
    title: '',
    tasksText: '',
    subSteps: [],
  };
}

function mapProcessStepsToEditor(steps: ProcessStep[] = []): EditableStep[] {
  if (steps.length === 0) {
    return [createEmptyStep()];
  }

  return steps.map((step) => ({
    id: step.id,
    title: step.title,
    tasksText: (step.tasks || []).join('\n'),
    subSteps: (step.steps || []).map((subStep) => ({
      id: subStep.id,
      title: subStep.title,
      tasksText: (subStep.tasks || []).join('\n'),
    })),
  }));
}

function parseTasksText(tasksText: string): string[] | undefined {
  const tasks = tasksText
    .split('\n')
    .map((task) => task.trim())
    .filter(Boolean);

  return tasks.length > 0 ? tasks : undefined;
}

const ProcessCreateDialog = React.memo(function ProcessCreateDialog({
  isOpen,
  roleOptions,
  initialValues,
  isSubmitting,
  errorMessage,
  isEditMode = false,
  onClose,
  onSubmit,
}: ProcessCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Layers');
  const [colorKey, setColorKey] = useState('rose');

  // States for meta dialog configuration
  const [tempIconName, setTempIconName] = useState('Layers');
  const [tempColorKey, setTempColorKey] = useState('rose');
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);

  const [steps, setSteps] = useState<EditableStep[]>([createEmptyStep()]);
  const [collapsedSubSteps, setCollapsedSubSteps] = useState<Record<string, boolean>>({});
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialValues) {
      setTitle(initialValues.title);
      setRoleCode(initialValues.roleCode);
      setDescription(initialValues.description);
      setIconName(initialValues.iconName || 'Layers');
      setColorKey(initialValues.colorKey || 'rose');
      setSteps(initialValues.steps.length > 0 ? initialValues.steps : [createEmptyStep()]);
      setCollapsedSubSteps({});
      setCollapsedSteps({});
      return;
    }

    setTitle('');
    setRoleCode(roleOptions[0]?.code || '');
    setDescription('');
    setIconName('Layers');
    setColorKey('rose');
    setSteps([createEmptyStep()]);
    setCollapsedSubSteps({});
    setCollapsedSteps({});
  }, [initialValues, isOpen, roleOptions]);

  const previewColor = useMemo(() => getChecklistColorMeta(colorKey), [colorKey]);
  const PreviewIcon = useMemo(() => resolveChecklistIcon(iconName), [iconName]);

  const tempColorMeta = useMemo(() => getChecklistColorMeta(tempColorKey), [tempColorKey]);
  const TempPreviewIcon = useMemo(() => resolveChecklistIcon(tempIconName), [tempIconName]);

  const handleOpenMetaDialog = useCallback(() => {
    setTempIconName(iconName);
    setTempColorKey(colorKey);
    setIsMetaDialogOpen(true);
  }, [iconName, colorKey]);

  const handleSaveMeta = useCallback(() => {
    setIconName(tempIconName);
    setColorKey(tempColorKey);
    setIsMetaDialogOpen(false);
  }, [tempIconName, tempColorKey]);

  const previewStepCount = steps.length;
  const previewTaskCount = useMemo(() => steps.reduce((total, step) => {
    const coreTaskCount = parseTasksText(step.tasksText)?.length || 0;
    const subTaskCount = step.subSteps.reduce((subTotal, subStep) => subTotal + (parseTasksText(subStep.tasksText)?.length || 0), 0);
    return total + coreTaskCount + subTaskCount;
  }, 0), [steps]);

  const handleAddStep = useCallback(() => {
    setSteps((prev) => [...prev, createEmptyStep()]);
  }, []);

  const handleRemoveStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.length > 1 ? prev.filter((step) => step.id !== stepId) : prev);
  }, []);

  const handleChangeStep = useCallback((stepId: string, updates: Partial<EditableStep>) => {
    setSteps((prev) => prev.map((step) => step.id === stepId ? { ...step, ...updates } : step));
  }, []);

  const handleAddSubStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? { ...step, subSteps: [...step.subSteps, createEmptySubStep()] }
        : step
    )));
  }, []);

  const handleRemoveSubStep = useCallback((stepId: string, subStepId: string) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? { ...step, subSteps: step.subSteps.filter((subStep) => subStep.id !== subStepId) }
        : step
    )));
  }, []);

  const handleChangeSubStep = useCallback((
    stepId: string,
    subStepId: string,
    updates: Partial<EditableSubStep>,
  ) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? {
          ...step,
          subSteps: step.subSteps.map((subStep) => (
            subStep.id === subStepId ? { ...subStep, ...updates } : subStep
          )),
        }
        : step
    )));
  }, []);

  const toggleCollapseSubStep = useCallback((subStepId: string) => {
    setCollapsedSubSteps((prev) => ({
      ...prev,
      [subStepId]: !prev[subStepId],
    }));
  }, []);

  const toggleCollapseStep = useCallback((stepId: string) => {
    setCollapsedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = title.trim();
    if (!normalizedTitle || !roleCode.trim()) {
      return;
    }

    const normalizedSteps: ProcessStep[] = [];
    for (const [stepIndex, step] of steps.entries()) {
      const parsedSubSteps: ProcessStep[] = [];
      for (const [subIndex, subStep] of step.subSteps.entries()) {
        const subTitle = subStep.title.trim();
        const subTasks = parseTasksText(subStep.tasksText);

        if (!subTitle && !subTasks) {
          continue;
        }

        parsedSubSteps.push({
          id: subStep.id || createId(`sub-${stepIndex}-${subIndex}`),
          title: subTitle || `Bước nhỏ ${stepIndex + 1}.${subIndex + 1}`,
          tasks: subTasks,
        });
      }

      const stepTitle = step.title.trim();
      const stepTasks = parseTasksText(step.tasksText);

      if (!stepTitle && !stepTasks && parsedSubSteps.length === 0) {
        continue;
      }

      normalizedSteps.push({
        id: step.id || createId(`step-${stepIndex}`),
        title: stepTitle || `Bước ${stepIndex + 1}`,
        tasks: stepTasks,
        steps: parsedSubSteps.length > 0 ? parsedSubSteps : undefined,
      });
    }

    if (normalizedSteps.length === 0) {
      return;
    }

    await onSubmit({
      title: normalizedTitle,
      roleCode,
      description: description.trim() || undefined,
      iconName,
      colorKey,
      steps: normalizedSteps,
    });
  }, [description, onSubmit, roleCode, steps, title, iconName, colorKey]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="right"
          className="w-[70%] sm:max-w-[60%] p-0 border-l border-slate-200 bg-white shadow-2xl flex flex-col"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <SheetTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                {isEditMode ? <Edit2 className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </span>
              <span>{isEditMode ? 'Chỉnh sửa quy trình' : 'Thêm quy trình mới'}</span>
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-4.5 h-4.5" />
            </Button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]"
          >
            <div className="px-6 py-5 space-y-5">
              {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr] gap-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleOpenMetaDialog}
                  title="Cấu hình icon và màu quy trình"
                  className={cn(
                    "h-auto rounded-3xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none outline-none border focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:ring-offset-2",
                    isMetaDialogOpen
                      ? "border-blue-300 bg-blue-50/10 ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                  )}
                >
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border", previewColor.iconBg)}>
                    <PreviewIcon className={cn("w-7 h-7", previewColor.iconColor)} />
                  </div>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-900">Process</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs font-sans text-slate-900 truncate max-w-[130px]">{title || 'Quy trình mới'}</p>
                    <p className="text-[11px] font-sans text-slate-500">{previewStepCount} bước, {previewTaskCount} task</p>
                  </div>
                </Button>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-sm font-sans text-slate-900 mb-1.5">Tên quy trình</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="VD: Quy trình bàn giao ca"
                        className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-sm font-sans text-slate-900"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-sans text-slate-900 mb-1.5">Vai trò</Label>
                      <CustomSelect
                        value={roleCode}
                        onChangeValue={(value) => setRoleCode(String(value))}
                        options={roleOptions.map((role) => ({
                          label: role.name,
                          value: role.code,
                        }))}
                        clearable={false}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-sans text-slate-900 mb-1.5">Mô tả ngắn</Label>
                    <Textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tóm tắt mục tiêu và cách vận hành của quy trình..."
                      className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-sm font-sans resize-none text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Danh sách các bước</h4>
                    <p className="text-xs text-slate-400 font-sans mt-1">Mỗi bước có thể có task riêng và nhiều bước nhỏ bên trong.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1.5 rounded-xl text-xs font-sans text-[#C21A1A] hover:bg-rose-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm bước</span>
                  </Button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
                  {steps.map((step, index) => {
                    const isStepCollapsed = !!collapsedSteps[step.id];
                    return (
                      <Card key={step.id} className="p-0 gap-0 bg-slate-50/50 rounded-3xl border border-slate-200 shadow-none flex flex-col overflow-hidden">
                        <CardHeader
                          className="px-4 py-3 relative cursor-pointer hover:bg-slate-100/50 transition-colors rounded-t-3xl items-center"
                          onClick={() => toggleCollapseStep(step.id)}
                        >
                          <CardTitle className="text-sm font-bold text-slate-900 pr-20 leading-tight">
                            Bước {index + 1}: {step.title || '(Chưa đặt tên)'}
                          </CardTitle>
                          <CardAction className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => toggleCollapseStep(step.id)}
                              className="h-8 w-8 p-1.5 hover:bg-slate-200/50 rounded-xl text-slate-500 hover:text-slate-700 flex items-center justify-center"
                            >
                              {isStepCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </Button>
                            {steps.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleRemoveStep(step.id)}
                                className="h-8 w-8 p-1.5 hover:bg-rose-100/50 rounded-xl text-slate-400 hover:text-rose-600 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </CardAction>
                        </CardHeader>

                        <div className={cn(
                          "transition-all duration-300 ease-in-out overflow-hidden",
                          isStepCollapsed ? "max-h-0 opacity-0" : "max-h-[1500px] opacity-100"
                        )}>
                          <CardContent className="px-4 pt-0 pb-4 space-y-4">
                            <div>
                              <Label className="block text-sm font-sans text-slate-900 mb-1.5">Tên bước</Label>
                              <Input
                                value={step.title}
                                onChange={(e) => handleChangeStep(step.id, { title: e.target.value })}
                                placeholder="VD: Chốt quỹ, kiểm tra kho, báo cáo giao ca..."
                                className="font-sans w-full rounded-xl border-slate-200 bg-white text-sm font-sans text-slate-900"
                              />
                            </div>

                            <div>
                              <Label className="block text-sm font-sans text-slate-900 mb-1.5">Task trong bước này</Label>
                              <Textarea
                                rows={1}
                                value={step.tasksText}
                                onChange={(e) => handleChangeStep(step.id, { tasksText: e.target.value })}
                                placeholder={'Mỗi task một dòng, VD: Kiểm đếm tiền mặt,Đối soát POS'}
                                className="font-sans w-full rounded-xl border-slate-200 bg-white text-sm font-sans resize-y text-slate-900"
                              />
                            </div>

                            <div className="pl-4 border-l-2 border-slate-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-sans text-slate-900">
                                  Bước nhỏ ({step.subSteps.length})
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleAddSubStep(step.id)}
                                  className="inline-flex items-center gap-1 text-sm font-sans text-blue-600 hover:bg-blue-50 rounded-xl"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Thêm bước nhỏ</span>
                                </Button>
                              </div>

                              {step.subSteps.map((subStep, subIndex) => {
                                const isCollapsed = !!collapsedSubSteps[subStep.id];
                                return (
                                  <Card key={subStep.id} className="p-0 gap-0 bg-white rounded-2xl border border-slate-200 shadow-none flex flex-col overflow-hidden">
                                    <CardHeader
                                      className="px-4 py-2.5 relative cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl items-center"
                                      onClick={() => toggleCollapseSubStep(subStep.id)}
                                    >
                                      <CardTitle className="text-sm font-bold text-slate-900 pr-16 leading-tight">
                                        Bước {index + 1}.{subIndex + 1}: {subStep.title || '(Chưa đặt tên)'}
                                      </CardTitle>
                                      <CardAction className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          onClick={() => toggleCollapseSubStep(subStep.id)}
                                          className="h-7 w-7 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
                                        >
                                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          onClick={() => handleRemoveSubStep(step.id, subStep.id)}
                                          className="h-7 w-7 p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </CardAction>
                                    </CardHeader>

                                    <div className={cn(
                                      "transition-all duration-300 ease-in-out overflow-hidden",
                                      isCollapsed ? "max-h-0 opacity-0" : "max-h-[800px] opacity-100"
                                    )}>
                                      <CardContent className="px-4 pt-0 pb-3.5 space-y-3">
                                        <div>
                                          <Label className="block text-sm font-sans text-slate-900 mb-1">
                                            Tên bước nhỏ
                                          </Label>
                                          <Input
                                            value={subStep.title}
                                            onChange={(e) => handleChangeSubStep(step.id, subStep.id, { title: e.target.value })}
                                            placeholder="VD: Vệ sinh máy POS, xác nhận biên lai..."
                                            className="font-sans w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-sans text-slate-900"
                                          />
                                        </div>

                                        <div>
                                          <Label className="block text-sm font-sans text-slate-900 mb-1">
                                            Task của bước nhỏ
                                          </Label>
                                          <Textarea
                                            rows={1}
                                            value={subStep.tasksText}
                                            onChange={(e) => handleChangeSubStep(step.id, subStep.id, { tasksText: e.target.value })}
                                            placeholder={'Mỗi task một dòng, VD: Lau màn hình,Kiểm tra giấy in,...'}
                                            className="font-sans w-full rounded-xl border-slate-200 bg-slate-50 text-sm resize-y text-slate-900"
                                          />
                                        </div>
                                      </CardContent>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2.5 justify-end shrink-0 bg-slate-50/50 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 text-sm font-sans text-slate-900 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting}
                className="h-10 px-5 text-sm font-sans text-white bg-[#C21A1A] hover:bg-[#A81515] rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Lưu quy trình' : 'Tạo quy trình'}</span>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-lg p-5 rounded-[22px] bg-white border border-slate-200 shadow-2xl text-left font-sans">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-slate-800">
                Cấu hình hiển thị quy trình
              </DialogTitle>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Chọn icon và màu sắc đặc trưng cho quy trình
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
    </>
  );
});

export default ProcessCreateDialog;
