import React, { useCallback } from 'react';
import type { StaffRank } from '../../../types/kpi.types';
import type { StaffRole } from '../../../types/staff.types';
import { Card } from '../../../../share/ui/card';
import { MobileCard } from '@/src/components/custom/mobile-card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../../share/ui/table';
import { translateClassification, getClassificationBadgeClass } from '../kpi-utils';
import { cn } from '@shared/lib/utils';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

// ─── Sub-component: Desktop Row ──────────────────────────────────────────────
interface KpiLeaderboardRowProps {
  readonly rank: StaffRank;
  readonly index: number;
  readonly roleName: string;
  readonly isSelected: boolean;
  readonly onClick: (id: string) => void;
}

const KpiLeaderboardRow = React.memo(function KpiLeaderboardRow({
  rank,
  index,
  roleName,
  isSelected,
  onClick,
}: KpiLeaderboardRowProps) {
  const handleClick = useCallback(() => {
    onClick(rank.staffId);
  }, [onClick, rank.staffId]);

  const rankNum = index + 1;
  const isTop3 = rankNum <= 3;
  const classificationLabel = translateClassification(rank.classification);
  const classBadge = getClassificationBadgeClass(rank.classification);

  return (
    <TableRow
      className={cn(
        'hover:bg-slate-50/70 transition cursor-pointer font-sans',
        isSelected ? 'bg-slate-50/45' : ''
      )}
      onClick={handleClick}
    >
      {/* Hạng */}
      <TableCell className="py-3 px-4 text-center font-bold">
        {isTop3 ? (
          <span className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black',
            rankNum === 1 ? 'bg-amber-100 text-amber-800' :
              rankNum === 2 ? 'bg-slate-250 text-slate-700' :
                'bg-orange-100 text-orange-850'
          )}>
            {rankNum}
          </span>
        ) : (
          <span className="text-slate-400 font-semibold">{rankNum}</span>
        )}
      </TableCell>
      {/* Nhân sự */}
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3">
          <img
            src={rank.avatar}
            alt={rank.name}
            className="w-8 h-8 rounded-full border border-slate-100"
          />
          <div className="min-w-0">
            <div className="font-bold text-slate-800 truncate leading-snug">{rank.name}</div>
          </div>
        </div>
      </TableCell>
      {/* Vai trò */}
      <TableCell className="py-3 px-4 font-semibold text-slate-500 text-xs">
        {roleName}
      </TableCell>
      {/* Thanh tiến độ */}
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shrink-0">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                rank.score >= 80 ? 'bg-emerald-500' :
                  rank.score >= 70 ? 'bg-blue-500' :
                    rank.score >= 50 ? 'bg-amber-500' :
                      'bg-rose-500'
              )}
              style={{ width: `${Math.min(100, rank.score)}%` }}
            />
          </div>
        </div>
      </TableCell>
      {/* Điểm số */}
      <TableCell className="py-3 px-4 text-center font-bold text-slate-750">
        {rank.score}
      </TableCell>
      {/* Phân loại */}
      <TableCell className="py-3 px-4 text-center">
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[9.5px] font-bold border border-solid leading-none', classBadge)}>
          {classificationLabel}
        </span>
      </TableCell>
      {/* Thưởng KPI */}
      <TableCell className="py-3 px-4 text-right font-bold text-slate-800">
        {CURRENCY_FORMATTER.format(rank.calculatedPayout ?? 0)}
      </TableCell>
    </TableRow>
  );
});

// ─── Sub-component: Mobile Card ──────────────────────────────────────────────
interface KpiLeaderboardMobileCardProps {
  readonly rank: StaffRank;
  readonly index: number;
  readonly roleName: string;
  readonly isSelected: boolean;
  readonly onClick: (id: string) => void;
}

