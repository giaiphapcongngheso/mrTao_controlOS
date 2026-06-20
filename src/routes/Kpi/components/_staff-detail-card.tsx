import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../../../../share/ui/avatar';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { KpiStatusBadge } from './_kpi-status-badge';
import { formatValue, getAvatarUrl } from '../kpi-utils';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import type { RanksTimeframe, PeriodKpiDetail, RevenueStats } from '../kpi-utils';

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
}

const getClassificationLabel = (score: number) => {
  if (score >= 90) return 'Đạt tốt';
  if (score >= 80) return 'Khá';
  if (score >= 70) return 'Đạt';
  return 'Cần cải thiện';
};

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

  // Translate role code to display name
  const roleObj = roles.find(r => r.code === staff.role || r.id === staff.roleId);
  const roleDisplay = roleObj ? roleObj.name : staff.role;

  return (
    <div className="space-y-4">
      {/* Parent container containing Profile & 4 Nested Child Cards */}
      <div className="bg-white border border-slate-200 shadow-2xs rounded-xl overflow-hidden p-4 md:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Profile Section - xl:col-span-3 */}
        <div className="flex items-center gap-3.5 min-w-[180px] text-left xl:w-[25%]">
          <Avatar className="w-14 h-14 rounded-xl border border-slate-100 shadow-2xs">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="rounded-xl text-base font-bold bg-slate-100 text-slate-800">
              {staff.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 leading-tight">{staff.fullName}</h2>
            <p className="text-xs font-semibold text-slate-500">
              Vai trò: {roleDisplay}
            </p>
          </div>
        </div>

        {/* 4 Nested KPI Cards - xl:col-span-9 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 xl:w-[75%]">
          {/* Card 1: Doanh thu tháng */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-500">{revenueLabel}</p>
              <h3 className="text-sm xl:text-base font-extrabold text-[#C21A1A]">
                {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
              </h3>
            </div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 mt-2">
              {revenueGrowth.pct > 0 ? (
                <>
                  <span>{revenueGrowth.isGrow ? '▲' : '▼'}</span>
                  <span>{revenueGrowth.pct.toFixed(1)}%</span>
                  <span className="text-slate-400 font-semibold ml-0.5 truncate">{revenueGrowth.label}</span>
                </>
              ) : (
                <span className="text-slate-400 font-semibold">-- {revenueGrowth.label}</span>
              )}
            </div>
          </div>

          {/* Card 2: Điểm trung bình KPI */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-500">Điểm trung bình KPI</p>
              <h3 className="text-sm xl:text-base font-extrabold text-slate-900">
                <span className="text-emerald-600">{score}</span>
                <span className="text-slate-400 text-xs font-semibold"> /100</span>
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-2">
              Xếp loại: {getClassificationLabel(score)}
            </p>
          </div>

          {/* Card 3: Doanh thu đạt được */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-500">Doanh thu đạt được</p>
              <h3 className="text-sm xl:text-base font-extrabold text-blue-600">
                {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-2">
              {periodRevenueStats.pct.toFixed(1)}% so với target
            </p>
          </div>

          {/* Card 4: Chỉ tiêu tháng */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col justify-between text-left">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-500">{targetLabel}</p>
              <h3 className="text-sm xl:text-base font-extrabold text-slate-800">
                {formatValue(periodRevenueStats.totalTarget, 'VNĐ')}
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-2 truncate" title={remainingText}>
              {remainingText}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Detail Table Card Container */}
      <div className="bg-white border border-slate-200 shadow-2xs rounded-xl overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 text-left">
            Chi tiết chỉ số KPI
          </h3>
        </div>
        <div className="p-4 pt-2">
          {periodKpis.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl">
              {emptyMessage}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700 py-2.5">Chỉ số KPI</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700 py-2.5">
                      {ranksTimeframe === 'month' ? 'Target tháng' : 'Target giai đoạn'}
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700 py-2.5">Thực đạt</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700 py-2.5">Đạt %</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700 py-2.5">Điểm</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700 py-2.5">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodKpis.map(kpi => (
                    <KpiDetailRow key={kpi.id} kpi={kpi} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
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
      <TableCell className="max-w-[200px] truncate text-left py-2.5">
        <p className="font-bold text-slate-800 text-xs truncate" title={kpi.kpiName}>
          {kpi.kpiName}
        </p>
        {kpi.goalName && (
          <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block leading-tight">{kpi.goalName}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs py-2.5">
        {formatValue(kpi.target, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs text-[#C21A1A] py-2.5">
        {formatValue(kpi.actual, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs py-2.5">
        <div className="flex items-center justify-end gap-2">
          <span>{pctStr}</span>
          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${kpi.pct >= 0.95 ? 'bg-emerald-500' : kpi.pct >= 0.8 ? 'bg-blue-500' : 'bg-rose-500'}`} 
              style={{ width: `${Math.min(100, kpi.pct * 100)}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-xs text-blue-600 py-2.5">{scoreStr}</TableCell>
      <TableCell className="text-right py-2.5">
        <KpiStatusBadge actual={kpi.actual} pct={kpi.pct} />
      </TableCell>
    </TableRow>
  );
});
