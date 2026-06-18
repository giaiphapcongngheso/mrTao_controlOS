import React, { useCallback } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { Avatar, AvatarImage, AvatarFallback } from '../../../../share/ui/avatar';
import { ClassificationBadge } from './_classification-badge';
import type { StaffRank } from '../../../types/kpi.types';

interface LeaderboardTableProps {
  ranks: StaffRank[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  periodLabel: string;
}

export const LeaderboardTable = React.memo(function LeaderboardTable({
  ranks,
  selectedStaffId,
  onSelectStaff,
  periodLabel,
}: LeaderboardTableProps) {
  const handleRowClick = useCallback(
    (staffId: string) => onSelectStaff(staffId),
    [onSelectStaff]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-wider">LEADERBOARD THI ĐUA</h2>
          <p className="text-sm text-slate-500 font-semibold mt-1">Xếp hạng dựa trên kết quả đạt được</p>
        </div>
        <span className="text-sm font-bold text-[#C21A1A] bg-red-50 border border-red-100 px-3 py-1 rounded-xl">
          {periodLabel}
        </span>
      </div>

      {/* Table */}
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center text-sm font-bold text-slate-700">Hạng</TableHead>
              <TableHead className="text-sm font-bold text-slate-700">Nhân viên</TableHead>
              <TableHead className="text-right text-sm font-bold text-slate-700">Tổng điểm</TableHead>
              <TableHead className="text-right text-sm font-bold text-slate-700">Xếp loại</TableHead>
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
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={rank.avatar} />
                        <AvatarFallback className="text-xs font-bold">{rank.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{rank.name}</p>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{rank.role}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-right font-sans font-bold text-slate-800 text-sm">
                    {rank.score}%
                  </TableCell>

                  {/* Classification */}
                  <TableCell className="text-right">
                    <ClassificationBadge classification={rank.classification} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
