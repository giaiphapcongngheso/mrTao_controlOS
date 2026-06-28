import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Save, Zap, Trash2, Plus, CalendarRange, Target, RefreshCw,
  Link2, Clock, ArrowRight, Check, ChevronDown, Info, Flame,
  BarChart3, Trophy, Star
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../../../../share/ui/sheet';
import { ButtonGroup } from '../../../../share/ui/button-group';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../../share/ui/tooltip';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../../share/ui/accordion';
import { Progress } from '../../../../share/ui/progress';
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  Input,
  Textarea,
  NumericInput
} from '../../../../share/ui';
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
  DaySlotStatus,
  IndicatorStatus,
  PlanLiveIndicator
} from '../../../types/plans.types';
import { generateEntityId } from '../../../types/base.types';
import { PLAN_LEVEL_LABELS, LINKED_MODULE_CONFIG, DEFAULT_DAY_TIME_SLOTS, formatDateVN, formatCurrencyVN } from '../plan-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanLiveIndicatorForm {
  id?: string;
  name: string;
  targetValue: number;
  unit: string;
  ownerId: string;
  ownerName: string;
  status: IndicatorStatus;
}

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
  liveIndicators: PlanLiveIndicatorForm[];
  // Hierarchy
  parentPlanId: string;
  // Day specific
  dayTimeSlots: PlanTimeSlot[];
  dayMitTasks: PlanMITTask[];
  dayQuickNotes: string[];
}

