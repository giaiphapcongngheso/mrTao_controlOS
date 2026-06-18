import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Edit2, Layers, Plus, Trash2, X, Award, Clock, User } from 'lucide-react';
import { Button, Input, Label, Textarea } from '../../../../share/ui';
import { Sheet, SheetContent, SheetTitle, SheetFooter } from '../../../../share/ui/sheet';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../../../../share/ui/card';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { cn } from '../../../../share/lib/utils';
import type { ProcessStep } from '../../../types/checklist.types';
import { Dialog, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { staffService } from '../../../services/admin/staff-service';
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
  objective?: string;
  whenToUse?: string;
  responsibleRole?: string;
  mandatoryControls?: string[];
  attachments?: Array<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>;
};

interface ProcessCreateDialogProps {
  isOpen: boolean;
  roleOptions: Array<{ code: string; name: string }>;
  initialValues: ProcessDialogValues | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  isEditMode?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
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
  }) => Promise<void>;
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

function parseTasksText(tasksText: string): string[] | undefined {
  const tasks = tasksText
    .split('\n')
    .map((task) => task.trim())
    .filter(Boolean);

  return tasks.length > 0 ? tasks : undefined;
}

// ----------------- SUB-COMPONENTS TO OPTIMIZE PERFORMANCE -----------------

const SubStepItem = React.memo(function SubStepItem({
  subStep,
  stepId,
  index,
  subIndex,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  onChangeTitle,
  onChangeTasksText,
}: {
  subStep: EditableSubStep;
  stepId: string;
  index: number;
  subIndex: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRemove: (stepId: string, subStepId: string) => void;
  onChangeTitle: (stepId: string, subStepId: string, title: string) => void;
  onChangeTasksText: (stepId: string, subStepId: string, tasksText: string) => void;
}) {
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(stepId, subStep.id);
  }, [stepId, subStep.id, onRemove]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeTitle(stepId, subStep.id, e.target.value);
  }, [stepId, subStep.id, onChangeTitle]);

  const handleTasksTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeTasksText(stepId, subStep.id, e.target.value);
  }, [stepId, subStep.id, onChangeTasksText]);

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-xl p-3 hover:border-slate-350 hover:shadow-2xs transition-all duration-200 text-left">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Tên bước nhỏ */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
              {index + 1}.{subIndex + 1}
            </span>
            <Input
              value={subStep.title}
              onChange={handleTitleChange}
              placeholder="Tên bước nhỏ (VD: Lau máy POS...)"
              className="font-sans w-full h-8.5 text-xs bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg px-2.5"
            />
          </div>
        </div>

        {/* Task của bước nhỏ */}
        <div className="md:col-span-6">
          <Textarea
            rows={1}
            value={subStep.tasksText}
            onChange={handleTasksTextChange}
            placeholder="Các việc cần làm (mỗi dòng một việc...)"
            className="font-sans w-full min-h-[34px] h-8.5 py-1.5 text-xs bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg px-2.5 resize-y leading-normal"
          />
        </div>

        {/* Nút xóa */}
        <div className="md:col-span-1 flex items-center justify-end h-8.5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            className="h-7 w-7 p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center border border-transparent hover:border-rose-150 transition-colors"
            title="Xóa bước nhỏ"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

