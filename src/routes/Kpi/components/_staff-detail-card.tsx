import React, { useMemo, useState, useCallback } from 'react';
import { Save, Loader2, DollarSign } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../../../../share/ui/avatar';
import { Input } from '../../../../share/ui/input';
import { Label } from '../../../../share/ui/label';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { Button } from '../../../shared/components/button';
import { KpiStatusBadge } from './_kpi-status-badge';
import { formatValue, getAvatarUrl } from '../kpi-utils';
import { toastSuccess, toastError } from '../../../shared/lib/toast';
import { MobileCard } from '@/src/components/custom/mobile-card';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import type { RanksTimeframe, PeriodKpiDetail, RevenueStats } from '../kpi-utils';
import type { KPIStaffMonthlyConfig } from '../../../types/kpi.types';

interface StaffDetailCardProps {
  roles: StaffRole[];
  staff: StaffMember;
  score: number;
  ranksTimeframe: RanksTimeframe;
  periodRevenueStats: RevenueStats;
  periodKpis: PeriodKpiDetail[];
  ranksMonth: string;
  ranksQuarter: number;
  ranksYear: number;
  revenueGrowth: {
    pct: number;
    isGrow: boolean;
    label: string;
  };
  monthlyConfigs: KPIStaffMonthlyConfig[];
  onSaveMonthlyConfig: (config: KPIStaffMonthlyConfig) => Promise<any>;
  isAdminOrOwner?: boolean;
}

const getClassificationLabel = (score: number) => {
  if (score >= 90) return 'Đạt tốt';
  if (score >= 80) return 'Khá';
  if (score >= 70) return 'Đạt';
  return 'Cần cải thiện';
};

const DISCIPLINE_OPTIONS = [
  { label: '1.0 - Không vi phạm', value: '1' },
  { label: '0.9 - Nhắc nhở', value: '0.9' },
  { label: '0.8 - Kỷ luật mức 1', value: '0.8' },
  { label: '0.5 - Kỷ luật mức 2', value: '0.5' },
  { label: '0.0 - Vi phạm nặng', value: '0' },
];