const INITIAL_FORM: PlanFormData = {
  name: '',
  level: 'month',
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
  liveIndicators: [],
  parentPlanId: '',
  dayTimeSlots: [],
  dayMitTasks: [],
  dayQuickNotes: [],
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMembers: Array<{ id: string; fullName: string; avatar?: string }>;
  onSubmit: (
    data: PlanRequestType,
    dayScheduleData?: { timeSlots: PlanTimeSlot[]; mitTasks: PlanMITTask[]; quickNotes: string[]; date: string },
    liveIndicatorsData?: PlanLiveIndicatorForm[]
  ) => Promise<void>;
  isSubmitting?: boolean;
  editPlan?: PlanDocument | null;
  availablePlans?: PlanDocument[];
  daySchedules?: PlanDaySchedule[];
  indicators?: PlanLiveIndicator[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Section config for Accordion ────────────────────────────────────────────

interface SectionConfig {
  id: string;
  icon: string;
  label: string;
  colorClass: string;
  tipText?: string;
}

const SECTION_GENERAL: SectionConfig = { id: 'general', icon: '📋', label: 'Thông tin chung', colorClass: 'text-slate-700' };
const SECTION_TARGET: SectionConfig = { id: 'target', icon: '🎯', label: 'Mục tiêu & Kết quả', colorClass: 'text-emerald-700', tipText: 'Xác định kết quả cốt lõi và chỉ tiêu định lượng cần đạt trong kỳ kế hoạch.' };
const SECTION_LEVERAGE: SectionConfig = { id: 'leverage', icon: '⚡', label: '3 Đòn bẩy 20/80', colorClass: 'text-amber-700', tipText: 'Nguyên tắc 20/80: Tập trung 20% công sức vào 3 việc cốt lõi tạo ra 80% kết quả.' };
const SECTION_BATTLE: SectionConfig = { id: 'battle', icon: '🔥', label: '3 Trận đánh lớn', colorClass: 'text-red-700', tipText: '3 mặt trận chiến dịch quan trọng nhất phải thắng bằng mọi giá trong quý.' };
const SECTION_KPI: SectionConfig = { id: 'kpi', icon: '📈', label: 'KPI hàng ngày', colorClass: 'text-violet-700', tipText: 'Các chỉ số cốt lõi showroom cần theo dõi hàng ngày.' };
const SECTION_PRIORITY: SectionConfig = { id: 'priority', icon: '🏆', label: '3–5 Ưu tiên chính', colorClass: 'text-blue-700', tipText: 'Không ôm quá nhiều ưu tiên. Mỗi ưu tiên phải đo được kết quả cụ thể.' };
const SECTION_REVIEW: SectionConfig = { id: 'review', icon: '🔄', label: 'Nhịp Review', colorClass: 'text-teal-700', tipText: 'Review đều mới có giá trị. Thiết lập tần suất và người review phù hợp.' };
const SECTION_MODULES: SectionConfig = { id: 'modules', icon: '🔗', label: 'Liên kết Module', colorClass: 'text-indigo-700', tipText: 'Chỉ dùng để theo dõi, không nhập chi tiết việc tại đây.' };

// ─── Sub-components ──────────────────────────────────────────────────────────

// Section header used inside AccordionTrigger
const SectionHeader = React.memo(function SectionHeader({
  section,
  isCompleted,
}: {
  section: SectionConfig;
  isCompleted: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <span className="text-xl leading-none shrink-0">{section.icon}</span>
      <span className={`text-[17px] font-semibold ${section.colorClass} truncate`}>
        {section.label}
      </span>
      {section.tipText && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-sm font-medium">
            {section.tipText}
          </TooltipContent>
        </Tooltip>
      )}
      <div className="ml-auto shrink-0">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> Đã điền
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-300">Chưa điền</span>
        )}
      </div>
    </div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PlanForm({
  open,
  onOpenChange,
  staffMembers,
  onSubmit,
  isSubmitting = false,
  editPlan = null,
  availablePlans = [],
  daySchedules = [],
  indicators = [],
}: PlanFormProps) {
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

        const planIndicators = editPlan.level === 'quarter'
          ? indicators.filter((ind) => ind.planId === editPlan.id && !ind.deletedAt)
          : [];

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
          liveIndicators: planIndicators.map((ind) => ({
            id: ind.id,
            name: ind.name,
            targetValue: ind.targetValue,
            unit: ind.unit,
            ownerId: ind.ownerId,
            ownerName: ind.ownerName,
            status: ind.status
          })),
          parentPlanId: editPlan.parentPlanId ?? '',
          dayTimeSlots: daySched?.timeSlots ?? [],
          dayMitTasks: daySched?.mitTasks ?? [],
          dayQuickNotes: daySched?.quickNotes ?? [],
        });
      } else {
        setFormData(INITIAL_FORM);
      }
    }
  }, [open, editPlan, daySchedules, indicators]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLevelChange = useCallback((level: PlanLevel) => {
    setFormData((prev) => {
      const next = { ...prev, level };
      if (level === 'day' && prev.startDate) {
        next.endDate = prev.startDate;
      }
      return next;
    });
  }, []);

  const handleStartDateChange = useCallback((dateStr: string) => {
    setFormData((prev) => {
      if (prev.level === 'day') {
        return { ...prev, startDate: dateStr, endDate: dateStr };
      }
      return { ...prev, startDate: dateStr };
    });
  }, []);

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

  const handleAddLeveragePoint = useCallback(() => {
    setFormData((prev) => {
      if (prev.leveragePoints.length >= 5) return prev;
      return { ...prev, leveragePoints: [...prev.leveragePoints, ''] };
    });
  }, []);

  const handleRemoveLeveragePoint = useCallback((index: number) => {
    setFormData((prev) => {
      if (prev.leveragePoints.length <= 1) return prev;
      return { ...prev, leveragePoints: prev.leveragePoints.filter((_, i) => i !== index) };
    });
  }, []);

  const handleUpdateBattleTarget = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.battleTargets];
      updated[index] = value;
      return { ...prev, battleTargets: updated };
    });
  }, []);

  const handleAddBattleTarget = useCallback(() => {
    setFormData((prev) => {
      if (prev.battleTargets.length >= 5) return prev;
      return { ...prev, battleTargets: [...prev.battleTargets, ''] };
    });
  }, []);

  const handleRemoveBattleTarget = useCallback((index: number) => {
    setFormData((prev) => {
      if (prev.battleTargets.length <= 1) return prev;
      return { ...prev, battleTargets: prev.battleTargets.filter((_, i) => i !== index) };
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

  // Live Indicators handlers (Quarter specific)
  const handleAddLiveIndicator = useCallback(() => {
    const newIndicator: PlanLiveIndicatorForm = {
      name: '',
      targetValue: 0,
      unit: '',
      ownerId: '',
      ownerName: '',
      status: 'near_target'
    };
    updateField('liveIndicators', [...formData.liveIndicators, newIndicator]);
  }, [formData.liveIndicators, updateField]);

  const handleUpdateLiveIndicator = useCallback((index: number, field: keyof PlanLiveIndicatorForm, value: any) => {
    const updated = formData.liveIndicators.map((ind, i) => {
      if (i !== index) return ind;
      if (field === 'ownerId') {
        const staff = staffMembers.find((s) => s.id === value);
        return { ...ind, ownerId: value, ownerName: staff?.fullName ?? '' };
      }
      return { ...ind, [field]: value };
    });
    updateField('liveIndicators', updated);
  }, [formData.liveIndicators, staffMembers, updateField]);

  const handleRemoveLiveIndicator = useCallback((index: number) => {
    const updated = formData.liveIndicators.filter((_, i) => i !== index);
    updateField('liveIndicators', updated);
  }, [formData.liveIndicators, updateField]);

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

    await onSubmit(payload, daySchedulePayload, formData.liveIndicators);
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

  // ── Section completion check ────────────────────────────────────────────────

  const sectionCompletionMap = useMemo(() => {
    const isDay = formData.level === 'day';
    const isQuarter = formData.level === 'quarter';

    const generalDone = !!(formData.name || formData.ownerId || formData.startDate);
    const targetDone = !isDay && !!(formData.description || formData.revenueTarget || formData.profitMarginTarget);
    const leverageDone = isQuarter && formData.leveragePoints.some((lp) => lp.trim().length > 0);
    const battleDone = isQuarter && formData.battleTargets.some((bt) => bt.trim().length > 0);
    const kpiDone = isQuarter && formData.liveIndicators.length > 0;
    const priorityDone = !isDay && formData.priorities.length > 0;
    const reviewDone = !!(formData.reviewerId);
    const modulesDone = true; // always has defaults

    return {
      general: generalDone,
      target: targetDone,
      leverage: leverageDone,
      battle: battleDone,
      kpi: kpiDone,
      priority: priorityDone,
      review: reviewDone,
      modules: modulesDone,
    };
  }, [formData]);

  // Calculate visible sections + completion %
  const { completedSections, totalSections, completionPercent } = useMemo(() => {
    const isDay = formData.level === 'day';
    const isQuarter = formData.level === 'quarter';

    // Build visible section list
    const visibleKeys: (keyof typeof sectionCompletionMap)[] = ['general'];
    if (!isDay) visibleKeys.push('target');
    if (isQuarter) visibleKeys.push('leverage', 'battle', 'kpi');
    if (!isDay) visibleKeys.push('priority');
    visibleKeys.push('review', 'modules');

    const total = visibleKeys.length;
    const completed = visibleKeys.filter((k) => sectionCompletionMap[k]).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completedSections: completed, totalSections: total, completionPercent: percent };
  }, [formData.level, sectionCompletionMap]);

  // Default open sections for Accordion
  const defaultAccordionValues = useMemo(() => {
    const isDay = formData.level === 'day';
    const isQuarter = formData.level === 'quarter';
    const values = ['general'];
    if (!isDay) values.push('target');
    if (isQuarter) values.push('leverage', 'battle', 'kpi');
    if (!isDay) values.push('priority');
    values.push('review', 'modules');
    return values;
  }, [formData.level]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[85vw] max-w-[85vw] sm:max-w-[85vw] flex-col p-0 gap-0 text-slate-700"
      >
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div>
            <SheetTitle className="text-lg font-black text-slate-800">
              {editPlan ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch mới'}
            </SheetTitle>
            {editPlan && (
              <SheetDescription className="text-sm text-slate-400 font-semibold mt-0.5">
                Đang sửa: {editPlan.name}
              </SheetDescription>
            )}
          </div>
        </SheetHeader>

        {/* ─── Progress Bar ────────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-500">Tiến độ điền form</span>
            <span className="font-bold text-slate-700">
              {completedSections}/{totalSections} phần • {completionPercent}%
            </span>
          </div>
          <Progress
            value={completionPercent}
            className="h-1.5 bg-slate-100"
            indicatorClassName="bg-[#C21A1A]"
          />
        </div>

        {/* ─── Sheet Body (scrollable) ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-slate-50/25">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 px-6 py-6 min-h-full">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* Left Column: Accordion Form Sections                       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div>
              <Accordion
                type="multiple"
                defaultValue={defaultAccordionValues}
                className="space-y-3"
              >

                {/* ─── 1. Thông tin chung ────────────────────────────────── */}
                <AccordionItem value="general">
                  <Card className="border border-slate-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <SectionHeader section={SECTION_GENERAL} isCompleted={sectionCompletionMap.general} />
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0">
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
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                {/* ─── 2. Mục tiêu & Kết quả ────────────────────────────── */}
                {formData.level !== 'day' && (
                  <AccordionItem value="target">
                    <Card className="border border-slate-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <SectionHeader section={SECTION_TARGET} isCompleted={sectionCompletionMap.target} />
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <div className="space-y-5">
                          {/* Textarea kết quả cần đạt */}
                          <div className="space-y-1.5">
                            <Label className="text-slate-500 font-bold">Kết quả cần đạt</Label>
                            <Textarea
                              value={formData.description}
                              onChange={(e) => updateField('description', e.target.value)}
                              placeholder={'Ví dụ: "Đạt doanh thu 2.2 tỷ, ký 3 hợp đồng mới, giảm tỷ lệ hàng tồn xuống dưới 15%, tuyển thêm 2 nhân sự sales"'}
                              rows={4}
                              className="rounded-xl border-slate-200 resize-none min-h-[120px]"
                            />
                            <p className="text-xs font-normal text-slate-400">
                              Gợi ý: Kết quả càng cụ thể và đo lường được, kế hoạch càng dễ thành công.
                            </p>
                          </div>

                          {/* Card: Mục tiêu định lượng */}
                          <Card className="border border-slate-200/60 shadow-none bg-slate-50/50 rounded-xl py-0">
                            <CardHeader className="px-4 pt-4 pb-2">
                              <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                Mục tiêu định lượng
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 pt-0">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-slate-500 font-bold text-xs">Doanh thu mục tiêu (VND)</Label>
                                  <NumericInput
                                    value={formData.revenueTarget || ''}
                                    onValueChange={(val) => updateField('revenueTarget', val ?? 0)}
                                    placeholder="Ví dụ: 2.200.000.000"
                                    className="rounded-xl border-slate-200"
                                    allowDecimal={false}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-slate-500 font-bold text-xs">Lợi nhuận / biên (%)</Label>
                                  <NumericInput
                                    value={formData.profitMarginTarget || ''}
                                    onValueChange={(val) => updateField('profitMarginTarget', val ?? 0)}
                                    placeholder="Ví dụ: 20"
                                    className="rounded-xl border-slate-200"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-slate-500 font-bold text-xs">Mục tiêu khác (tùy chọn)</Label>
                                  <Input
                                    type="text"
                                    placeholder="Ví dụ: Thị phần, Khách hàng mới..."
                                    className="rounded-xl border-slate-200 placeholder:text-slate-300"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                )}

                {/* ─── 3. Đòn bẩy 20/80 (Quarter only) ──────────────────── */}
                {formData.level === 'quarter' && (
                  <AccordionItem value="leverage">
                    <Card className="border border-amber-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <SectionHeader section={SECTION_LEVERAGE} isCompleted={sectionCompletionMap.leverage} />
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <div className="space-y-3">
                          {formData.leveragePoints.map((lp, idx) => (
                            <Card key={idx} className="border border-amber-100 shadow-none bg-amber-50/30 rounded-xl py-0">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      type="text"
                                      value={lp}
                                      onChange={(e) => handleUpdateLeveragePoint(idx, e.target.value)}
                                      placeholder={`Đòn bẩy #${idx + 1}: ${
                                        idx === 0 ? 'Ví dụ: Tối ưu quy trình chốt sale' :
                                        idx === 1 ? 'Ví dụ: Tăng chất lượng lead đầu vào' :
                                        'Ví dụ: Đào tạo đội ngũ kỹ năng tư vấn'
                                      }`}
                                      className="rounded-lg border-slate-200 text-sm font-semibold"
                                    />
                                  </div>
                                  {formData.leveragePoints.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveLeveragePoint(idx)}
                                      className="w-8 h-8 p-0 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {formData.leveragePoints.length < 5 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddLeveragePoint}
                              className="w-full py-2 text-sm font-bold text-amber-600 bg-amber-50/50 border border-dashed border-amber-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm đòn bẩy
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                )}

                {/* ─── 4. Trận đánh lớn (Quarter only) ───────────────────── */}
                {formData.level === 'quarter' && (
                  <AccordionItem value="battle">
                    <Card className="border border-red-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <SectionHeader section={SECTION_BATTLE} isCompleted={sectionCompletionMap.battle} />
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <div className="space-y-3">
                          {formData.battleTargets.map((bt, idx) => (
                            <Card key={idx} className="border border-red-100 shadow-none bg-red-50/20 rounded-xl py-0">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      type="text"
                                      value={bt}
                                      onChange={(e) => handleUpdateBattleTarget(idx, e.target.value)}
                                      placeholder={`Trận đánh #${idx + 1}: ${
                                        idx === 0 ? 'Ví dụ: Doanh thu & dòng tiền' :
                                        idx === 1 ? 'Ví dụ: SOP & KPI vận hành' :
                                        'Ví dụ: Văn hóa & đội ngũ'
                                      }`}
                                      className="rounded-lg border-slate-200 text-sm font-semibold"
                                    />
                                  </div>
                                  {formData.battleTargets.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveBattleTarget(idx)}
                                      className="w-8 h-8 p-0 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {formData.battleTargets.length < 5 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddBattleTarget}
                              className="w-full py-2 text-sm font-bold text-red-600 bg-red-50/50 border border-dashed border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm trận đánh
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                )}

                {/* ─── 5. KPI hàng ngày (Quarter only) ───────────────────── */}
                {formData.level === 'quarter' && (
                  <AccordionItem value="kpi">
                    <Card className="border border-violet-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <SectionHeader section={SECTION_KPI} isCompleted={sectionCompletionMap.kpi} />
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        {formData.liveIndicators.length > 0 ? (
                          <div className="space-y-3">
                            {/* Indicator table */}
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                              <Table className="w-full text-left table-fixed min-w-[700px]">
                                <TableHeader>
                                  <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-transparent">
                                    <TableHead className="text-xs font-bold text-slate-455 py-2.5 px-3 w-[35%]">Tên chỉ số</TableHead>
                                    <TableHead className="text-xs font-bold text-slate-455 py-2.5 px-3 w-[20%]">Mục tiêu ngày</TableHead>
                                    <TableHead className="text-xs font-bold text-slate-455 py-2.5 px-3 w-[15%]">Đơn vị</TableHead>
                                    <TableHead className="text-xs font-bold text-slate-455 py-2.5 px-3 w-[25%]">Chủ sở hữu</TableHead>
                                    <TableHead className="py-2.5 px-3 w-[50px] text-center" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {formData.liveIndicators.map((ind, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/10">
                                      <TableCell className="py-2 px-3 align-middle">
                                        <Input
                                          type="text"
                                          value={ind.name}
                                          onChange={(e) => handleUpdateLiveIndicator(idx, 'name', e.target.value)}
                                          placeholder="Ví dụ: Doanh thu ngày"
                                          className="rounded-xl border-slate-200 h-9 text-sm"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2 px-3 align-middle">
                                        <NumericInput
                                          value={ind.targetValue || ''}
                                          onValueChange={(val) => handleUpdateLiveIndicator(idx, 'targetValue', val ?? 0)}
                                          placeholder="Ví dụ: 30"
                                          className="rounded-xl border-slate-200 h-9 text-sm"
                                          allowDecimal={true}
                                        />
                                      </TableCell>
                                      <TableCell className="py-2 px-3 align-middle">
                                        <Input
                                          type="text"
                                          value={ind.unit}
                                          onChange={(e) => handleUpdateLiveIndicator(idx, 'unit', e.target.value)}
                                          placeholder="triệu, lead..."
                                          className="rounded-xl border-slate-200 h-9 text-sm"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2 px-3 align-middle">
                                        <CustomSelect
                                          options={staffOptions}
                                          value={ind.ownerId}
                                          onChangeValue={(val) => handleUpdateLiveIndicator(idx, 'ownerId', val)}
                                          placeholder="Chọn Owner"
                                          className="rounded-xl border-slate-200 h-9 text-sm text-slate-800"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2 px-3 text-center align-middle">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveLiveIndicator(idx)}
                                          className="w-8 h-8 p-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Add more button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddLiveIndicator}
                              className="flex items-center gap-1 px-3 h-8 text-xs font-bold text-violet-600 border-violet-200 bg-violet-50/50 hover:bg-violet-50 rounded-xl cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm chỉ số
                            </Button>
                          </div>
                        ) : (
                          /* ── Empty state with visual KPI examples ───── */
                          <Card className="border border-dashed border-slate-200 shadow-none bg-slate-50/30 rounded-2xl py-0">
                            <CardContent className="p-6 text-center space-y-4">
                              <div className="flex justify-center gap-3 flex-wrap">
                                {/* KPI example mini cards */}
                                <Card className="border border-emerald-100 shadow-none bg-emerald-50/60 rounded-xl py-0 px-0">
                                  <CardContent className="px-3 py-2.5">
                                    <span className="font-bold text-emerald-700 text-xs block">Doanh thu ngày</span>
                                    <span className="text-emerald-500 text-xs block mt-0.5">30 triệu/ngày</span>
                                  </CardContent>
                                </Card>
                                <Card className="border border-blue-100 shadow-none bg-blue-50/60 rounded-xl py-0 px-0">
                                  <CardContent className="px-3 py-2.5">
                                    <span className="font-bold text-blue-700 text-xs block">Lead mới</span>
                                    <span className="text-blue-500 text-xs block mt-0.5">5 lead/ngày</span>
                                  </CardContent>
                                </Card>
                                <Card className="border border-amber-100 shadow-none bg-amber-50/60 rounded-xl py-0 px-0">
                                  <CardContent className="px-3 py-2.5">
                                    <span className="font-bold text-amber-700 text-xs block">Tỷ lệ chốt</span>
                                    <span className="text-amber-500 text-xs block mt-0.5">≥ 25%</span>
                                  </CardContent>
                                </Card>
                              </div>
                              <p className="text-sm text-slate-400 font-semibold">
                                Thêm chỉ số để theo dõi hiệu quả kinh doanh hàng ngày
                              </p>
                              <Button
                                type="button"
                                onClick={handleAddLiveIndicator}
                                className="px-5 py-2 text-sm font-bold text-white bg-[#C21A1A] rounded-xl hover:bg-[#a51616] shadow-sm cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                Thêm KPI đầu tiên
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                )}

                {/* ─── 6. Ưu tiên chính (Quarter / Month / Week) ─────────── */}
                {formData.level !== 'day' && (
                  <AccordionItem value="priority">
                    <Card className="border border-blue-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <SectionHeader section={SECTION_PRIORITY} isCompleted={sectionCompletionMap.priority} />
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        {formData.priorities.length > 0 ? (
                          <div className="space-y-3">
                            {formData.priorities.map((p, idx) => (
                              <Card key={p.id} className="border border-blue-100/60 shadow-none bg-blue-50/10 rounded-xl py-0">
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 space-y-2.5">
                                      <Input
                                        type="text"
                                        value={p.title}
                                        onChange={(e) => handleUpdatePriority(idx, 'title', e.target.value)}
                                        placeholder="Tên ưu tiên"
                                        className="rounded-lg border-slate-200 text-sm font-bold text-slate-700"
                                      />
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                        <Input
                                          type="text"
                                          value={p.expectedResult}
                                          onChange={(e) => handleUpdatePriority(idx, 'expectedResult', e.target.value)}
                                          placeholder="Kết quả kỳ vọng"
                                          className="rounded-lg border-slate-200 text-sm font-semibold text-slate-500"
                                        />
                                        <DatePicker
                                          value={parseInputDate(p.deadline)}
                                          onChange={(date) => handleUpdatePriority(idx, 'deadline', formatToInputDate(date))}
                                          className="rounded-lg border-slate-200"
                                        />
                                        <CustomSelect
                                          value={p.ownerId}
                                          onChangeValue={(val) => handleUpdatePriority(idx, 'ownerId', String(val))}
                                          placeholder="Chọn Owner"
                                          options={staffOptions}
                                          className="rounded-lg border-slate-200"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemovePriority(idx)}
                                      className="w-8 h-8 p-0 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddPriority}
                              className="w-full py-2.5 text-sm font-bold text-blue-500 bg-blue-50/50 border border-dashed border-blue-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm ưu tiên
                            </Button>
                          </div>
                        ) : (
                          /* ── Empty state ───── */
                          <Card className="border border-dashed border-slate-200 shadow-none bg-slate-50/30 rounded-2xl py-0">
                            <CardContent className="p-6 text-center space-y-3">
                              <div className="w-12 h-12 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-600">Chưa có ưu tiên nào</p>
                                <p className="text-xs text-slate-400 mt-0.5">Thêm 3–5 ưu tiên để tập trung đội ngũ vào mục tiêu cốt lõi</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddPriority}
                                className="px-4 py-2 text-sm font-bold text-blue-600 border-blue-200 bg-blue-50/50 rounded-xl hover:bg-blue-50 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Thêm ưu tiên đầu tiên
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                )}

                {/* ─── Day level: MIT Tasks ───────────────────────────────── */}
                {formData.level === 'day' && (
                  <>
                    <AccordionItem value="mit-day">
                      <Card className="border border-slate-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          <SectionHeader
                            section={{ id: 'mit', icon: '⚡', label: 'MIT hôm nay (1–3 việc đòn bẩy)', colorClass: 'text-red-700' }}
                            isCompleted={formData.dayMitTasks.some(m => m.title.trim().length > 0)}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 pt-0">
                          <p className="text-sm font-semibold text-slate-400 mb-3">Những công việc quan trọng nhất quyết định kết quả của ngày</p>

                          <div className="space-y-3">
                            {formData.dayMitTasks.map((mit, idx) => (
                              <Card key={mit.id || idx} className="border border-slate-100 shadow-none bg-slate-50/20 rounded-xl py-0">
                                <CardContent className="p-3 space-y-2">
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
                                      className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-lg shrink-0 cursor-pointer"
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
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {formData.dayMitTasks.length < 3 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddMit}
                              className="w-full py-2 mt-3 text-sm font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm việc đòn bẩy (MIT)
                            </Button>
                          )}
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* Time Slots */}
                    <AccordionItem value="timeslots-day">
                      <Card className="border border-slate-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          <SectionHeader
                            section={{ id: 'timeslots', icon: '🕐', label: 'Kế hoạch theo khung giờ', colorClass: 'text-slate-700' }}
                            isCompleted={formData.dayTimeSlots.some(s => s.task.trim().length > 0)}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 pt-0">
                          {formData.dayTimeSlots.length === 0 && (
                            <div className="text-center py-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleInitTimeSlots}
                                className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 gap-1 h-8 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 text-slate-400" />
                                Tạo 6 khung giờ chuẩn
                              </Button>
                            </div>
                          )}

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
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* Quick Notes */}
                    <AccordionItem value="notes-day">
                      <Card className="border border-slate-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          <SectionHeader
                            section={{ id: 'notes', icon: '📝', label: 'Ghi chú nhanh', colorClass: 'text-slate-700' }}
                            isCompleted={formData.dayQuickNotes.some(n => n.trim().length > 0)}
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 pt-0">
                          <p className="text-sm font-semibold text-slate-400 mb-3">Nhập các lưu ý quan trọng (Mỗi dòng một ý ghi nhớ)</p>
                          <Textarea
                            value={formData.dayQuickNotes.join('\n')}
                            onChange={(e) => updateField('dayQuickNotes', e.target.value.split('\n'))}
                            placeholder={'Ví dụ:\nHọp giao ban 15p buổi sáng\nCheck tồn kho thực tế showroom'}
                            rows={3}
                            className="rounded-xl border-slate-200 resize-none text-sm font-semibold"
                          />
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </>
                )}

                {/* ─── 7. Nhịp Review ────────────────────────────────────── */}
                <AccordionItem value="review">
                  <Card className="border border-teal-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <SectionHeader section={SECTION_REVIEW} isCompleted={sectionCompletionMap.review} />
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                {/* ─── 8. Liên kết Module ─────────────────────────────────── */}
                <AccordionItem value="modules">
                  <Card className="border border-indigo-100/80 shadow-xs bg-white overflow-hidden rounded-2xl py-0">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <SectionHeader section={SECTION_MODULES} isCompleted={sectionCompletionMap.modules} />
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0">
                      <div className="flex flex-wrap gap-2">
                        {LINKED_MODULE_CONFIG.map((mod) => {
                          const isActive = formData.linkedModules[mod.key];
                          return (
                            <button
                              key={mod.key}
                              type="button"
                              onClick={() => handleToggleModule(mod.key)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold border transition-all select-none cursor-pointer ${
                                isActive
                                  ? 'bg-[#C21A1A] text-white border-[#C21A1A] shadow-sm'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                              {mod.label}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

              </Accordion>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* Right Column: Sticky Sidebar                               */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="hidden xl:block">
              <div className="sticky top-6 space-y-4">

                {/* Card: Xem trước nhanh */}
                <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-2xl py-5">
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
                          <span className="text-slate-800 font-bold">{formData.ownerName || 'Chưa chọn'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Thời gian</span>
                          <span className="text-slate-800 font-bold truncate max-w-[160px]">
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

                {/* Card: Tiến độ điền form */}
                <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-2xl py-5">
                  <CardContent className="space-y-3">
                    <h4 className="text-sm font-black text-slate-600 tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                      Tiến độ điền form
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-500">Đã hoàn thành</span>
                        <span className="font-black text-[#C21A1A]">{completionPercent}%</span>
                      </div>
                      <Progress
                        value={completionPercent}
                        className="h-2 bg-slate-100"
                        indicatorClassName="bg-[#C21A1A]"
                      />
                      <p className="text-xs font-semibold text-slate-400">
                        {completedSections}/{totalSections} phần đã được điền
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Card: Tips nhỏ gọn */}
                <Card className="border border-slate-100 p-0 shadow-xs bg-white rounded-2xl py-5">
                  <CardContent className="space-y-3">
                    <h4 className="text-sm font-black text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Mẹo hay
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
              </div>
            </div>

          </div>
        </div>

        {/* ─── Sheet Footer ─────────────────────────────────────────── */}
        <SheetFooter className="shrink-0 flex flex-row items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 rounded-xl cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Lưu nháp
          </Button>
          <Button
            type="button"
            onClick={handleActivate}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-white bg-[#C21A1A] rounded-xl hover:bg-[#a51616] shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            {editPlan
              ? (editPlan.status === 'draft' ? 'Kích hoạt' : 'Lưu thay đổi')
              : 'Tạo kế hoạch'
            }
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