const StepItem = React.memo(function StepItem({
  step,
  index,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  onChangeTitle,
  onChangeTasksText,
  onAddSubStep,
  onRemoveSubStep,
  onChangeSubStepTitle,
  onChangeSubStepTasksText,
  collapsedSubSteps,
  onToggleCollapseSubStep,
  showRemove,
}: {
  step: EditableStep;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRemove: (id: string) => void;
  onChangeTitle: (id: string, title: string) => void;
  onChangeTasksText: (id: string, tasksText: string) => void;
  onAddSubStep: (id: string) => void;
  onRemoveSubStep: (stepId: string, subStepId: string) => void;
  onChangeSubStepTitle: (stepId: string, subStepId: string, title: string) => void;
  onChangeSubStepTasksText: (stepId: string, subStepId: string, tasksText: string) => void;
  collapsedSubSteps: Record<string, boolean>;
  onToggleCollapseSubStep: (id: string) => void;
  showRemove: boolean;
}) {
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(step.id);
  }, [step.id, onRemove]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeTitle(step.id, e.target.value);
  }, [step.id, onChangeTitle]);

  const handleTasksTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeTasksText(step.id, e.target.value);
  }, [step.id, onChangeTasksText]);

  const handleAddSubStepClick = useCallback(() => {
    onAddSubStep(step.id);
  }, [step.id, onAddSubStep]);

  return (
    <div className="bg-slate-50/45 border border-slate-200/90 rounded-2xl p-4 hover:border-slate-300 transition-all duration-200 text-left space-y-3.5">
      {/* Bước chính row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Tên bước chính */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white bg-[#C21A1A] px-2 py-0.5 rounded-lg shrink-0 select-none shadow-3xs">
              Bước {index + 1}
            </span>
            <Input
              value={step.title}
              onChange={handleTitleChange}
              placeholder="Tên bước (VD: Chốt quỹ, kiểm kho...)"
              className="font-sans w-full h-9.5 text-xs font-bold bg-white border-slate-200 hover:border-slate-350 rounded-xl px-3"
            />
          </div>
        </div>

        {/* Task của bước chính */}
        <div className="md:col-span-5">
          <Textarea
            rows={1}
            value={step.tasksText}
            onChange={handleTasksTextChange}
            placeholder="Các công việc cụ thể (mỗi dòng một việc...)"
            className="font-sans w-full min-h-[38px] h-9.5 py-2 text-xs bg-white border-slate-200 hover:border-slate-350 rounded-xl px-3 resize-y leading-normal"
          />
        </div>

        {/* Các nút hành động */}
        <div className="md:col-span-2 flex items-center justify-end gap-1.5 h-9.5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleAddSubStepClick}
            className="h-8.5 px-2.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50/80 rounded-xl flex items-center gap-1 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
            title="Thêm bước nhỏ bên trong"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Bước nhỏ</span>
          </Button>

          {showRemove && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              className="h-8.5 w-8.5 p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 flex items-center justify-center border border-transparent hover:border-rose-100 transition-all cursor-pointer"
              title="Xóa bước này"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Danh sách các bước nhỏ */}
      {step.subSteps.length > 0 && (
        <div className="pl-6 border-l-2 border-slate-200/80 space-y-2 mt-2">
          {step.subSteps.map((subStep, subIndex) => (
            <SubStepItem
              key={subStep.id}
              subStep={subStep}
              stepId={step.id}
              index={index}
              subIndex={subIndex}
              isCollapsed={!!collapsedSubSteps[subStep.id]}
              onToggleCollapse={onToggleCollapseSubStep}
              onRemove={onRemoveSubStep}
              onChangeTitle={onChangeSubStepTitle}
              onChangeTasksText={onChangeSubStepTasksText}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const MandatoryControlItem = React.memo(function MandatoryControlItem({
  control,
  index,
  onChange,
  onRemove,
  showRemove,
}: {
  control: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, e.target.value);
  }, [index, onChange]);

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={control}
        onChange={handleChange}
        placeholder={`VD: ${index === 0 ? 'Phải đối soát tiền mặt trùng khớp với báo cáo trước khi ký biên bản' : 'Điền điểm kiểm soát bắt buộc...'}`}
        className="font-sans flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900"
      />
      {showRemove && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleRemove}
          className="w-9 h-9 p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 border border-slate-100"
          tooltip="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

const AttachmentItem = React.memo(function AttachmentItem({
  file,
  index,
  onChange,
  onRemove,
}: {
  file: { name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' };
  index: number;
  onChange: (index: number, updates: Partial<typeof file>) => void;
  onRemove: (index: number) => void;
}) {
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, { name: e.target.value });
  }, [index, onChange]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, { url: e.target.value });
  }, [index, onChange]);

  const handleTypeChange = useCallback((value: string | number) => {
    onChange(index, { type: value as any });
  }, [index, onChange]);

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3 relative">
      <Button
        type="button"
        variant="ghost"
        onClick={handleRemove}
        className="absolute top-3.5 right-3.5 w-7 h-7 p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center border border-slate-200/50 bg-white"
        title="Xóa tài liệu"
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
        <div>
          <Label className="block text-xs font-sans text-slate-700 mb-1">Tên tài liệu / biểu mẫu</Label>
          <Input
            value={file.name}
            onChange={handleNameChange}
            placeholder="VD: Biên bản bàn giao quỹ tiền mặt"
            className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900"
          />
        </div>
        <div>
          <Label className="block text-xs font-sans text-slate-700 mb-1">Định dạng file</Label>
          <CustomSelect
            value={file.type}
            onChangeValue={handleTypeChange}
            options={[
              { label: 'PDF Document', value: 'pdf' },
              { label: 'Excel Spreadsheet', value: 'excel' },
              { label: 'Word Document', value: 'word' },
              { label: 'Định dạng khác', value: 'other' },
            ]}
            clearable={false}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer text-xs"
          />
        </div>
      </div>

      <div className="pr-8">
        <Label className="block text-xs font-sans text-slate-700 mb-1">Đường dẫn file (URL)</Label>
        <Input
          value={file.url}
          onChange={handleUrlChange}
          placeholder="VD: /files/bien-ban-ban-giao.pdf hoặc link online..."
          className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900"
        />
      </div>
    </div>
  );
});

// ----------------- MAIN COMPONENT -----------------

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
  const [objective, setObjective] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [responsibleRole, setResponsibleRole] = useState('');
  const [mandatoryControls, setMandatoryControls] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>>([]);

  // States for meta dialog configuration
  const [tempIconName, setTempIconName] = useState('Layers');
  const [tempColorKey, setTempColorKey] = useState('rose');
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);

  const [steps, setSteps] = useState<EditableStep[]>([createEmptyStep()]);
  const [collapsedSubSteps, setCollapsedSubSteps] = useState<Record<string, boolean>>({});
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});

  const { data: staffList = [] } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => staffService.getAll(),
  });

  const responsibleOptions = useMemo(() => {
    const roles = roleOptions.map((r) => ({
      label: `Vai trò: ${r.name}`,
      value: r.name,
    }));
    const staffs = staffList
      .filter((s) => s.status === 'active')
      .map((s) => ({
        label: `Nhân sự: ${s.fullName}`,
        value: s.fullName,
      }));
    return [...roles, ...staffs];
  }, [roleOptions, staffList]);

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
      setObjective(initialValues.objective || '');
      setWhenToUse(initialValues.whenToUse || '');
      setResponsibleRole(initialValues.responsibleRole || '');
      setMandatoryControls(
        initialValues.mandatoryControls && initialValues.mandatoryControls.length > 0
          ? initialValues.mandatoryControls
          : ['']
      );
      setAttachments(initialValues.attachments || []);
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
    setObjective('');
    setWhenToUse('');
    setResponsibleRole('');
    setMandatoryControls(['']);
    setAttachments([]);
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

  const handleAddSubStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? { ...step, subSteps: [...step.subSteps, createEmptySubStep()] }
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

  // ----------------- STABLE EVENT HANDLERS FOR USER INPUT -----------------

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleRoleCodeChange = useCallback((val: string | number) => {
    setRoleCode(String(val));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleObjectiveChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObjective(e.target.value);
  }, []);

  const handleWhenToUseChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWhenToUse(e.target.value);
  }, []);

  const handleResponsibleRoleChangeStable = useCallback((value: string | number | null) => {
    setResponsibleRole(value ? String(value) : '');
  }, []);

  const handleChangeStepTitle = useCallback((id: string, newTitle: string) => {
    setSteps((prev) => prev.map((step) => step.id === id ? { ...step, title: newTitle } : step));
  }, []);

  const handleChangeStepTasksText = useCallback((id: string, newTasksText: string) => {
    setSteps((prev) => prev.map((step) => step.id === id ? { ...step, tasksText: newTasksText } : step));
  }, []);

  const handleRemoveSubStepStable = useCallback((stepId: string, subStepId: string) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? { ...step, subSteps: step.subSteps.filter((subStep) => subStep.id !== subStepId) }
        : step
    )));
  }, []);

  const handleChangeSubStepTitleStable = useCallback((
    stepId: string,
    subStepId: string,
    newTitle: string,
  ) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? {
          ...step,
          subSteps: step.subSteps.map((subStep) => (
            subStep.id === subStepId ? { ...subStep, title: newTitle } : subStep
          )),
        }
        : step
    )));
  }, []);

  const handleChangeSubStepTasksTextStable = useCallback((
    stepId: string,
    subStepId: string,
    newTasksText: string,
  ) => {
    setSteps((prev) => prev.map((step) => (
      step.id === stepId
        ? {
          ...step,
          subSteps: step.subSteps.map((subStep) => (
            subStep.id === subStepId ? { ...subStep, tasksText: newTasksText } : subStep
          )),
        }
        : step
    )));
  }, []);

  const handleChangeMandatoryControl = useCallback((idx: number, val: string) => {
    setMandatoryControls((prev) => {
      const updated = [...prev];
      updated[idx] = val;
      return updated;
    });
  }, []);

  const handleRemoveMandatoryControl = useCallback((idx: number) => {
    setMandatoryControls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddMandatoryControl = useCallback(() => {
    setMandatoryControls((prev) => [...prev, '']);
  }, []);

  const handleChangeAttachment = useCallback((idx: number, updates: Partial<{ name: string; url: string; type: 'pdf' | 'excel' | 'word' | 'other' }>) => {
    setAttachments((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...updates };
      return updated;
    });
  }, []);

  const handleRemoveAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddAttachment = useCallback(() => {
    setAttachments((prev) => [...prev, { name: '', url: '', type: 'pdf' }]);
  }, []);

  const handleCloseMetaDialog = useCallback(() => {
    setIsMetaDialogOpen(false);
  }, []);

  // ----------------- SUBMIT HANDLER -----------------

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

    const filteredControls = mandatoryControls
      .map((c) => c.trim())
      .filter(Boolean);

    const filteredAttachments = attachments
      .filter((a) => a.name.trim() && a.url.trim());

    await onSubmit({
      title: normalizedTitle,
      roleCode,
      description: description.trim() || undefined,
      iconName,
      colorKey,
      steps: normalizedSteps,
      objective: objective.trim() || undefined,
      whenToUse: whenToUse.trim() || undefined,
      responsibleRole: responsibleRole.trim() || undefined,
      mandatoryControls: filteredControls.length > 0 ? filteredControls : undefined,
      attachments: filteredAttachments.length > 0 ? filteredAttachments : undefined,
    });
  }, [
    description,
    onSubmit,
    roleCode,
    steps,
    title,
    iconName,
    colorKey,
    objective,
    whenToUse,
    responsibleRole,
    mandatoryControls,
    attachments,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-[70%] sm:max-w-[60%] p-0 border-l border-slate-200 bg-white shadow-2xl flex flex-col"
        >
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Clickable Icon Button in Header with Edit Badge */}
              <div className="relative group shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleOpenMetaDialog}
                  title="Chọn icon và màu sắc quy trình"
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-3xs",
                    previewColor.iconBg
                  )}
                >
                  <PreviewIcon className={cn("w-5 h-5 transition-transform group-hover:scale-110", previewColor.iconColor)} />
                </Button>
                {/* Tiny edit pencil overlay */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-white text-white flex items-center justify-center shadow-xs pointer-events-none scale-90 group-hover:scale-105 transition-transform">
                  <Edit2 className="w-2.5 h-2.5 stroke-[2.5]" />
                </span>
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Nhập tên quy trình..."
                  className="font-sans w-full bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-solid focus:border-[#C21A1A] outline-none focus:outline-none focus:ring-0 p-0 pb-1 text-base sm:text-lg lg:text-xl font-black text-slate-800 placeholder-slate-400/90 leading-tight transition-colors"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl shrink-0"
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

              {/* Thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="block text-xs font-bold text-slate-800 mb-1.5">Vai trò áp dụng</Label>
                  <CustomSelect
                    value={roleCode}
                    onChangeValue={handleRoleCodeChange}
                    options={roleOptions.map((role) => ({
                      label: role.name,
                      value: role.code,
                    }))}
                    clearable={false}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="block text-xs font-bold text-slate-800 mb-1.5">Mô tả ngắn</Label>
                  <Input
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="Tóm tắt mục tiêu và cách vận hành của quy trình..."
                    className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Thông tin SOP Vận hành */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4.5 space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-[#C21A1A]/10 text-[#C21A1A] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Thông tin SOP Vận hành</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-rose-500" />
                      <span>Mục tiêu quy trình</span>
                    </Label>
                    <Textarea
                      rows={2}
                      value={objective}
                      onChange={handleObjectiveChange}
                      placeholder="Mục tiêu cốt lõi của quy trình này là gì..."
                      className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-xs font-sans resize-none text-slate-900 leading-normal"
                    />
                  </div>

                  <div>
                    <Label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Khi nào áp dụng</span>
                    </Label>
                    <Textarea
                      rows={2}
                      value={whenToUse}
                      onChange={handleWhenToUseChange}
                      placeholder="Quy trình áp dụng khi nào hoặc điều kiện kích hoạt..."
                      className="font-sans w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl px-3 py-2 text-xs font-sans resize-none text-slate-900 leading-normal"
                    />
                  </div>
                </div>

                <div>
                  <Label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Người chịu trách nhiệm chính</span>
                  </Label>
                  <CustomSelect
                    value={responsibleRole}
                    onChangeValue={handleResponsibleRoleChangeStable}
                    options={responsibleOptions}
                    placeholder="Chọn vai trò hoặc nhân sự chịu trách nhiệm chính..."
                    clearable={true}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl cursor-pointer transition-colors text-xs"
                  />
                </div>
              </div>

              {/* Danh sách các bước */}
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
                  {steps.map((step, index) => (
                    <StepItem
                      key={step.id}
                      step={step}
                      index={index}
                      isCollapsed={!!collapsedSteps[step.id]}
                      onToggleCollapse={toggleCollapseStep}
                      onRemove={handleRemoveStep}
                      onChangeTitle={handleChangeStepTitle}
                      onChangeTasksText={handleChangeStepTasksText}
                      onAddSubStep={handleAddSubStep}
                      onRemoveSubStep={handleRemoveSubStepStable}
                      onChangeSubStepTitle={handleChangeSubStepTitleStable}
                      onChangeSubStepTasksText={handleChangeSubStepTasksTextStable}
                      collapsedSubSteps={collapsedSubSteps}
                      onToggleCollapseSubStep={toggleCollapseSubStep}
                      showRemove={steps.length > 1}
                    />
                  ))}
                </div>
              </div>

              {/* Điểm kiểm soát bắt buộc */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Điểm kiểm soát bắt buộc</h4>
                    <p className="text-xs text-slate-400 font-sans mt-1">Các điểm mấu chốt nhân viên bắt buộc phải tuân thủ nghiêm ngặt.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddMandatoryControl}
                    className="inline-flex items-center gap-1.5 rounded-xl text-xs font-sans text-amber-600 hover:bg-amber-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm điểm kiểm soát</span>
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {mandatoryControls.map((control, idx) => (
                    <MandatoryControlItem
                      key={idx}
                      control={control}
                      index={idx}
                      onChange={handleChangeMandatoryControl}
                      onRemove={handleRemoveMandatoryControl}
                      showRemove={mandatoryControls.length > 1}
                    />
                  ))}
                </div>
              </div>

              {/* Biểu mẫu / tài liệu đính kèm */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Biểu mẫu & Tài liệu đính kèm</h4>
                    <p className="text-xs text-slate-400 font-sans mt-1">Các tài liệu, biểu mẫu Excel/PDF liên quan dùng trong quy trình.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddAttachment}
                    className="inline-flex items-center gap-1.5 rounded-xl text-xs font-sans text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm tài liệu</span>
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-3.5">
                    {attachments.map((file, idx) => (
                      <AttachmentItem
                        key={idx}
                        file={file}
                        index={idx}
                        onChange={handleChangeAttachment}
                        onRemove={handleRemoveAttachment}
                      />
                    ))}
                  </div>
                )}
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
              onClick={handleCloseMetaDialog}
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
                    const handleSelectIcon = () => setTempIconName(option.name);

                    return (
                      <Button
                        key={option.name}
                        type="button"
                        variant="ghost"
                        onClick={handleSelectIcon}
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
                    const handleSelectColor = () => setTempColorKey(key);

                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        onClick={handleSelectColor}
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
              onClick={handleCloseMetaDialog}
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
