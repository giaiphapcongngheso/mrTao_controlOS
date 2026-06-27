import React, { useCallback, useMemo, useState } from 'react';
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
import type { PlanRequestType, PlanLevel, PlanPriority, PlanLinkedModules, ReviewFrequency, DeviationAction } from '../../../types/plans.types';
import { generateEntityId } from '../../../types/base.types';
import { PLAN_LEVEL_LABELS, LINKED_MODULE_CONFIG } from '../constants/plan-constants';
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
};

interface PlanCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMembers: Array<{ id: string; fullName: string; avatar?: string }>;
  onSubmit: (data: PlanRequestType) => Promise<void>;
  isSubmitting?: boolean;
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
}: PlanCreateWizardProps) {
  const [formData, setFormData] = useState<PlanFormData>(INITIAL_FORM);

  const updateField = useCallback(<K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

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

  const handleUpdatePriority = useCallback((index: number, field: keyof PlanPriority, value: string) => {
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
      priorities: formData.priorities.map((p, i) => ({
        ...p,
        id: p.id || generateEntityId('pr'),
        order: i + 1,
      })),
      reviewFrequency: formData.reviewFrequency,
      reviewerId: formData.reviewerId || staffMembers[0]?.id || '',
      reviewerName: formData.reviewerName || staffMembers[0]?.fullName || 'Nguyễn Văn A',
      alertThreshold: formData.alertThreshold,
      deviationAction: formData.deviationAction,
      linkedModules: formData.linkedModules,
      status: asDraft ? 'draft' : 'active',
      progress: 0,
    };
    await onSubmit(payload);
  }, [formData, onSubmit, staffMembers]);

  const handleSaveDraft = useCallback(() => void handleSubmit(true), [handleSubmit]);
  const handleActivate = useCallback(() => void handleSubmit(false), [handleSubmit]);

  const handleToggleModule = useCallback((key: keyof PlanLinkedModules) => {
    updateField('linkedModules', {
      ...formData.linkedModules,
      [key]: !formData.linkedModules[key],
    });
  }, [formData.linkedModules, updateField]);

  // Map staff options for custom select
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
              Tạo kế hoạch mới
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-400 font-semibold mt-0.5">
              Thiết lập mục tiêu, kết quả cần đạt và nhịp review thật đơn giản
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
                            onClick={() => updateField('level', level)}
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
                      <div className="flex items-center gap-1">
                        <DatePicker
                          value={parseInputDate(formData.startDate)}
                          onChange={(date) => updateField('startDate', formatToInputDate(date))}
                          className="rounded-xl border-slate-200"
                        />
                        <ArrowRight className="text-slate-400 w-4 h-4 shrink-0 mx-1" strokeWidth={3} />
                        <DatePicker
                          value={parseInputDate(formData.endDate)}
                          onChange={(date) => updateField('endDate', formatToInputDate(date))}
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

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
                        className="rounded-xl border-slate-200"
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
                        className="rounded-xl border-slate-200"
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
                        className="rounded-xl border-slate-200"
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
                        className="rounded-xl border-slate-200"
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
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C21A1A]/10 flex items-center justify-center">
                          <Target className="w-4 h-4 text-[#C21A1A]" />
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-slate-800">
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
                        <span className="text-slate-800 font-bold">
                          {formatDateVN(formData.startDate)} – {formatDateVN(formData.endDate)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                        <span>Tiến độ tổng thể</span>
                        <span>0%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-[#C21A1A] rounded-full" />
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
            Kích hoạt kế hoạch
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
