import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../share/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../../../../share/ui/avatar';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { KpiStatusBadge } from './_kpi-status-badge';
import { formatValue, getAvatarUrl } from '../kpi-utils';
import type { StaffMember } from '../../../types/staff.types';
import type { StaffRank } from '../../../types/kpi.types';
import type { RanksTimeframe, PeriodKpiDetail, RevenueStats } from '../kpi-utils';

interface StaffDetailCardProps {
  staff: StaffMember;
  score: number;
  ranksTimeframe: RanksTimeframe;
  periodRevenueStats: RevenueStats;
  periodKpis: PeriodKpiDetail[];
  ranksMonth: string;
  ranksQuarter: number;
  ranksYear: number;
}

export const StaffDetailCard = React.memo(function StaffDetailCard({
  staff,
  score,
  ranksTimeframe,
  periodRevenueStats,
  periodKpis,
  ranksMonth,
  ranksQuarter,
  ranksYear,
}: StaffDetailCardProps) {
  const avatarUrl = getAvatarUrl(staff.avatar, staff.username);

  const revenueLabel =
    ranksTimeframe === 'month' ? 'DOANH THU THÁNG'
    : ranksTimeframe === 'quarter' ? 'DOANH THU QUÝ'
    : 'DOANH THU NĂM';

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

  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          {/* Staff info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 rounded-xl">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="rounded-xl text-sm font-bold">{staff.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <CardTitle className="text-base font-bold text-slate-900">{staff.fullName}</CardTitle>
              <CardDescription className="text-sm font-bold text-[#C21A1A] uppercase tracking-wider mt-1">
                Vai trò: {staff.role}
              </CardDescription>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 items-center">
            {periodRevenueStats.hasRevenue && (
              <div className="text-right border-r border-slate-100 pr-4 hidden sm:block">
                <p className="text-sm font-bold text-slate-500 uppercase">{revenueLabel}</p>
                <h3 className="text-sm font-bold text-slate-900 leading-none mt-1">
                  {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
                </h3>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                  {periodRevenueStats.pct.toFixed(0)}% Đạt
                </span>
              </div>
            )}

            <div className="text-right">
              <p className="text-sm font-bold text-slate-500 uppercase">ĐIỂM TRUNG BÌNH KPI</p>
              <h3 className="text-lg font-bold font-sans text-slate-900 leading-none mt-1">
                {score}%
              </h3>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Revenue stats card */}
        {periodRevenueStats.hasRevenue && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center text-left">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-500 uppercase">Doanh thu đạt được</span>
              <h4 className="text-sm font-bold text-[#C21A1A]">
                {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
              </h4>
            </div>
            <div className="text-right space-y-1">
              <span className="text-sm font-bold text-slate-500 uppercase">{targetLabel}</span>
              <p className="text-sm font-bold text-slate-700">
                {formatValue(periodRevenueStats.totalTarget, 'VNĐ')} ({periodRevenueStats.pct.toFixed(1)}%)
              </p>
            </div>
          </div>
        )}

        {/* KPI detail table */}
        <div className="space-y-3.5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-left">CHI TIẾT CHỈ SỐ KPI ĐẠT ĐƯỢC</h4>

          {periodKpis.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl">
              {emptyMessage}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-sm font-bold text-slate-700">Chỉ số KPI</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">
                      {ranksTimeframe === 'month' ? 'Target tháng' : 'Target giai đoạn'}
                    </TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Thực đạt</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Đạt %</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Điểm</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Trạng thái</TableHead>
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
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: KPI Detail Row ─────────────────────────────
const KpiDetailRow = React.memo(function KpiDetailRow({ kpi }: { kpi: PeriodKpiDetail }) {
  const pctStr = (kpi.pct * 100).toFixed(1) + '%';
  const scoreStr = (kpi.score * 100).toFixed(1) + '%';

  return (
    <TableRow>
      <TableCell className="max-w-[150px] truncate text-left">
        <p className="font-bold text-slate-800 text-sm truncate" title={kpi.kpiName}>
          {kpi.kpiName}
        </p>
        <span className="text-sm text-slate-500 font-semibold mt-0.5 block">Trọng số: {(kpi.weight * 100)}%</span>
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-sm">
        {formatValue(kpi.target, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-sm text-[#C21A1A]">
        {formatValue(kpi.actual, kpi.unit)}
      </TableCell>
      <TableCell className="text-right font-sans font-bold text-sm">{pctStr}</TableCell>
      <TableCell className="text-right font-sans font-bold text-sm text-blue-600">{scoreStr}</TableCell>
      <TableCell className="text-right">
        <KpiStatusBadge actual={kpi.actual} pct={kpi.pct} />
      </TableCell>
    </TableRow>
  );
});
