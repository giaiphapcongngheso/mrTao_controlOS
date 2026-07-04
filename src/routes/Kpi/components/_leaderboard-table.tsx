import React, { useCallback } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { Avatar, AvatarImage, AvatarFallback } from '../../../../share/ui/avatar';
import { ClassificationBadge } from './_classification-badge';
import { MobileCard } from '@/src/components/custom/mobile-card';
import type { StaffRank } from '../../../types/kpi.types';
import type { StaffRole } from '../../../types/staff.types';

import { PeriodSelector } from './_period-selector';
import { type RanksTimeframe, translateClassification } from '../kpi-utils';

interface LeaderboardTableProps {
  roles: StaffRole[];
  ranks: StaffRank[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  periodLabel: string;
  ranksTimeframe: RanksTimeframe;
  onTimeframeChange: (tf: RanksTimeframe) => void;
  ranksMonth: string;
  onRanksMonthChange: (m: string) => void;
  ranksQuarter: number;
  onRanksQuarterChange: (q: number) => void;
  ranksYear: number;
  onRanksYearChange: (y: number) => void;
}

export const LeaderboardTable = React.memo(function LeaderboardTable({
  roles,
  ranks,
  selectedStaffId,
  onSelectStaff,
  periodLabel,
  ranksTimeframe,
  onTimeframeChange,
  ranksMonth,
  onRanksMonthChange,
  ranksQuarter,
  onRanksQuarterChange,
  ranksYear,
  onRanksYearChange,
}: LeaderboardTableProps) {
  const handleRowClick = useCallback(
    (staffId: string) => onSelectStaff(staffId),
    [onSelectStaff]
  );

  const totalCalculatedPayout = React.useMemo(() => {
    return ranks.reduce((sum, r) => sum + (r.calculatedPayout || 0), 0);
  }, [ranks]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-none">Leaderboard thi đua</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Xếp hạng ({periodLabel})
          </p>
        </div>
        <PeriodSelector
          isCompact={true}
          timeframe={ranksTimeframe}
          onTimeframeChange={onTimeframeChange}
          ranksMonth={ranksMonth}
          onRanksMonthChange={onRanksMonthChange}
          ranksQuarter={ranksQuarter}
          onRanksQuarterChange={onRanksQuarterChange}
          ranksYear={ranksYear}
          onRanksYearChange={onRanksYearChange}
        />
      </div>

      {/* Table */}
      <div className="p-2">
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center text-sm font-bold text-slate-700">Hạng</TableHead>
                <TableHead className="text-sm font-bold text-slate-700">Nhân viên</TableHead>
                <TableHead className="text-right text-sm font-bold text-slate-700">Tổng điểm</TableHead>
                <TableHead className="text-right text-sm font-bold text-slate-700">Xếp loại</TableHead>
                <TableHead className="text-right text-sm font-bold text-slate-700">Tiền KPI nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((rank, idx) => {
                const isSelected = selectedStaffId === rank.staffId;
                return (
                  <TableRow
                    key={rank.staffId}
                    onClick={() => handleRowClick(rank.staffId)}
                    className={`cursor-pointer hover:bg-slate-50/70 ${isSelected ? 'bg-slate-50 font-semibold border-l-4 border-l-[#C21A1A]' : ''}`}
                  >
                    {/* Rank number */}
                    <TableCell className="text-center font-sans text-sm">
                      <RankBadge rank={idx + 1} />
                    </TableCell>

                    {/* Staff info */}
                    <TableCell>
                      {(() => {
                        const roleObj = roles.find(r => r.code === rank.role);
                        const roleDisplay = roleObj ? roleObj.name : rank.role;
                        return (
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={rank.avatar} />
                              <AvatarFallback className="text-xs font-bold">{rank.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-800 leading-tight">{rank.name}</p>
                              <span className="text-xs font-semibold text-slate-500">Vai trò: {roleDisplay}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-right font-sans font-bold text-slate-800 text-sm">
                      {rank.score}%
                    </TableCell>

                    {/* Classification */}
                    <TableCell className="text-right">
                      <ClassificationBadge classification={rank.classification} />
                    </TableCell>

                    {/* Payout */}
                    <TableCell className="text-right font-sans font-bold text-[#C21A1A] text-sm">
                      {rank.calculatedPayout ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rank.calculatedPayout) : '0 ₫'}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Total Payout Row */}
              {ranks.length > 0 && (
                <TableRow className="bg-slate-50 border-t border-slate-200">
                  <TableCell colSpan={2} className="text-left font-bold text-slate-700 text-sm py-3">
                    Tổng chi trả cả cửa hàng
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-400">--</TableCell>
                  <TableCell className="text-right font-semibold text-slate-400">--</TableCell>
                  <TableCell className="text-right font-sans font-extrabold text-[#C21A1A] text-sm py-3">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalCalculatedPayout)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-2">
          {ranks.map((rank, idx) => {
            const isSelected = selectedStaffId === rank.staffId;
            const roleObj = roles.find(r => r.code === rank.role);
            const roleDisplay = roleObj ? roleObj.name : rank.role;

            return (
              <MobileCard
                key={rank.staffId}
                delayIndex={idx}
                variant="bordered"
                accentColor={isSelected ? 'brand' : 'none'}
                accentPosition={isSelected ? 'left' : 'none'}
                interactive={true}
                onClick={() => handleRowClick(rank.staffId)}
                className="cursor-pointer"
              >
                <MobileCard.Header
                  title={rank.name}
                  avatar={
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={rank.avatar} />
                      <AvatarFallback className="text-xs font-bold">{rank.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  }
                  subtitle={`Vai trò: ${roleDisplay}`}
                  badge={{
                    text: translateClassification(rank.classification),
                    variant: rank.classification === 'excellent' || rank.classification === 'good' ? 'success' : rank.classification === 'pass' ? 'warning' : 'error'
                  }}
                />
                <MobileCard.Body className="p-3">
                  <MobileCard.Grid
                    cols={2}
                    items={[
                      {
                        label: 'Hạng thi đua',
                        value: <RankBadge rank={idx + 1} />,
                      },
                      {
                        label: 'Tổng điểm KPI',
                        value: `${rank.score}%`,
                        valueClassName: 'font-sans font-bold text-slate-900 dark:text-slate-150 text-sm'
                      },
                      {
                        label: 'Tiền KPI thực tế nhận',
                        value: rank.calculatedPayout ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rank.calculatedPayout) : '0 ₫',
                        valueClassName: 'font-sans font-extrabold text-[#C21A1A] text-sm',
                        fullWidth: true
                      }
                    ]}
                  />
                </MobileCard.Body>
              </MobileCard>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// ─── Sub-component: Rank Badge (top 3 gold/silver/bronze) ──────
const RankBadge = React.memo(function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-bold text-sm flex items-center justify-center mx-auto shadow-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-sm flex items-center justify-center mx-auto shadow-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="w-6 h-6 rounded-full bg-amber-600/70 text-white font-bold text-sm flex items-center justify-center mx-auto shadow-sm">
        3
      </span>
    );
  }
  return <span className="text-sm text-slate-500 font-bold">{rank}</span>;
});
