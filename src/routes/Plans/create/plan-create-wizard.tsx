import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Save, Zap, Trash2, Plus, CalendarRange, Target, RefreshCw, Link2, Clock, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../../../../share/ui/sheet';
import { Button } from '../../../../share/ui/button';
import { ButtonGroup } from '../../../../share/ui/button-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../share/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../share/ui/card';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { Label } from '../../../../share/ui/label';
import { Input } from '../../../../share/ui/input';
import { Textarea } from '../../../../share/ui/textarea';
import { NumericInput } from '../../../../share/ui/numeric-input';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import type { 
  PlanRequestType, 
  PlanLevel, 
  PlanPriority, 
  PlanLinkedModules, 
  ReviewFrequency, 
  DeviationAction,
  PlanDocument,
  PlanDaySchedule,
  PlanTimeSlot,
  PlanMITTask,
  DaySlotStatus
} from '../../../types/plans.types';
import { generateEntityId } from '../../../types/base.types';
import { PLAN_LEVEL_LABELS, LINKED_MODULE_CONFIG, DEFAULT_DAY_TIME_SLOTS } from '../constants/plan-constants';
import { formatDateVN, formatCurrencyVN } from '../constants/plan-utils';

export interface PlanFormData {
  name: string;
  level: PlanLevel;
  department: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  description: string;
  revenueTarget: number;
  profitMarginTarget: number;
  customTargets: Array<{ label: string; value: string }>;
  priorities: PlanPriority[];
  reviewFrequency: ReviewFrequency;
  reviewerId: string;
  reviewerName: string;
  alertThreshold: number;
  deviationAction: DeviationAction;
  linkedModules: PlanLinkedModules;
  // Quarter specific
  leveragePoints: string[];
  battleTargets: string[];
  // Hierarchy
  parentPlanId: string;
  // Day specific
  dayTimeSlots: PlanTimeSlot[];
  dayMitTasks: PlanMITTask[];
  dayQuickNotes: string[];
}

const INITIAL_FORM: PlanFormData = {
  name: '',
  level: 'quarter',
  department: '',
  ownerId: '',
  ownerName: '',
  startDate: '',
  endDate: '',
  description: '',
  revenueTarget: 0,
  profitMarginTarget: 0,
  customTargets: [],
  priorities: [],
  reviewFrequency: 'weekly',
  reviewerId: '',
  reviewerName: '',
  alertThreshold: 80,
  deviationAction: 'adjust_plan',
  linkedModules: { checklist: true, tasks: true, kpi: true, reports: true },
  leveragePoints: ['', '', ''],
  battleTargets: ['', '', ''],
  parentPlanId: '',
  dayTimeSlots: [],
  dayMitTasks: [],
  dayQuickNotes: [],
};

interface PlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMembers: Array<{ id: string; fullName: string; avatar?: string }>;
  onSubmit: (
    data: PlanRequestType, 
    dayScheduleData?: { timeSlots: PlanTimeSlot[]; mitTasks: PlanMITTask[]; quickNotes: string[]; date: string }
  ) => Promise<void>;
  isSubmitting?: boolean;
  editPlan?: PlanDocument | null;
  availablePlans?: PlanDocument[];
  daySchedules?: PlanDaySchedule[];
}