const KpiLeaderboardMobileCard = React.memo(function KpiLeaderboardMobileCard({
  rank,
  index,
  roleName,
  isSelected,
  onClick,
}: KpiLeaderboardMobileCardProps) {
  const handleClick = useCallback(() => {
    onClick(rank.staffId);
  }, [onClick, rank.staffId]);

  const classificationLabel = translateClassification(rank.classification);
  const classificationVariant = 
    rank.classification === 'excellent' || rank.classification === 'good' ? 'success' : 
    rank.classification === 'pass' ? 'warning' : 'error';

  return (
    <MobileCard
      interactive={true}
      delayIndex={index}
      accentColor={isSelected ? 'brand' : 'none'}
      accentPosition="left"
      onClick={handleClick}
    >
      <MobileCard.Header
        title={rank.name}
        subtitle={roleName}
        avatar={rank.avatar}
        badge={{ text: classificationLabel, variant: classificationVariant }}
      />
      <MobileCard.Body className="space-y-3">
        <MobileCard.ProgressBar
          value={rank.score}
          label="Điểm KPI đạt được"
          valueLabel={`${rank.score} điểm`}
          color={rank.score >= 80 ? 'green' : rank.score >= 70 ? 'blue' : rank.score >= 50 ? 'amber' : 'red'}
        />
        <MobileCard.Grid
          cols={2}
          items={[
            { label: 'Số ngày công', value: rank.actualWorkdays !== undefined ? `${rank.actualWorkdays} ngày` : '—' },
            { label: 'Lương thưởng KPI', value: CURRENCY_FORMATTER.format(rank.calculatedPayout ?? 0), valueClassName: 'text-[#C21A1A] font-black text-sm' }
          ]}
        />
      </MobileCard.Body>
    </MobileCard>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────
interface KpiLeaderboardTableProps {
  readonly ranks: StaffRank[];
  readonly roles: StaffRole[];
  readonly selectedStaffId: string;
  readonly onSelectStaff: (id: string) => void;
  readonly onViewModeChange: (mode: 'overview' | 'detail') => void;
  readonly periodLabel: string;
}

export const KpiLeaderboardTable = React.memo(function KpiLeaderboardTable({
  ranks,
  roles,
  selectedStaffId,
  onSelectStaff,
  onViewModeChange,
  periodLabel,
}: KpiLeaderboardTableProps) {
  const handleRowClick = useCallback((staffId: string) => {
    onSelectStaff(staffId);
    onViewModeChange('detail');
  }, [onSelectStaff, onViewModeChange]);

  return (
    <div className="space-y-4">
      {/* Desktop/Tablet View: Overview Grid Table */}
      <div className="hidden md:block">
        <Card className="p-4 md:p-5 border border-slate-200 bg-white shadow-xs rounded-2xl text-left">
          <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider mb-4 font-sans">
            Bảng kết quả KPI tổng hợp — {periodLabel}
          </h4>
          <div className="overflow-x-auto min-w-0 w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
                  <TableHead className="py-3 px-4 text-center w-[60px]">Hạng</TableHead>
                  <TableHead className="py-3 px-4">Nhân sự</TableHead>
                  <TableHead className="py-3 px-4">Vai trò</TableHead>
                  <TableHead className="py-3 px-4 w-[200px]">Tiến độ</TableHead>
                  <TableHead className="py-3 px-4 text-center w-[100px]">Điểm KPI</TableHead>
                  <TableHead className="py-3 px-4 text-center w-[120px]">Phân loại</TableHead>
                  <TableHead className="py-3 px-4 text-right w-[150px]">Lương thưởng KPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {ranks.map((rank, index) => {
                  const roleName = roles.find(r => r.code === rank.role)?.name || rank.role.replace(/_/g, ' ');
                  return (
                    <KpiLeaderboardRow
                      key={rank.staffId}
                      rank={rank}
                      index={index}
                      roleName={roleName}
                      isSelected={selectedStaffId === rank.staffId}
                      onClick={handleRowClick}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Mobile View: list of MobileCards */}
      <div className="block md:hidden space-y-3 text-left">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2.5 font-sans px-1">
          Kết quả KPI tổng hợp — {periodLabel}
        </h4>
        {ranks.map((rank, index) => {
          const roleName = roles.find(r => r.code === rank.role)?.name || rank.role.replace(/_/g, ' ');
          return (
            <KpiLeaderboardMobileCard
              key={rank.staffId}
              rank={rank}
              index={index}
              roleName={roleName}
              isSelected={selectedStaffId === rank.staffId}
              onClick={handleRowClick}
            />
          );
        })}
      </div>
    </div>
  );
});
