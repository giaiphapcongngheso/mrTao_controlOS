import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  BarChart3,
  Target,
  DollarSign,
  Zap,
} from 'lucide-react';
import { cn } from '../../../../share/lib/utils';
import type { SOPIssue, SOPIssueCategory } from '../../../types/issues.types';
import type { ColumnDef } from '@tanstack/react-table';
import { CustomTable } from '../../../../share/components/custom-table';
import { MobileCard } from '../../../components/custom/mobile-card';

// ── Types ──
interface IssuesOverviewTabProps {
  issues: SOPIssue[];
}

interface OverviewMetric {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; isPositive: boolean };
}

interface CategoryDistribution {
  key: SOPIssueCategory;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

interface TopProcessItem {
  rank: number;
  name: string;
  count: number;
}

interface RecentIssueRow {
  id: string;
  code: string;
  title: string;
  category: SOPIssueCategory;
  assignee: string;
  date: string;
  status: string;
  costSaved?: string;
}

// ── Category config ──
const CATEGORY_CONFIG: Record<SOPIssueCategory, { label: string; color: string; bgColor: string; badgeBg: string; badgeText: string }> = {
  sop_error: { label: 'Lỗi SOP', color: '#C21A1A', bgColor: 'bg-rose-50', badgeBg: 'bg-rose-100', badgeText: 'text-[#C21A1A]' },
  exception: { label: 'Ngoại lệ', color: '#F59E0B', bgColor: 'bg-amber-50', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  risk: { label: 'Rủi ro', color: '#8B5CF6', bgColor: 'bg-purple-50', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  improvement: { label: 'Sáng kiến', color: '#10B981', bgColor: 'bg-emerald-50', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
};

// ── Utility: Parse monetary value ──
function parseCurrencyToNumber(val?: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ── Utility: Format number ──
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} tỷ`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} tr đ`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

// ── Sub-component: Metric Card ──
const MetricCard = React.memo(function MetricCard({ metric }: { metric: OverviewMetric }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow">
      <span className={cn('p-2.5 rounded-xl shrink-0 flex items-center justify-center', metric.iconBg)}>
        <metric.icon className={cn('w-5 h-5 stroke-[2.5]', metric.iconColor)} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-400 tracking-wider leading-none">{metric.label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-slate-800 tracking-tight tabular-nums leading-none">{metric.value}</span>
          {metric.trend && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-black px-1.5 py-0.5 rounded-md',
              metric.trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
            )}>
              {metric.trend.isPositive
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {metric.trend.isPositive ? '↑' : '↓'} {Math.abs(metric.trend.value)}%
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-bold mt-0.5">{metric.subtitle}</p>
      </div>
    </div>
  );
});

// ── Sub-component: CSS Donut Chart ──
const DonutChart = React.memo(function DonutChart({
  distributions,
  total,
}: {
  distributions: CategoryDistribution[];
  total: number;
}) {
  // Build conic-gradient stops
  const gradientStops = useMemo(() => {
    let currentAngle = 0;
    const stops: string[] = [];
    for (const dist of distributions) {
      const angle = (dist.percentage / 100) * 360;
      stops.push(`${dist.color} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    }
    // Fill remaining (if any rounding gap)
    if (currentAngle < 360) {
      stops.push(`#e2e8f0 ${currentAngle}deg 360deg`);
    }
    return stops.join(', ');
  }, [distributions]);

  return (
    <div className="flex items-center justify-between gap-4 w-full my-auto py-1">
      {/* Donut */}
      <div className="relative w-24 h-24 shrink-0">
        <div
          className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${gradientStops})` }}
        />
        {/* Inner white circle (donut hole) */}
        <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
          <span className="text-xl font-black text-slate-800 leading-none">{total}</span>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">Tổng số</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {distributions.map((dist) => (
          <div key={dist.key} className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dist.color }} />
            <span className="font-bold text-slate-500 truncate mr-1">{dist.label}</span>
            <span className="font-black text-slate-700 ml-auto tabular-nums shrink-0">{dist.count}</span>
            <span className="text-slate-400 font-bold text-[10px] shrink-0">({dist.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Sub-component: Top Process Ranked List ──
const TopProcessList = React.memo(function TopProcessList({ items }: { items: TopProcessItem[] }) {
  const maxCount = items.length > 0 ? items[0].count : 1;

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.rank} className="flex items-center gap-3">
          <span className="w-5 text-right text-sm font-black text-slate-400 tabular-nums">{item.rank}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-slate-700 truncate">{item.name}</span>
              <span className="text-sm font-black text-slate-800 tabular-nums shrink-0 ml-2">{item.count}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C21A1A] rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-slate-400 font-medium italic text-center py-4">Chưa có dữ liệu quy trình</p>
      )}
    </div>
  );
});

// ── Sub-component: Severity Distribution Bar ──
const SeverityBar = React.memo(function SeverityBar({
  highCount,
  mediumCount,
  lowCount,
  total,
}: {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  total: number;
}) {
  if (total === 0) return <p className="text-xs text-slate-400 font-medium italic text-center py-4">Chưa có dữ liệu</p>;
  const highPct = Math.round((highCount / total) * 100);
  const medPct = Math.round((mediumCount / total) * 100);
  const lowPct = 100 - highPct - medPct;

  const items = [
    { label: 'Cao', count: highCount, pct: highPct, barBg: 'bg-rose-500' },
    { label: 'Trung bình', count: mediumCount, pct: medPct, barBg: 'bg-amber-400' },
    { label: 'Thấp', count: lowCount, pct: lowPct, barBg: 'bg-slate-300' },
  ];

  return (
    <div className="space-y-3.5 w-full">
      {/* Stacked bar */}
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
        {highPct > 0 && <div className="bg-rose-500 h-full" style={{ width: `${highPct}%` }} />}
        {medPct > 0 && <div className="bg-amber-400 h-full" style={{ width: `${medPct}%` }} />}
        {lowPct > 0 && <div className="bg-slate-300 h-full" style={{ width: `${lowPct}%` }} />}
      </div>
      
      {/* Individual bars */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">{item.label}</span>
              <span className="font-black text-slate-700">
                {item.count} <span className="text-slate-400 font-bold">({item.pct}%)</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", item.barBg)}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Sub-component: Recent Issues Mini Table ──
const RecentIssuesTable = React.memo(function RecentIssuesTable({ rows }: { rows: RecentIssueRow[] }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const columns = useMemo<ColumnDef<RecentIssueRow>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Mã phiếu',
      cell: ({ row }) => <span className="font-bold text-slate-500 whitespace-nowrap">{row.original.code}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => <span className="font-bold text-slate-800 max-w-[200px] truncate block">{row.original.title}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Loại',
      cell: ({ row }) => {
        const catCfg = CATEGORY_CONFIG[row.original.category];
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black border', catCfg.badgeBg, catCfg.badgeText)}>
            {catCfg.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'assignee',
      header: 'Người ghi nhận',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200/50 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
            {row.original.assignee.charAt(0)}
          </span>
          <span className="font-medium text-slate-700 truncate max-w-[100px]">{row.original.assignee}</span>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Ngày',
      cell: ({ row }) => <span className="text-slate-500 font-medium whitespace-nowrap">{row.original.date}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const statusStyles: Record<string, string> = {
          'Xử lý ngay': 'text-[#C21A1A] bg-rose-50 border-rose-100',
          'Chờ duyệt': 'text-amber-700 bg-amber-50 border-amber-100',
          'Đang triển khai': 'text-emerald-700 bg-emerald-50 border-emerald-100',
          'Đã xử lý': 'text-blue-700 bg-blue-50 border-blue-100',
        };
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black border', statusStyles[row.original.status] || 'text-slate-600 bg-slate-50 border-slate-200')}>
            {row.original.status}
          </span>
        );
      },
    },
    {
      accessorKey: 'costSaved',
      header: () => <div className="text-right">Hiệu quả ước tính</div>,
      cell: ({ row }) => <div className="text-right font-bold text-slate-700 whitespace-nowrap tabular-nums">{row.original.costSaved || '—'}</div>,
    },
  ], []);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 font-medium italic text-center py-6">Chưa có phiếu nào được ghi nhận</p>;
  }

  return (
    <CustomTable
      columns={columns}
      data={rows}
      enableFiltering={false}
      enablePagination={true}
      enableSorting={false}
      showFilterRow={false}
      pagination={pagination}
      onPaginationChange={setPagination}
      pageSizeOptions={[5, 10, 20]}
    />
  );
});

// ── Sub-component: Recent Issues Mini Cards (Mobile) ──
const RecentIssuesCards = React.memo(function RecentIssuesCards({ rows }: { rows: RecentIssueRow[] }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 font-medium italic text-center py-6">Chưa có phiếu nào được ghi nhận</p>;
  }

  const paginatedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return rows.slice(start, start + pagination.pageSize);
  }, [rows, pagination.pageIndex, pagination.pageSize]);

  const totalPages = Math.ceil(rows.length / pagination.pageSize);

  const getCategoryLabel = (category: SOPIssueCategory) => {
    return CATEGORY_CONFIG[category]?.label || category;
  };

  const getAccentColor = (category: SOPIssueCategory) => {
    switch (category) {
      case 'sop_error': return 'red';
      case 'exception': return 'amber';
      case 'risk': return 'slate';
      case 'improvement': return 'teal';
      default: return 'none';
    }
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'Đã xử lý': return 'success';
      case 'Đang triển khai': return 'info';
      case 'Chờ duyệt': return 'warning';
      default: return 'error'; // Xử lý ngay
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3">
        {paginatedRows.map((row, idx) => (
          <MobileCard
            key={row.id}
            variant="bordered"
            accentColor={getAccentColor(row.category)}
            accentPosition="left"
            interactive={true}
            delayIndex={idx}
          >
            <MobileCard.Header
              title={row.title}
              subtitle={row.code}
              badge={{
                text: getCategoryLabel(row.category),
                variant: row.category === 'sop_error' ? 'error' :
                         row.category === 'exception' ? 'warning' :
                         row.category === 'improvement' ? 'success' : 'secondary'
              }}
              actions={
                <MobileCard.StatusIndicator
                  status={getStatusType(row.status)}
                  label={row.status}
                  pulse={row.status === 'Xử lý ngay'}
                />
              }
            />
            <MobileCard.Body className="p-3.5 space-y-2">
              <MobileCard.Grid
                cols={2}
                items={[
                  { label: 'Người ghi nhận', value: row.assignee },
                  { label: 'Ngày ghi nhận', value: row.date },
                  { 
                    label: 'Hiệu quả ước tính', 
                    value: row.costSaved || '—', 
                    fullWidth: true,
                    valueClassName: "text-emerald-600 dark:text-emerald-450 font-bold" 
                  }
                ]}
              />
            </MobileCard.Body>
          </MobileCard>
        ))}
      </div>

      {/* Phân trang di động tinh gọn */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-1 text-xs font-semibold text-slate-500">
          <button
            type="button"
            disabled={pagination.pageIndex === 0}
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            Trước
          </button>
          <span className="tabular-nums">
            Trang {pagination.pageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.pageIndex >= totalPages - 1}
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
});

// ── Section Card Wrapper ──
const SectionCard = React.memo(function SectionCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col h-full', className)}>
      <h3 className="text-sm font-black text-slate-400 tracking-wider mb-4 shrink-0">{title}</h3>
      <div className={cn('flex-1 flex flex-col justify-between', bodyClassName)}>{children}</div>
    </div>
  );
});

// ══════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════
const IssuesOverviewTab = React.memo(function IssuesOverviewTab({ issues }: IssuesOverviewTabProps) {
  // ── Compute all metrics from issues array ──
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let immediateCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let highSev = 0;
    let medSev = 0;
    let lowSev = 0;
    let totalCostSaved = 0;

    const categoryCounts: Record<SOPIssueCategory, number> = {
      sop_error: 0,
      exception: 0,
      risk: 0,
      improvement: 0,
    };

    const processMap = new Map<string, number>();
    let currentMonthCount = 0;
    let prevMonthCount = 0;
    let currentMonthResolved = 0;
    let prevMonthResolved = 0;

    for (const issue of issues) {
      total++;

      // Category
      if (issue.category in categoryCounts) {
        categoryCounts[issue.category]++;
      }

      // Status
      if (issue.status === 'Xử lý ngay') immediateCount++;
      else if (issue.status === 'Chờ duyệt') pendingCount++;
      else if (issue.status === 'Đang triển khai') inProgressCount++;
      else if (issue.status === 'Đã xử lý') resolvedCount++;

      // Severity
      if (issue.severity === 'High') highSev++;
      else if (issue.severity === 'Medium') medSev++;
      else lowSev++;

      // Process frequency
      const proc = issue.process || 'Khác';
      processMap.set(proc, (processMap.get(proc) || 0) + 1);

      // Cost saved
      if (issue.expectedBenefit?.costSaved) {
        totalCostSaved += parseCurrencyToNumber(issue.expectedBenefit.costSaved);
      }

      // Monthly trend calculation
      const dateStr = issue.createdAt || issue.date;
      if (dateStr) {
        const d = new Date(dateStr);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          currentMonthCount++;
          if (issue.status === 'Đã xử lý') currentMonthResolved++;
        } else if (
          (d.getFullYear() === currentYear && d.getMonth() === currentMonth - 1) ||
          (currentMonth === 0 && d.getFullYear() === currentYear - 1 && d.getMonth() === 11)
        ) {
          prevMonthCount++;
          if (issue.status === 'Đã xử lý') prevMonthResolved++;
        }
      }
    }

    // Compute trend percentage
    const totalTrend = prevMonthCount > 0
      ? Math.round(((currentMonthCount - prevMonthCount) / prevMonthCount) * 100)
      : 0;

    const resolvedTrend = prevMonthResolved > 0
      ? Math.round(((currentMonthResolved - prevMonthResolved) / prevMonthResolved) * 100)
      : 0;

    // Efficiency rate
    const efficiencyRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    // Category distributions
    const distributions: CategoryDistribution[] = (
      Object.keys(categoryCounts) as SOPIssueCategory[]
    ).map((key) => ({
      key,
      label: CATEGORY_CONFIG[key].label,
      count: categoryCounts[key],
      percentage: total > 0 ? Math.round((categoryCounts[key] / total) * 100) : 0,
      color: CATEGORY_CONFIG[key].color,
      bgColor: CATEGORY_CONFIG[key].bgColor,
    }));

    // Top 5 processes
    const topProcesses: TopProcessItem[] = Array.from(processMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry, idx) => ({
        rank: idx + 1,
        name: entry[0],
        count: entry[1],
      }));

    return {
      total,
      immediateCount,
      pendingCount,
      inProgressCount,
      resolvedCount,
      highSev,
      medSev,
      lowSev,
      totalCostSaved,
      totalTrend,
      resolvedTrend,
      efficiencyRate,
      distributions,
      topProcesses,
      currentMonthCount,
    };
  }, [issues]);

  // ── Metric cards config ──
  const metricCards = useMemo<OverviewMetric[]>(() => [
    {
      label: 'Tổng số cải tiến',
      value: String(stats.total),
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: BarChart3,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: stats.totalTrend !== 0 ? { value: Math.abs(stats.totalTrend), isPositive: stats.totalTrend > 0 } : undefined,
    },
    {
      label: 'Đang triển khai',
      value: String(stats.inProgressCount),
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: Clock,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Chờ duyệt',
      value: String(stats.pendingCount),
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: HelpCircle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Đã hoàn thành',
      value: String(stats.resolvedCount),
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: stats.resolvedTrend !== 0 ? { value: Math.abs(stats.resolvedTrend), isPositive: stats.resolvedTrend > 0 } : undefined,
    },
    {
      label: 'Tiết kiệm ước tính',
      value: formatNumber(stats.totalCostSaved),
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: DollarSign,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Hiệu quả trung bình',
      value: `${stats.efficiencyRate}%`,
      subtitle: `so với T${new Date().getMonth() === 0 ? 12 : new Date().getMonth()}/${new Date().getFullYear()}`,
      icon: Target,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
  ], [stats]);

  // ── Recent issues (last 5 by date) ──
  const recentRows = useMemo<RecentIssueRow[]>(() => {
    const sorted = [...issues]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date).getTime();
        const dateB = new Date(b.createdAt || b.date).getTime();
        return dateB - dateA;
      });

    return sorted.map((issue, idx) => ({
      id: issue.id,
      code: `CT-${new Date(issue.createdAt || issue.date).getFullYear()}-${String(issues.length - idx).padStart(5, '0')}`,
      title: issue.title,
      category: issue.category,
      assignee: issue.actor || 'Hệ thống',
      date: issue.date,
      status: issue.status,
      costSaved: issue.expectedBenefit?.costSaved,
    }));
  }, [issues]);

  // ── Monthly target (simple progress) ──
  const monthlyTarget = useMemo(() => {
    const targetCount = Math.max(stats.total, 10); // Rough target estimate
    const progress = targetCount > 0 ? Math.min(Math.round((stats.resolvedCount / targetCount) * 100), 100) : 0;
    return { progress, resolved: stats.resolvedCount, target: targetCount };
  }, [stats]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Row 1: Metric Cards (6 columns) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* ── Row 2: Charts & Target Grid (1 row, 4 columns) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Donut Chart - Category Distribution */}
        <SectionCard title="Phân bổ theo loại">
          <DonutChart distributions={stats.distributions} total={stats.total} />
        </SectionCard>

        {/* Top Process Issues */}
        <SectionCard title="Top vấn đề theo tần suất">
          <TopProcessList items={stats.topProcesses} />
        </SectionCard>

        {/* Severity Distribution */}
        <SectionCard title="Phân bổ mức nghiêm trọng">
          <SeverityBar
            highCount={stats.highSev}
            mediumCount={stats.medSev}
            lowCount={stats.lowSev}
            total={stats.total}
          />
        </SectionCard>

        {/* Monthly Target */}
        <SectionCard title={`Mục tiêu tháng ${String(new Date().getMonth() + 1).padStart(2, '0')}`}>
          <div className="space-y-3.5 w-full">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 truncate">
                  Đóng vòng phiếu ưu tiên Cao
                </span>
                <span className="font-black text-slate-800 tabular-nums shrink-0 ml-1">{monthlyTarget.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C21A1A] to-rose-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${monthlyTarget.progress}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-bold">Đã xử lý</span>
                <span className="text-sm font-black text-slate-700 tabular-nums">{monthlyTarget.resolved} phiếu</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Chỉ tiêu</span>
                <span className="text-sm font-black text-slate-700 tabular-nums">{monthlyTarget.target} phiếu</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Row 4: Recent Issues Table & Cards ── */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-black text-slate-400 tracking-wider pl-1">Cải tiến mới ghi nhận</h3>
        <div className="hidden md:block">
          <RecentIssuesTable rows={recentRows} />
        </div>
        <div className="block md:hidden">
          <RecentIssuesCards rows={recentRows} />
        </div>
      </div>
    </div>
  );
});

export default IssuesOverviewTab;
