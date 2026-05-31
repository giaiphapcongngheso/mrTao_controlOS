import React from 'react';
import { AlertTriangle, HelpCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '../../../../share/lib/utils';
import { Button } from '../../../../share/ui';
import type { SOPIssueStatus, SOPIssueStatusFilter } from '../../../types/issues.types';

export type IssueStatus = SOPIssueStatusFilter;

interface MetricCardConfig {
  status: SOPIssueStatus;
  title: string;
  subtitle: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  activeStyles: string;
  hoverStyles: string;
  countColor: string;
}

interface MetricBentoCardsProps {
  selectedStatus: IssueStatus;
  onSelectStatus: (status: IssueStatus) => void;
  immediateCount: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

interface MetricStatusCardProps {
  card: MetricCardConfig;
  isActive: boolean;
  onSelectStatus: (status: IssueStatus) => void;
}

const MetricStatusCard = React.memo(function MetricStatusCard({
  card,
  isActive,
  onSelectStatus,
}: MetricStatusCardProps) {
  const IconComponent = card.icon;

  const handleClick = React.useCallback(() => {
    onSelectStatus(isActive ? 'all' : card.status);
  }, [card.status, isActive, onSelectStatus]);

  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={isActive}
      aria-label={`Lọc phiếu trạng thái ${card.title}: ${card.count}`}
      onClick={handleClick}
      className={cn(
        "bg-white rounded-2xl p-3.5 sm:p-4 border transition-all cursor-pointer select-none text-left flex flex-row items-center justify-between gap-3 py-3.5 sm:py-4 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 shadow-none hover:bg-white h-auto",
        isActive ? card.activeStyles : card.hoverStyles
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("p-2 rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0 flex items-center justify-center", card.iconBg)}>
          <IconComponent className="w-5 h-5 stroke-[2.5]" />
        </span>
        <div className="space-y-0.5 min-w-0">
          <h4 className="font-extrabold text-slate-800 text-[13px] leading-tight truncate">{card.title}</h4>
          <span className="text-[10px] text-slate-450 font-bold block truncate">{card.subtitle}</span>
        </div>
      </div>
      <span className={cn("text-2xl font-black tracking-tight tabular-nums shrink-0", card.countColor)}>{card.count}</span>
    </Button>
  );
});

const MetricBentoCards = React.memo(function MetricBentoCards({
  selectedStatus,
  onSelectStatus,
  immediateCount,
  pendingCount,
  inProgressCount,
  resolvedCount,
}: MetricBentoCardsProps) {
  
  const cardConfigs = React.useMemo<MetricCardConfig[]>(() => [
    {
      status: 'Xử lý ngay',
      title: 'Xử lý ngay',
      subtitle: 'Cần giải quyết gấp',
      count: immediateCount,
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600',
      activeStyles: 'ring-2 ring-rose-600 border-rose-600 bg-rose-50/5 shadow-md shadow-rose-500/10',
      hoverStyles: 'border-slate-200 shadow-2xs hover:border-rose-500/40 hover:shadow-xs',
      countColor: 'text-[#C21A1A]',
    },
    {
      status: 'Chờ duyệt',
      title: 'Chờ duyệt',
      subtitle: 'Chờ phê duyệt',
      count: pendingCount,
      icon: HelpCircle,
      iconBg: 'bg-amber-50 text-amber-600',
      activeStyles: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/5 shadow-md shadow-amber-500/10',
      hoverStyles: 'border-slate-200 shadow-2xs hover:border-amber-500/40 hover:shadow-xs',
      countColor: 'text-amber-500',
    },
    {
      status: 'Đang triển khai',
      title: 'Đang triển khai',
      subtitle: 'Đang chạy thực tế',
      count: inProgressCount,
      icon: Clock,
      iconBg: 'bg-emerald-50 text-emerald-600',
      activeStyles: 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/5 shadow-md shadow-emerald-500/10',
      hoverStyles: 'border-slate-200 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs',
      countColor: 'text-emerald-600',
    },
    {
      status: 'Đã xử lý',
      title: 'Đã xử lý',
      subtitle: 'Đã lưu trữ hồ sơ',
      count: resolvedCount,
      icon: CheckCircle,
      iconBg: 'bg-blue-50 text-blue-600',
      activeStyles: 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/5 shadow-md shadow-blue-500/10',
      hoverStyles: 'border-slate-200 shadow-2xs hover:border-blue-500/40 hover:shadow-xs',
      countColor: 'text-blue-600',
    },
  ], [immediateCount, pendingCount, inProgressCount, resolvedCount]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cardConfigs.map((card) => {
        const isActive = selectedStatus === card.status;
        
        return (
          <MetricStatusCard
            key={card.status}
            card={card}
            isActive={isActive}
            onSelectStatus={onSelectStatus}
          />
        );
      })}
    </div>
  );
});

export default MetricBentoCards;