const parseInputDate = (dateStr: string | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatToInputDate = (date: Date | undefined): string => {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDefaultPlanName = (level: PlanLevel, startDateStr?: string) => {
  const date = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(date.getTime())) return 'Kế hoạch mới';

  const year = date.getFullYear();
  switch (level) {
    case 'quarter': {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Kế hoạch Quý ${q}/${year}`;
    }
    case 'month': {
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `Kế hoạch Tháng ${m}/${year}`;
    }
    case 'week': {
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const result = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
      return `Kế hoạch Tuần ${result}/${year}`;
    }
    case 'day': {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      return `Kế hoạch Ngày ${dd}/${mm}/${year}`;
    }
    default:
      return 'Kế hoạch mới';
  }
};

export default function PlanCreateWizard({
  open,
  onOpenChange,
  staffMembers,
  onSubmit,
  isSubmitting = false,
  editPlan = null,
  availablePlans = [],
  daySchedules = [],
}: PlanCreateWizardProps) {
  const [formData, setFormData] = useState<PlanFormData>(INITIAL_FORM);

  const updateField = useCallback(<K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Sync editPlan with form data
  useEffect(() => {
    if (open) {
      if (editPlan) {
        const daySched = editPlan.level === 'day'
          ? daySchedules.find((s) => s.date === editPlan.startDate || s.planId === editPlan.id)
          : null;

        setFormData({
          name: editPlan.name,
          level: editPlan.level,
          department: editPlan.department ?? '',
          ownerId: editPlan.ownerId,
          ownerName: editPlan.ownerName,
          startDate: editPlan.startDate,
          endDate: editPlan.endDate,
          description: editPlan.description ?? '',
          revenueTarget: editPlan.revenueTarget ?? 0,
          profitMarginTarget: editPlan.profitMarginTarget ?? 0,
          customTargets: editPlan.customTargets ?? [],
          priorities: editPlan.priorities ?? [],
          reviewFrequency: editPlan.reviewFrequency ?? 'weekly',
          reviewerId: editPlan.reviewerId ?? '',
          reviewerName: editPlan.reviewerName ?? '',
          alertThreshold: editPlan.alertThreshold ?? 80,
          deviationAction: editPlan.deviationAction ?? 'adjust_plan',
          linkedModules: editPlan.linkedModules ?? { checklist: true, tasks: true, kpi: true, reports: true },
          leveragePoints: editPlan.leveragePoints ?? ['', '', ''],
          battleTargets: editPlan.battleTargets ?? ['', '', ''],
          parentPlanId: editPlan.parentPlanId ?? '',
          dayTimeSlots: daySched?.timeSlots ?? [],
          dayMitTasks: daySched?.mitTasks ?? [],
          dayQuickNotes: daySched?.quickNotes ?? [],
        });
      } else {
        setFormData(INITIAL_FORM);
      }
    }
  }, [open, editPlan, daySchedules]);

  // Handle Level selection
  const handleLevelChange = useCallback((level: PlanLevel) => {
    setFormData((prev) => {
      const next = { ...prev, level };
      if (level === 'day' && prev.startDate) {
        next.endDate = prev.startDate;
      }
      return next;
    });
  }, []);

  // Handle Start Date change
  const handleStartDateChange = useCallback((dateStr: string) => {
    setFormData((prev) => {
      if (prev.level === 'day') {
        return { ...prev, startDate: dateStr, endDate: dateStr };
      }
      return { ...prev, startDate: dateStr };
    });
  }, []);

  // Handle Parent Plan change & Auto-cascade revenue suggestion
  const handleParentPlanChange = useCallback((parentId: string) => {
    const parent = availablePlans.find((p) => p.id === parentId);
    setFormData((prev) => {
      const next = { ...prev, parentPlanId: parentId };
      if (parent?.revenueTarget) {
        if (prev.level === 'month') {
          next.revenueTarget = Math.round(parent.revenueTarget / 3);
        } else if (prev.level === 'week') {
          next.revenueTarget = Math.round(parent.revenueTarget / 4);
        }
      }
      return next;
    });
  }, [availablePlans]);

  // Filter available parent plan options based on current level selection
  const parentPlanOptions = useMemo(() => {
    const parentLevel: PlanLevel | null = 
      formData.level === 'month' ? 'quarter' :
      formData.level === 'week' ? 'month' :
      formData.level === 'day' ? 'week' : null;

    if (!parentLevel) return [];

    return availablePlans
      .filter((p) => p.level === parentLevel && p.status !== 'archived')
      .map((p) => ({
        label: `${p.name} (${p.revenueTarget ? formatCurrencyVN(p.revenueTarget) : 'Không có mục tiêu doanh thu'})`,
        value: p.id,
      }));
  }, [availablePlans, formData.level]);

  // Leverage Points & Battle Targets handlers (Quarter)
  const handleUpdateLeveragePoint = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.leveragePoints];
      updated[index] = value;
      return { ...prev, leveragePoints: updated };
    });
  }, []);

  const handleUpdateBattleTarget = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.battleTargets];
      updated[index] = value;
      return { ...prev, battleTargets: updated };
    });
  }, []);

  // MIT Tasks handlers (Day)
  const handleAddMit = useCallback(() => {
    const newMit: PlanMITTask = {
      id: generateEntityId('mit'),
      order: formData.dayMitTasks.length + 1,
      title: '',
      description: '',
    };
    updateField('dayMitTasks', [...formData.dayMitTasks, newMit]);
  }, [formData.dayMitTasks, updateField]);

  const handleUpdateMit = useCallback((index: number, field: keyof PlanMITTask, value: any) => {
    const updated = formData.dayMitTasks.map((m, i) => i !== index ? m : { ...m, [field]: value });
    updateField('dayMitTasks', updated);
  }, [formData.dayMitTasks, updateField]);

  const handleRemoveMit = useCallback((index: number) => {
    const updated = formData.dayMitTasks
      .filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, order: i + 1 }));
    updateField('dayMitTasks', updated);
  }, [formData.dayMitTasks, updateField]);

  // Time Slots handlers (Day)
  const handleInitTimeSlots = useCallback(() => {
    if (formData.dayTimeSlots.length > 0) return;
    const slots: PlanTimeSlot[] = DEFAULT_DAY_TIME_SLOTS.map((time) => ({
      id: generateEntityId('ts'),
      time,
      task: '',
      assigneeId: '',
      assigneeName: '',
      expectedResult: '',
      status: 'not_started' as DaySlotStatus,
    }));
    updateField('dayTimeSlots', slots);
  }, [formData.dayTimeSlots, updateField]);

  const handleUpdateTimeSlot = useCallback((index: number, field: keyof PlanTimeSlot, value: any) => {
    const updated = formData.dayTimeSlots.map((s, i) => {
      if (i !== index) return s;
      if (field === 'assigneeId') {
        const staff = staffMembers.find((x) => x.id === value);
        return { ...s, assigneeId: value, assigneeName: staff?.fullName ?? '' };
      }
      return { ...s, [field]: value };
    });
    updateField('dayTimeSlots', updated);
  }, [formData.dayTimeSlots, staffMembers, updateField]);

  // Priorities handlers (Quarter / Month / Week)
  const handleAddPriority = useCallback(() => {
    const newPriority: PlanPriority = {
      id: generateEntityId('pr'),
      order: formData.priorities.length + 1,
      title: '',
      expectedResult: '',
      deadline: formData.endDate || '2026-09-30',
      ownerId: '',
      ownerName: '',
      progress: 0,
      status: 'not_started',
    };
    updateField('priorities', [...formData.priorities, newPriority]);
  }, [formData.priorities, formData.endDate, updateField]);

  const handleUpdatePriority = useCallback((index: number, field: keyof PlanPriority, value: any) => {
    const updated = formData.priorities.map((p, i) => {
      if (i !== index) return p;
      if (field === 'ownerId') {
        const staff = staffMembers.find((s) => s.id === value);
        return { ...p, ownerId: value, ownerName: staff?.fullName ?? '' };
      }
      return { ...p, [field]: value };
    });
    updateField('priorities', updated);
  }, [formData.priorities, staffMembers, updateField]);

  const handleRemovePriority = useCallback((index: number) => {
    const updated = formData.priorities
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, order: i + 1 }));
    updateField('priorities', updated);
  }, [formData.priorities, updateField]);

  const handleSubmit = useCallback(async (asDraft: boolean) => {
    const payload: PlanRequestType = {
      name: formData.name || getDefaultPlanName(formData.level, formData.startDate),
      level: formData.level,
      ownerId: formData.ownerId || staffMembers[0]?.id || '',
      ownerName: formData.ownerName || staffMembers[0]?.fullName || 'Nguyễn Văn A',
      startDate: formData.startDate,
      endDate: formData.endDate,
      description: formData.description || undefined,
      revenueTarget: formData.revenueTarget || undefined,
      profitMarginTarget: formData.profitMarginTarget || undefined,
      customTargets: formData.customTargets.length > 0 ? formData.customTargets : undefined,
      priorities: formData.level !== 'day' ? formData.priorities.map((p, i) => ({
        ...p,
        id: p.id || generateEntityId('pr'),
        order: i + 1,
      })) : [],
      reviewFrequency: formData.reviewFrequency,
      reviewerId: formData.reviewerId || staffMembers[0]?.id || '',
      reviewerName: formData.reviewerName || staffMembers[0]?.fullName || 'Nguyễn Văn A',
      alertThreshold: formData.alertThreshold,
      deviationAction: formData.deviationAction,
      linkedModules: formData.linkedModules,
      status: asDraft ? 'draft' : (editPlan ? editPlan.status : 'active'),
      progress: editPlan ? editPlan.progress : 0,
      leveragePoints: formData.level === 'quarter' ? formData.leveragePoints.filter(Boolean) : undefined,
      battleTargets: formData.level === 'quarter' ? formData.battleTargets.filter(Boolean) : undefined,
      parentPlanId: formData.level !== 'quarter' ? formData.parentPlanId || undefined : undefined,
    };

    const daySchedulePayload = formData.level === 'day' ? {
      timeSlots: formData.dayTimeSlots.filter(s => s.task.trim().length > 0),
      mitTasks: formData.dayMitTasks.filter(t => t.title.trim().length > 0),
      quickNotes: formData.dayQuickNotes.filter(Boolean),
      date: formData.startDate,
    } : undefined;

    await onSubmit(payload, daySchedulePayload);
  }, [formData, onSubmit, staffMembers, editPlan]);

  const handleSaveDraft = useCallback(() => void handleSubmit(true), [handleSubmit]);
  const handleActivate = useCallback(() => void handleSubmit(false), [handleSubmit]);

  const handleToggleModule = useCallback((key: keyof PlanLinkedModules) => {
    updateField('linkedModules', {
      ...formData.linkedModules,
      [key]: !formData.linkedModules[key],
    });
  }, [formData.linkedModules, updateField]);

  const staffOptions = useMemo(() => {
    return staffMembers.map((s) => ({
      label: s.fullName,
      value: s.id,
    }));
  }, [staffMembers]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[85vw] max-w-[85vw] sm:max-w-[85vw] flex-col p-0 gap-0 text-slate-700"
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div>
            <SheetTitle className="text-lg font-black text-slate-800">
              {editPlan ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch mới'}
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-400 font-semibold mt-0.5">
              {editPlan 
                ? `Đang sửa: ${editPlan.name}`
                : 'Thiết lập mục tiêu, kết quả cần đạt và nhịp review thật đơn giản'
              }
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* ─── Sheet Body (scrollable) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-slate-50/25">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 px-6 py-6 min-h-full">
            
            {/* Left Column: Form Sections inside Card component */}
            <Card className="border border-slate-100/80 p-0 shadow-xs flex flex-col gap-6 bg-white overflow-hidden py-6 rounded-3xl">
              <CardContent className="space-y-6">
                
                {/* 1. Thông tin chung */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 tracking-wider">Thông tin chung</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-slate-500 font-bold">Tên kế hoạch *</Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Nhập tên kế hoạch"
                        className="rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Cấp độ *</Label>
                      <ButtonGroup className="w-full h-9">
                        {(['quarter', 'month', 'week', 'day'] as PlanLevel[]).map((level) => (
                          <Button
                            key={level}
                            type="button"
                            variant={formData.level === level ? 'default' : 'outline'}
                            onClick={() => handleLevelChange(level)}
                            disabled={editPlan !== null && editPlan.level !== level}
                            className={`flex-1 text-sm font-bold h-full ${
                              formData.level === level
                                ? 'bg-[#C21A1A] hover:bg-[#a51616] text-white border-transparent'
                                : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200'
                            }`}
                          >
                            {level === 'quarter' ? 'Quý' : level === 'month' ? 'Tháng' : level === 'week' ? 'Tuần' : 'Ngày'}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </div>

                    {formData.level !== 'quarter' && parentPlanOptions.length > 0 && (
                      <div className="space-y-1.5 md:col-span-3">
                        <Label className="text-slate-500 font-bold">
                          Thuộc kế hoạch {formData.level === 'month' ? 'Quý' : formData.level === 'week' ? 'Tháng' : 'Tuần'} cha *
                        </Label>
                        <CustomSelect
                          value={formData.parentPlanId}
                          onChangeValue={(val) => handleParentPlanChange(String(val))}
                          placeholder="Chọn kế hoạch cha..."
                          options={parentPlanOptions}
                          className="rounded-xl border-slate-200 h-9"
                        />
                        {formData.parentPlanId && (() => {
                          const parent = availablePlans.find(p => p.id === formData.parentPlanId);
                          const divisor = formData.level === 'month' ? 3 : formData.level === 'week' ? 4 : 1;
                          return parent?.revenueTarget && divisor > 1 ? (
                            <p className="text-xs font-semibold text-emerald-600 mt-1">
                              💡 Gợi ý doanh thu: {formatCurrencyVN(Math.round(parent.revenueTarget / divisor))} (Kế hoạch cha: {formatCurrencyVN(parent.revenueTarget)} / {divisor})
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Owner *</Label>
                      <CustomSelect
                        value={formData.ownerId}
                        onChangeValue={(val) => {
                          const st = staffMembers.find((x) => x.id === val);
                          updateField('ownerId', String(val));
                          updateField('ownerName', st?.fullName ?? '');
                        }}
                        placeholder="Chọn owner"
                        options={staffOptions}
                        className="rounded-xl border-slate-200 h-9"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-slate-500 font-bold">Thời gian *</Label>
                      {formData.level === 'day' ? (
                        <DatePicker
                          value={parseInputDate(formData.startDate)}
                          onChange={(date) => handleStartDateChange(formatToInputDate(date))}
                          className="rounded-xl border-slate-200 w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <DatePicker
                            value={parseInputDate(formData.startDate)}
                            onChange={(date) => handleStartDateChange(formatToInputDate(date))}
                            className="rounded-xl border-slate-200"
                          />
                          <ArrowRight className="text-slate-400 w-4 h-4 shrink-0 mx-1" strokeWidth={3} />
                          <DatePicker
                            value={parseInputDate(formData.endDate)}
                            onChange={(date) => updateField('endDate', formatToInputDate(date))}
                            className="rounded-xl border-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {formData.level !== 'day' && (
                  <>
                    <hr className="border-slate-100" />

                    {/* 2. Kết quả cần đạt */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">Kết quả cần đạt</h3>
                      </div>

                      <div className="space-y-1.5">
                        <Textarea
                          value={formData.description}
                          onChange={(e) => updateField('description', e.target.value)}
                          placeholder="Mô tả ngắn gọn kết quả cốt lõi cần đạt trong kỳ kế hoạch..."
                          rows={2}
                          className="rounded-xl border-slate-200 resize-none min-h-[60px]"
                        />
                        <p className="text-sm font-normal text-slate-500">Gợi ý: Kết quả càng cụ thể, kế hoạch càng dễ thành công.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-slate-500 font-bold">Mục tiêu doanh thu (VND)</Label>
                          <NumericInput
                            value={formData.revenueTarget || ''}
                            onValueChange={(val) => updateField('revenueTarget', val ?? 0)}
                            placeholder="Ví dụ: 2.200.000.000"
                            className="rounded-xl border-slate-200"
                            allowDecimal={false}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-slate-500 font-bold">Mục tiêu lợi nhuận / biên (%)</Label>
                          <NumericInput
                            value={formData.profitMarginTarget || ''}
                            onValueChange={(val) => updateField('profitMarginTarget', val ?? 0)}
                            placeholder="Ví dụ: 20"
                            className="rounded-xl border-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-slate-500 font-bold">Mục tiêu khác (tùy chọn)</Label>
                          <Input
                            type="text"
                            placeholder="Ví dụ: Thị phần, Khách hàng mới..."
                            className="rounded-xl border-slate-200 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Quarter only sections */}
                {formData.level === 'quarter' && (
                  <>
                    <hr className="border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">3 đòn bẩy 20/80 (Quý)</h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">3 việc cốt lõi tạo ra 80% kết quả trong quý</p>
                      <div className="space-y-2.5">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <Input
                              type="text"
                              value={formData.leveragePoints[idx] ?? ''}
                              onChange={(e) => handleUpdateLeveragePoint(idx, e.target.value)}
                              placeholder={`Nhập đòn bẩy thứ ${idx + 1}`}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr className="border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">3 trận đánh lớn (Quý)</h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">3 mặt trận chiến dịch quan trọng nhất phải thắng bằng mọi giá</p>
                      <div className="space-y-2.5">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <Input
                              type="text"
                              value={formData.battleTargets[idx] ?? ''}
                              onChange={(e) => handleUpdateBattleTarget(idx, e.target.value)}
                              placeholder={`Ví dụ: ${
                                idx === 0 ? 'Doanh thu & dòng tiền: ...' :
                                idx === 1 ? 'SOP & KPI vận hành: ...' : 'Văn hóa & đội ngũ: ...'
                              }`}
                              className="rounded-xl border-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Priorities Section — Quarter / Month / Week */}
                {formData.level !== 'day' && (
                  <>
                    <hr className="border-slate-100" />

                    {/* 3. 3-5 ưu tiên chính */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">3–5 ưu tiên chính</h3>
                      </div>

                      <div className="overflow-x-auto">
                        <Table className="w-full text-left table-fixed min-w-[800px]">
                          <TableHeader>
                            <TableRow className="border-b border-slate-100 hover:bg-transparent">
                              <TableHead className="text-sm font-bold text-slate-400 py-2.5 px-2 w-[30%]">Ưu tiên</TableHead>
                              <TableHead className="text-sm font-bold text-slate-400 py-2.5 px-2 w-[35%]">Kết quả</TableHead>
                              <TableHead className="text-sm font-bold text-slate-400 py-2.5 px-2 w-[160px] shrink-0">Deadline</TableHead>
                              <TableHead className="text-sm font-bold text-slate-400 py-2.5 px-2 w-[180px] shrink-0">Owner</TableHead>
                              <TableHead className="py-2.5 px-2 w-[50px] text-center" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.priorities.map((p, idx) => (
                              <TableRow key={p.id} className="border-b border-slate-50 hover:bg-slate-50/20">
                                <TableCell className="py-2 px-2 w-[30%] align-middle">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-400 w-5 text-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <Input
                                      type="text"
                                      value={p.title}
                                      onChange={(e) => handleUpdatePriority(idx, 'title', e.target.value)}
                                      placeholder="Tên ưu tiên"
                                      className="rounded-lg border-slate-200 py-1.5 w-full text-sm font-bold text-slate-700"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 px-2 w-[35%] align-middle">
                                  <Input
                                    type="text"
                                    value={p.expectedResult}
                                    onChange={(e) => handleUpdatePriority(idx, 'expectedResult', e.target.value)}
                                    placeholder="Kết quả chi tiết"
                                    className="rounded-lg border-slate-200 py-1.5 w-full text-sm font-semibold text-slate-500"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-2 w-[160px] shrink-0 align-middle">
                                  <DatePicker
                                    value={parseInputDate(p.deadline)}
                                    onChange={(date) => handleUpdatePriority(idx, 'deadline', formatToInputDate(date))}
                                    className="rounded-lg border-slate-200"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-2 w-[180px] shrink-0 align-middle">
                                  <CustomSelect
                                    value={p.ownerId}
                                    onChangeValue={(val) => handleUpdatePriority(idx, 'ownerId', String(val))}
                                    placeholder="Chọn..."
                                    options={staffOptions}
                                    className="rounded-lg border-slate-200"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-2 w-[50px] text-center align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePriority(idx)}
                                    className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddPriority}
                        className="w-full py-2.5 text-sm font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-600 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm ưu tiên
                      </Button>
                    </div>
                  </>
                )}

                {/* Day level Schedule Section */}
                {formData.level === 'day' && (
                  <>
                    <hr className="border-slate-100" />
                    
                    {/* MIT Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">MIT hôm nay (1–3 việc đòn bẩy)</h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">Những công việc quan trọng nhất quyết định kết quả của ngày</p>
                      
                      <div className="space-y-3">
                        {formData.dayMitTasks.map((mit, idx) => (
                          <div key={mit.id || idx} className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="w-5 h-5 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <Input
                                  type="text"
                                  value={mit.title}
                                  onChange={(e) => handleUpdateMit(idx, 'title', e.target.value)}
                                  placeholder="Nhập tên việc đòn bẩy..."
                                  className="rounded-lg border-slate-200 h-8 text-sm font-bold w-full"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMit(idx)}
                                className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-lg shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <Textarea
                              value={mit.description}
                              onChange={(e) => handleUpdateMit(idx, 'description', e.target.value)}
                              placeholder="Mô tả kết quả chi tiết cần đạt..."
                              rows={1}
                              className="rounded-lg border-slate-200 text-xs py-1 min-h-[32px] resize-none"
                            />
                          </div>
                        ))}
                      </div>

                      {formData.dayMitTasks.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddMit}
                          className="w-full py-2 text-sm font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-600 flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm việc đòn bẩy (MIT)
                        </Button>
                      )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Time Slots */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">Kế hoạch theo khung giờ</h3>
                        {formData.dayTimeSlots.length === 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleInitTimeSlots}
                            className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 gap-1 h-8"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-400" />
                            Tạo 6 khung giờ chuẩn
                          </Button>
                        )}
                      </div>

                      {formData.dayTimeSlots.length > 0 && (
                        <div className="overflow-x-auto">
                          <Table className="w-full text-left table-fixed min-w-[800px]">
                            <TableHeader>
                              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                                <TableHead className="text-xs font-bold text-slate-400 py-2 px-1 w-[80px]">Giờ</TableHead>
                                <TableHead className="text-xs font-bold text-slate-400 py-2 px-1 w-[32%]">Việc cần làm</TableHead>
                                <TableHead className="text-xs font-bold text-slate-400 py-2 px-1 w-[32%]">Kết quả kỳ vọng</TableHead>
                                <TableHead className="text-xs font-bold text-slate-400 py-2 px-1 w-[180px]">Người phụ trách</TableHead>
                                <TableHead className="text-xs font-bold text-slate-400 py-2 px-1 w-[120px]">Trạng thái</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.dayTimeSlots.map((slot, idx) => (
                                <TableRow key={slot.id || idx} className="border-b border-slate-50 hover:bg-slate-50/20">
                                  <TableCell className="py-2 px-1 align-middle">
                                    <span className="text-sm font-black text-slate-800">{slot.time}</span>
                                  </TableCell>
                                  <TableCell className="py-2 px-1 align-middle">
                                    <Input
                                      type="text"
                                      value={slot.task}
                                      onChange={(e) => handleUpdateTimeSlot(idx, 'task', e.target.value)}
                                      placeholder="Nhiệm vụ..."
                                      className="rounded-lg border-slate-200 h-8 text-sm font-bold text-slate-700"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 px-1 align-middle">
                                    <Input
                                      type="text"
                                      value={slot.expectedResult}
                                      onChange={(e) => handleUpdateTimeSlot(idx, 'expectedResult', e.target.value)}
                                      placeholder="Kết quả kỳ vọng..."
                                      className="rounded-lg border-slate-200 h-8 text-sm font-semibold text-slate-500"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 px-1 align-middle">
                                    <CustomSelect
                                      value={slot.assigneeId}
                                      onChangeValue={(val) => handleUpdateTimeSlot(idx, 'assigneeId', String(val))}
                                      placeholder="Chọn..."
                                      options={staffOptions}
                                      className="rounded-lg border-slate-200 h-8"
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 px-1 align-middle">
                                    <CustomSelect
                                      value={slot.status}
                                      onChangeValue={(val) => handleUpdateTimeSlot(idx, 'status', String(val))}
                                      options={[
                                        { label: 'Chưa bắt đầu', value: 'not_started' },
                                        { label: 'Đang thực hiện', value: 'in_progress' },
                                        { label: 'Chờ hoàn thành', value: 'completed' },
                                        { label: 'Sắp diễn ra', value: 'pending_review' },
                                      ]}
                                      className="rounded-lg border-slate-200 h-8"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Quick Notes */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800 tracking-wider">Ghi chú nhanh</h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">Nhập các lưu ý quan trọng (Mỗi dòng một ý ghi nhớ)</p>
                      <Textarea
                        value={formData.dayQuickNotes.join('\n')}
                        onChange={(e) => updateField('dayQuickNotes', e.target.value.split('\n'))}
                        placeholder="Ví dụ:&#10;Họp giao ban 15p buổi sáng&#10;Check tồn kho thực tế showroom"
                        rows={3}
                        className="rounded-xl border-slate-200 resize-none text-sm font-semibold"
                      />
                    </div>
                  </>
                )}

                <hr className="border-slate-100" />

                {/* 4. Nhịp review */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 tracking-wider">Nhịp review</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Tần suất review *</Label>
                      <CustomSelect
                        value={formData.reviewFrequency}
                        onChangeValue={(val) => updateField('reviewFrequency', val as ReviewFrequency)}
                        options={[
                          { label: 'Hàng ngày', value: 'daily' },
                          { label: 'Hàng tuần', value: 'weekly' },
                          { label: 'Hàng tháng', value: 'monthly' },
                        ]}
                        className="rounded-xl border-slate-200 text-slate-700 h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Người review *</Label>
                      <CustomSelect
                        value={formData.reviewerId}
                        onChangeValue={(val) => {
                          const st = staffMembers.find((x) => x.id === val);
                          updateField('reviewerId', String(val));
                          updateField('reviewerName', st?.fullName ?? '');
                        }}
                        placeholder="Chọn người review"
                        options={staffOptions}
                        className="rounded-xl border-slate-200 text-slate-700 h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Ngưỡng cảnh báo *</Label>
                      <CustomSelect
                        value={formData.alertThreshold}
                        onChangeValue={(val) => updateField('alertThreshold', Number(val))}
                        options={[
                          { label: '≥ 90% mục tiêu', value: 90 },
                          { label: '≥ 80% mục tiêu', value: 80 },
                          { label: '≥ 70% mục tiêu', value: 70 },
                        ]}
                        className="rounded-xl border-slate-200 text-slate-700 h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-500 font-bold">Hành động khi lệch *</Label>
                      <CustomSelect
                        value={formData.deviationAction}
                        onChangeValue={(val) => updateField('deviationAction', val as DeviationAction)}
                        options={[
                          { label: 'Họp điều chỉnh kế hoạch', value: 'adjust_plan' },
                          { label: 'Báo cáo lên cấp trên', value: 'escalate' },
                          { label: 'Hành động tùy chỉnh', value: 'custom' },
                        ]}
                        className="rounded-xl border-slate-200 text-slate-700 h-9"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 5. Liên kết module */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 tracking-wider">Liên kết module</h3>
                  </div>
                  <p className="text-sm font-semibold text-slate-400">Chỉ dùng để theo dõi, không nhập chi tiết việc tại đây.</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {LINKED_MODULE_CONFIG.map((mod) => {
                      const isActive = formData.linkedModules[mod.key];
                      return (
                        <div
                          key={mod.key}
                          onClick={() => handleToggleModule(mod.key)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-[#C21A1A]/5 border-[#C21A1A]/20'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <span className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                            {mod.label}
                          </span>
                          <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                            isActive ? 'bg-[#C21A1A]' : 'bg-slate-200'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                              isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Preview Info & Rules inside Card components */}
            <div className="space-y-4">
              {/* Card: Xem trước nhanh */}
              <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-3xl py-5">
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-black text-slate-600 tracking-wider">Xem trước nhanh</h4>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#C21A1A]/10 flex items-center justify-center shrink-0">
                          <Target className="w-4 h-4 text-[#C21A1A]" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-black text-slate-800 truncate">
                            {formData.name || getDefaultPlanName(formData.level, formData.startDate)}
                          </h5>
                        </div>
                      </div>
                      <span className="text-sm font-black text-[#f59e0b] bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-lg shrink-0">
                        {formData.level === 'quarter' ? 'Quý' : formData.level === 'month' ? 'Tháng' : formData.level === 'week' ? 'Tuần' : 'Ngày'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm font-semibold text-slate-500 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span>Owner</span>
                        <span className="text-slate-800 font-bold">{formData.ownerName || 'Nguyễn Văn A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Thời gian</span>
                        <span className="text-slate-800 font-bold truncate max-w-[200px]">
                          {formData.level === 'day' 
                            ? formatDateVN(formData.startDate)
                            : `${formatDateVN(formData.startDate)} – ${formatDateVN(formData.endDate)}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                        <span>Tiến độ tổng thể</span>
                        <span>{editPlan ? `${editPlan.progress}%` : '0%'}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#C21A1A] rounded-full transition-all duration-350" 
                          style={{ width: `${editPlan ? editPlan.progress : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Nguyên tắc 20/80 */}
              <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-3xl py-5">
                <CardContent className="space-y-3">
                  <h4 className="text-sm font-black text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Nguyên tắc 20/80
                  </h4>
                  <ul className="space-y-2">
                    {[
                      'Ít nhưng trong trọng tâm',
                      'Mỗi kế hoạch phải đo được',
                      'Không ôm quá nhiều ưu tiên',
                      'Review đều mới có giá trị',
                    ].map((rule) => (
                      <li key={rule} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C21A1A] mt-1.5 shrink-0" />
                        <span className="text-sm font-semibold text-slate-500 leading-normal">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Card: Phân biệt với Công việc */}
              <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-3xl py-5">
                <CardContent className="space-y-4">
                  <h4 className="text-sm font-black text-slate-700 tracking-wider flex items-center gap-1.5">
                    Phân biệt với Công việc
                  </h4>
                  <div className="space-y-3">
                    {[
                      { emoji: '🎯', title: 'Kế hoạch = hướng đi', desc: 'Xác định mục tiêu và ưu tiên cần đạt.' },
                      { emoji: '📋', title: 'Công việc = việc phải làm', desc: 'Là các nhiệm vụ để triển khai kế hoạch.' },
                      { emoji: '📊', title: 'KPI = số đo', desc: 'Đo lường kết quả thực tế so với mục tiêu.' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-2.5">
                        <span className="text-lg mt-0.5">{item.emoji}</span>
                        <div>
                          <span className="text-sm font-bold text-slate-700 block leading-tight">{item.title}</span>
                          <span className="text-sm font-semibold text-slate-400 mt-0.5 block leading-normal">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>

        {/* ─── Sheet Footer ─────────────────────────────────────────────── */}
        <SheetFooter className="shrink-0 flex flex-row items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 rounded-xl"
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Lưu nháp
          </Button>
          <Button
            type="button"
            onClick={handleActivate}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-white bg-[#C21A1A] rounded-xl hover:bg-[#a51616] shadow-sm transition-all"
          >
            <Zap className="w-4 h-4" />
            {editPlan ? 'Lưu thay đổi' : 'Kích hoạt kế hoạch'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