export const StaffDetailCard = React.memo(function StaffDetailCard({
  roles,
  staff,
  score,
  ranksTimeframe,
  periodRevenueStats,
  periodKpis,
  ranksMonth,
  ranksQuarter,
  ranksYear,
  revenueGrowth,
  monthlyConfigs,
  onSaveMonthlyConfig,
  isAdminOrOwner = true,
}: StaffDetailCardProps) {
  const avatarUrl = getAvatarUrl(staff.avatar, staff.username);

  const revenueLabel =
    ranksTimeframe === 'month' ? 'Doanh thu tháng'
      : ranksTimeframe === 'quarter' ? 'Doanh thu quý'
        : 'Doanh thu năm';

  const targetLabel =
    ranksTimeframe === 'month' ? 'Chỉ tiêu tháng'
      : ranksTimeframe === 'quarter' ? 'Chỉ tiêu quý'
        : 'Chỉ tiêu năm';

  const emptyMessage =
    ranksTimeframe === 'month'
      ? `Chưa thiết lập chỉ số KPI nào cho vị trí này trong tháng ${ranksMonth.split('-')[1]}/${ranksMonth.split('-')[0]}`
      : ranksTimeframe === 'quarter'
        ? `Chưa thiết lập chỉ số KPI nào cho vị trí này trong Quý ${ranksQuarter}/${ranksYear}`
        : `Chưa thiết lập chỉ số KPI nào cho vị trí này trong Năm ${ranksYear}`;

  const remainingValue = periodRevenueStats.totalTarget - periodRevenueStats.totalActual;
  const remainingText = remainingValue > 0 ? `Còn lại ${formatValue(remainingValue, 'VNĐ')}` : 'Đã hoàn thành';

  // Find role config
  const roleObj = useMemo(() => {
    return roles.find(r => r.code === staff.role || r.id === staff.roleId);
  }, [roles, staff]);

  const defaultFund = roleObj?.kpiFund ?? 0;
  const defaultDays = roleObj?.defaultWorkdays ?? 30;

  // Find monthly config
  const monthlyConfig = useMemo(() => {
    return monthlyConfigs.find(c => c.staffId === staff.id && c.month === ranksMonth);
  }, [monthlyConfigs, staff.id, ranksMonth]);

  // Edit states
  const [actualWorkdays, setActualWorkdays] = useState<number>(defaultDays);
  const [disciplineCoeff, setDisciplineCoeff] = useState<number>(1.0);
  const [overrideFund, setOverrideFund] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Sync edits when config or defaults change
  React.useEffect(() => {
    setActualWorkdays(monthlyConfig?.actualWorkdays ?? defaultDays);
    setDisciplineCoeff(monthlyConfig?.disciplineCoefficient ?? 1.0);
    setOverrideFund(monthlyConfig?.payoutBaseOverride);
  }, [monthlyConfig, defaultDays, staff.id, ranksMonth]);

  const handleSaveMonthlyConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      const configId = `${staff.id}_${ranksMonth}`;
      const payload: KPIStaffMonthlyConfig = {
        id: configId,
        storeId: staff.storeId,
        staffId: staff.id,
        month: ranksMonth,
        actualWorkdays: actualWorkdays,
        disciplineCoefficient: disciplineCoeff,
        payoutBaseOverride: overrideFund || undefined,
      };
      await onSaveMonthlyConfig(payload);
      toastSuccess('Lưu quyết toán KPI thành công', `Đã ghi nhận ngày công (${actualWorkdays} ngày) và kỷ luật (${disciplineCoeff}) cho ${staff.fullName}`);
    } catch (err) {
      console.error('Lỗi khi lưu quyết toán KPI:', err);
      toastError('Lưu thất bại', 'Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsSaving(false);
    }
  }, [staff, ranksMonth, actualWorkdays, disciplineCoeff, overrideFund, onSaveMonthlyConfig]);

  const currentFund = overrideFund !== undefined ? overrideFund : defaultFund;
  const finalPayout = Math.round(
    currentFund * (score / 100) * (defaultDays > 0 ? (actualWorkdays / defaultDays) : 1) * disciplineCoeff
  );

  const roleDisplay = roleObj ? roleObj.name : staff.role;

  return (
    <div className="space-y-2">
      {/* Profile Section & 4 stats cards */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 pb-2">
        {/* Profile Section */}
        <div className="flex items-center gap-3.5 min-w-[200px] text-left xl:w-[25%]">
          <Avatar className="w-12 h-12 rounded-full border border-slate-100 shadow-2xs">
            <AvatarImage src={avatarUrl} className="rounded-full" />
            <AvatarFallback className="rounded-full text-base font-bold bg-slate-100 text-slate-800">
              {staff.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 leading-tight">{staff.fullName}</h2>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              {roleDisplay}
            </p>
          </div>
        </div>

        {/* 4 Nested KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 xl:w-[75%]">
          {/* Card 1: Doanh thu tháng */}
          <Card className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left gap-2 py-3.5 shadow-none">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{revenueLabel}</p>
              <h3 className="text-sm xl:text-base font-extrabold text-[#C21A1A]">
                {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
              </h3>
            </div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-2">
              {revenueGrowth.pct > 0 ? (
                <>
                  <span>{revenueGrowth.isGrow ? '▲' : '▼'}</span>
                  <span>{revenueGrowth.pct.toFixed(1)}% so với {revenueGrowth.label}</span>
                </>
              ) : (
                <span className="text-slate-400 font-semibold">-- {revenueGrowth.label}</span>
              )}
            </div>
          </Card>

          {/* Card 2: Điểm trung bình KPI */}
          <Card className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left gap-2 py-3.5 shadow-none">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm trung bình KPI</p>
              <h3 className="text-sm xl:text-base font-extrabold text-slate-900">
                <span className="text-emerald-600">{score}</span>
                <span className="text-slate-400 text-xs font-semibold"> /100</span>
              </h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
              Xếp loại: {getClassificationLabel(score)}
            </p>
          </Card>

          {/* Card 3: Doanh thu đạt được */}
          <Card className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left gap-2 py-3.5 shadow-none">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu đạt được</p>
              <h3 className="text-sm xl:text-base font-extrabold text-blue-600">
                {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
              </h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
              {periodRevenueStats.pct.toFixed(1)}% so với target
            </p>
          </Card>

          {/* Card 4: Chỉ tiêu tháng */}
          <Card className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left gap-2 py-3.5 shadow-none">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{targetLabel}</p>
              <h3 className="text-sm xl:text-base font-extrabold text-slate-800">
                {formatValue(periodRevenueStats.totalTarget, 'VNĐ')}
              </h3>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 truncate uppercase tracking-wider" title={remainingText}>
              {remainingText}
            </p>
          </Card>
        </div>
      </div>

      {/* KPI Payout Settlement Panel (Only in monthly view) */}
      {ranksTimeframe === 'month' && (
        <Card className="bg-white/80 border border-slate-200/80 rounded-2xl shadow-xs text-left backdrop-blur-md py-4 gap-4">
          {/* Header & Formula Equation */}
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 px-5">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-[#C21A1A] shrink-0" />
                Quyết toán lương KPI tháng
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-slate-400">
                Lương KPI được chốt dựa trên tỷ lệ công làm việc và hệ số trừ vi phạm kỷ luật.
              </CardDescription>
            </div>

            {/* Visual Formula Equation */}
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700 text-xs font-bold bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <div className="bg-white border border-slate-200/60 px-2 py-1.5 rounded-lg text-slate-700 shadow-2xs">
                Quỹ: <span className="text-[#C21A1A] font-extrabold">{formatValue(currentFund, 'VNĐ')}</span>
              </div>
              <span className="text-slate-400 font-normal">×</span>
              <div className="bg-emerald-50/60 border border-emerald-100 px-2 py-1.5 rounded-lg text-emerald-700 shadow-2xs">
                Điểm: <span className="font-extrabold">{score}%</span>
              </div>
              <span className="text-slate-400 font-normal">×</span>
              <div className="bg-blue-50/60 border border-blue-100 px-2 py-1.5 rounded-lg text-blue-700 shadow-2xs">
                Công: <span className="font-extrabold">{actualWorkdays}/{defaultDays}</span>
              </div>
              <span className="text-slate-400 font-normal">×</span>
              <div className="bg-amber-50/60 border border-amber-100 px-2 py-1.5 rounded-lg text-amber-700 shadow-2xs">
                Kỷ luật: <span className="font-extrabold">{disciplineCoeff}</span>
              </div>
            </div>
          </CardHeader>

          {/* Interactive Form & Result */}
          <CardContent className="px-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Override Fund Input */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quỹ KPI ghi đè (VNĐ)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={100000}
                  disabled={!isAdminOrOwner}
                  value={overrideFund ?? ''}
                  onChange={(e) => setOverrideFund(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full text-xs font-bold text-[#C21A1A] placeholder:font-normal"
                  placeholder="Tự động theo vai trò"
                  suffix="đ"
                  size="sm"
                />
              </div>

              {/* Actual Workdays Input */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ngày công thực tế
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={31}
                  disabled={!isAdminOrOwner}
                  value={actualWorkdays || ''}
                  onChange={(e) => setActualWorkdays(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-slate-700"
                  suffix="ngày"
                  size="sm"
                />
              </div>

              {/* Discipline Dropdown */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Hệ số kỷ luật
                </Label>
                <CustomSelect
                  options={DISCIPLINE_OPTIONS}
                  disabled={!isAdminOrOwner}
                  value={String(disciplineCoeff)}
                  onChangeValue={(val) => setDisciplineCoeff(parseFloat(String(val)) || 0)}
                  size="sm"
                  clearable={false}
                  className="text-xs font-bold text-slate-700 w-full"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-100 pt-3.5 px-5 bg-slate-50/30 rounded-b-2xl gap-3">
            {/* Calculated Salary Result Card */}
            <div className="p-2 px-4 bg-gradient-to-br from-red-50 to-rose-100/60 border border-red-150/40 rounded-xl flex items-center justify-between sm:justify-start gap-2.5 shadow-2xs w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-red-500 tracking-wide">Lương KPI thực nhận:</span>
              <h3 className="text-base font-extrabold text-[#C21A1A] tracking-wide">
                {formatValue(finalPayout, 'VNĐ')}
              </h3>
            </div>

            {/* Save Button */}
            {isAdminOrOwner && (
              <Button
                disabled={isSaving}
                onClick={handleSaveMonthlyConfig}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 h-[42px] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 w-full sm:w-auto shrink-0"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Lưu chốt quyết toán
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* KPI Detail Table Container */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
          CHI TIẾT CHỈ SỐ KPI
        </h3>
        {periodKpis.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-sm font-bold text-slate-800 tracking-wider py-2">Chỉ số KPI</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-800 tracking-wider py-2">Target tháng</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-800 tracking-wider py-2">Thực đạt</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-800 tracking-wider py-2">Đạt %</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-800 tracking-wider py-2">Điểm</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-800 tracking-wider py-2">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodKpis.map(kpi => (
                    <KpiDetailRow key={kpi.id} kpi={kpi} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden space-y-3 text-left">
              {periodKpis.map((kpi, idx) => {
                const pctStr = (kpi.pct * 100).toFixed(1) + '%';
                const scoreVal = kpi.score * 100;
                const maxVal = kpi.weight * 100;
                const scoreStr = `${scoreVal % 1 === 0 ? scoreVal.toFixed(0) : scoreVal.toFixed(1)} / ${maxVal.toFixed(0)}`;

                return (
                  <MobileCard key={kpi.id} delayIndex={idx} variant="bordered">
                    <MobileCard.Header
                      title={kpi.kpiName}
                      subtitle={kpi.goalName}
                    />
                    <MobileCard.Body className="p-3 space-y-2">
                      <MobileCard.Grid
                        cols={2}
                        items={[
                          { label: 'Target tháng', value: formatValue(kpi.target, kpi.unit) },
                          { label: 'Thực đạt', value: formatValue(kpi.actual, kpi.unit), valueClassName: 'text-blue-600 font-bold' },
                          { 
                            label: 'Đạt %', 
                            value: (
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="font-bold text-slate-700">{pctStr}</span>
                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${kpi.pct >= 0.95 ? 'bg-emerald-500' : kpi.pct >= 0.8 ? 'bg-blue-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(100, kpi.pct * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )
                          },
                          { label: 'Điểm', value: scoreStr, valueClassName: 'font-bold text-slate-800' },
                        ]}
                      />
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 text-xs">
                        <span className="text-slate-400 font-bold">Trạng thái:</span>
                        <KpiStatusBadge actual={kpi.actual} pct={kpi.pct} />
                      </div>
                    </MobileCard.Body>
                  </MobileCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// ─── Sub-component: KPI Detail Row ─────────────────────────────
const KpiDetailRow = React.memo(function KpiDetailRow({ kpi }: { kpi: PeriodKpiDetail }) {
  const pctStr = (kpi.pct * 100).toFixed(1) + '%';

  // Format score as fraction [Earned Score] / [Max Score]
  const scoreVal = kpi.score * 100;
  const maxVal = kpi.weight * 100;
  const scoreStr = `${scoreVal % 1 === 0 ? scoreVal.toFixed(0) : scoreVal.toFixed(1)} / ${maxVal.toFixed(0)}`;

  return (
    <TableRow className="hover:bg-slate-50/50">
      <TableCell className="max-w-[200px] truncate text-left py-2">
        <p className="font-bold text-slate-800 text-sm truncate" title={kpi.kpiName}>
          {kpi.kpiName}
        </p>
        {kpi.goalName && (
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block leading-tight">{kpi.goalName}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-sans font-medium text-slate-500 text-xs py-2">
        {formatValue(kpi.target, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs text-blue-600 py-2">
        {formatValue(kpi.actual, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs py-2">
        <div className="flex items-center justify-end gap-2">
          <span className="w-10 text-right text-slate-700">{pctStr}</span>
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block border border-slate-200/30">
            <div
              className={`h-full rounded-full transition-all duration-500 ${kpi.pct >= 0.95 ? 'bg-emerald-500' : kpi.pct >= 0.8 ? 'bg-blue-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, kpi.pct * 100)}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs text-slate-800 py-2">{scoreStr}</TableCell>
      <TableCell className="text-right py-2">
        <KpiStatusBadge actual={kpi.actual} pct={kpi.pct} />
      </TableCell>
    </TableRow>
  );
});
