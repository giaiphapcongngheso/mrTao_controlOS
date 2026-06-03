import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@shared/ui';
import {
  Trash2,
  CircleDollarSign,
  TrendingUp,
  MousePointerClick,
  Target,
  Plus,
  Search,
  Share2,
  Activity,
  Calendar,
  Facebook,
  MapPin,
  Star,
  Play,
  CalendarDays,
  Pause,
  StopCircle,
} from 'lucide-react';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';
import { NumberRangePicker } from '../../../share/components/custom/number-range-picker';
import MarketingCreateForm from './components/marketing-create-form';
import { useMarketingCampaigns } from './hooks/use-marketing-campaigns';
import { MARKETING_CHANNEL_OPTIONS, MARKETING_STATUS_OPTIONS } from '../../services/marketing-service';
import type { MarketingCampaignStatus, MarketingCampaign } from '../../types/marketing.types';
import { ModuleHeader, CustomTable } from '@shared/components';
import type { ColumnDef } from '@tanstack/react-table';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<MarketingCampaignStatus, string> = {
  active: 'Đang chạy',
  scheduled: 'Đã lên lịch',
  paused: 'Tạm dừng',
  ended: 'Kết thúc',
};

const CHANNEL_LABEL: Record<string, string> = {
  'Facebook': 'Facebook',
  'TikTok': 'TikTok',
  'Zalo': 'Zalo',
  'Google Maps': 'Google Maps',
  'KOL/KOC': 'KOL / KOC',
};

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .78.1v-3.5a6.44 6.44 0 0 0-3.09.77 6.33 6.33 0 0 0-3.23 5.56 6.34 6.34 0 0 0 10.94 4.43 6.27 6.27 0 0 0 1.62-4.4V7.87a8.21 8.21 0 0 0 5.28 1.89v-3.4a4.78 4.78 0 0 1-1.42-.27z" />
    </svg>
  );
}

export function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M8 9h8l-8 6h8" />
    </svg>
  );
}

export const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Facebook': Facebook,
  'TikTok': TikTokIcon,
  'Zalo': ZaloIcon,
  'Google Maps': MapPin,
  'KOL/KOC': Star,
};

export const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  active: Play,
  scheduled: CalendarDays,
  paused: Pause,
  ended: StopCircle,
};

export const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-500',
  scheduled: 'text-amber-500',
  paused: 'text-orange-500',
  ended: 'text-slate-500',
};

export default function MarketingView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
  const [campaignToRotateStatus, setCampaignToRotateStatus] = useState<{
    id: string;
    name: string;
    currentStatus: MarketingCampaignStatus;
  } | null>(null);

  const {
    filters,
    filteredCampaigns,
    setFilters,
    createCampaign,
    deleteCampaign,
    rotateCampaignStatus,
  } = useMarketingCampaigns();

  // Filter campaigns locally by searchQuery to sync stats cards with search results
  const displayedCampaigns = useMemo(() => {
    let result = filteredCampaigns;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [filteredCampaigns, searchQuery]);

  // Recalculate summary dynamically based on displayed campaigns
  const summary = useMemo(() => {
    return displayedCampaigns.reduce(
      (sum, campaign) => ({
        totalBudget: sum.totalBudget + campaign.budget,
        totalSpent: sum.totalSpent + campaign.spent,
        totalClicks: sum.totalClicks + campaign.clicks,
        totalConversions: sum.totalConversions + campaign.conversions,
      }),
      { totalBudget: 0, totalSpent: 0, totalClicks: 0, totalConversions: 0 }
    );
  }, [displayedCampaigns]);

  const avgCpc = useMemo(
    () => (summary.totalClicks > 0 ? summary.totalSpent / summary.totalClicks : 0),
    [summary.totalClicks, summary.totalSpent],
  );

  const avgCpa = useMemo(
    () => (summary.totalConversions > 0 ? summary.totalSpent / summary.totalConversions : 0),
    [summary.totalConversions, summary.totalSpent],
  );

  const nextStatusLabel = useMemo(() => {
    if (!campaignToRotateStatus) {
      return '';
    }
    const currentIndex = MARKETING_STATUS_OPTIONS.indexOf(campaignToRotateStatus.currentStatus);
    const nextStatus = MARKETING_STATUS_OPTIONS[(currentIndex + 1) % MARKETING_STATUS_OPTIONS.length];
    return STATUS_LABEL[nextStatus];
  }, [campaignToRotateStatus]);

  // Define columns for CustomTable
  const columns = useMemo<ColumnDef<MarketingCampaign>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên chiến dịch',
        size: 200,
        cell: ({ row }) => (
          <div className="font-bold text-slate-800 dark:text-slate-200 text-left">
            {row.original.name}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc tên..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'channel',
        header: 'Kênh quảng cáo',
        size: 130,
        cell: ({ row }) => {
          const channel = row.original.channel;
          const IconComponent = CHANNEL_ICONS[channel];
          let customClass = "";
          switch (channel) {
            case 'Facebook':
              customClass = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300";
              break;
            case 'TikTok':
              customClass = "bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-950/30 dark:border-pink-900 dark:text-pink-300";
              break;
            case 'Zalo':
              customClass = "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-300";
              break;
            case 'Google Maps':
              customClass = "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300";
              break;
            case 'KOL/KOC':
              customClass = "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900 dark:text-purple-300";
              break;
          }
          return (
            <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-xs font-semibold flex items-center gap-1.5 w-max ${customClass}`}>
              {IconComponent && <IconComponent className="h-3.5 w-3.5 shrink-0" />}
              {CHANNEL_LABEL[channel] || channel}
            </Badge>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">Tất cả</option>
                {MARKETING_CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABEL[c] || c}
                  </option>
                ))}
              </select>
            );
          },
        },
      },
      {
        accessorKey: 'budget',
        header: 'Ngân sách',
        size: 150,
        cell: ({ row }) => (
          <div className="text-right font-bold text-slate-800 dark:text-slate-200">
            {CURRENCY_FORMATTER.format(row.original.budget)}
          </div>
        ),
        filterFn: 'inNumberRange',
        meta: {
          filterElement: (column) => (
            <NumberRangePicker
              value={column.getFilterValue() as [number, number] | undefined}
              onChange={(val) => column.setFilterValue(val)}
            />
          ),
        },
      },
      {
        accessorKey: 'spent',
        header: 'Đã chi tiêu',
        size: 150,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-slate-500 dark:text-slate-400">
            {CURRENCY_FORMATTER.format(row.original.spent)}
          </div>
        ),
        filterFn: 'inNumberRange',
        meta: {
          filterElement: (column) => (
            <NumberRangePicker
              value={column.getFilterValue() as [number, number] | undefined}
              onChange={(val) => column.setFilterValue(val)}
            />
          ),
        },
      },
      {
        accessorKey: 'clicks',
        header: 'Lượt click',
        size: 100,
        cell: ({ row }) => (
          <div className="text-right font-medium text-slate-700 dark:text-slate-300">
            {row.original.clicks.toLocaleString('vi-VN')}
          </div>
        ),
      },
      {
        accessorKey: 'conversions',
        header: 'Chuyển đổi',
        size: 110,
        cell: ({ row }) => (
          <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
            {row.original.conversions.toLocaleString('vi-VN')}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 130,
        cell: ({ row }) => {
          const status = row.original.status;
          const IconComponent = STATUS_ICONS[status];
          let customClass = "";
          let iconColor = "";
          switch (status) {
            case 'active':
              customClass = "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300";
              iconColor = "text-emerald-500";
              break;
            case 'scheduled':
              customClass = "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300";
              iconColor = "text-amber-500";
              break;
            case 'paused':
              customClass = "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-300";
              iconColor = "text-orange-500";
              break;
            case 'ended':
              customClass = "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
              iconColor = "text-slate-400";
              break;
          }
          return (
            <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-xs font-semibold flex items-center gap-1.5 w-max ${customClass}`}>
              {IconComponent && <IconComponent className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />}
              {STATUS_LABEL[status]}
            </Badge>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">Tất cả</option>
                {MARKETING_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            );
          },
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 150,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 justify-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-2 rounded-lg font-semibold hover:bg-slate-50 transition-all active:scale-97 cursor-pointer"
              onClick={() =>
                setCampaignToRotateStatus({
                  id: row.original.id,
                  name: row.original.name,
                  currentStatus: row.original.status,
                })
              }
            >
              Đổi trạng thái
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all active:scale-97 cursor-pointer"
              onClick={() =>
                setCampaignToDelete({
                  id: row.original.id,
                  name: row.original.name,
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [rotateCampaignStatus, deleteCampaign],
  );

  return (
    <div className="space-y-4 font-sans text-slate-650">
      {/* 🚀 Header Module */}
      <ModuleHeader title="Chiến dịch Marketing" description="Quản lý ngân sách, đo lường và theo dõi các kênh truyền thông của bạn">
        <Button
          onClick={() => setShowCreateForm(true)}
          className="rounded-xl px-4 h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 text-white font-bold text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-97 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5px]" />
          Tạo chiến dịch
        </Button>
      </ModuleHeader>

      {/* 📊 Thống kê Số liệu tinh gọn và sang trọng */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-3xs font-sans">
        {/* Card 1: Tổng ngân sách */}
        <div className="flex items-center gap-3 px-3 py-1 text-left font-sans">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100/60 text-blue-655 shrink-0 dark:bg-blue-950/20">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block leading-tight">Tổng ngân sách</span>
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-normal mt-0.5">
              {CURRENCY_FORMATTER.format(summary.totalBudget)}
            </div>
          </div>
        </div>

        {/* Card 2: Tổng chi tiêu */}
        <div className="flex items-center gap-3 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 text-left font-sans">
          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100/60 text-orange-655 shrink-0 dark:bg-orange-950/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block leading-tight">Tổng chi tiêu</span>
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-normal mt-0.5">
              {CURRENCY_FORMATTER.format(summary.totalSpent)}
            </div>
          </div>
        </div>

        {/* Card 3: Avg CPC */}
        <div className="flex items-center gap-3 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 text-left font-sans">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100/60 text-emerald-650 shrink-0 dark:bg-emerald-950/20">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block leading-tight">CPC Trung bình</span>
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-normal mt-0.5">
              {CURRENCY_FORMATTER.format(avgCpc)}
            </div>
          </div>
        </div>

        {/* Card 4: Avg CPA */}
        <div className="flex items-center gap-3 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 text-left font-sans">
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100/60 text-purple-600 shrink-0 dark:bg-purple-950/20">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block leading-tight">CPA Trung bình</span>
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-normal mt-0.5">
              {CURRENCY_FORMATTER.format(avgCpa)}
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 Bộ lọc chiến dịch tinh gọn trên một dòng */}
      <div className="flex flex-col md:flex-row items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/95 shadow-3xs font-sans">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 h-9 rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40 transition focus-visible:bg-white"
            placeholder="Tìm theo tên chiến dịch..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-2/3 md:justify-end">
          {/* Lọc theo kênh */}
          <Select
            value={filters.channel}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                channel: value as any,
              }))
            }
          >
            <SelectTrigger className="h-9 w-[170px] rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40">
              <span className="flex items-center gap-1.5 truncate">
                <Share2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue placeholder="Kênh quảng cáo" />
              </span>
            </SelectTrigger>
            <SelectContent className="font-sans text-sm">
              <SelectItem value="all">Tất cả kênh</SelectItem>
              {MARKETING_CHANNEL_OPTIONS.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {CHANNEL_LABEL[channel] || channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Lọc theo trạng thái */}
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value as any,
              }))
            }
          >
            <SelectTrigger className="h-9 w-[170px] rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40">
              <span className="flex items-center gap-1.5 truncate">
                <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue placeholder="Trạng thái" />
              </span>
            </SelectTrigger>
            <SelectContent className="font-sans text-sm">
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {MARKETING_STATUS_OPTIONS.map((status) => {
                const IconComponent = STATUS_ICONS[status];
                const colorClass = STATUS_COLORS[status];
                return (
                  <SelectItem key={status} value={status}>
                    <span className="flex items-center gap-2">
                      {IconComponent && <IconComponent className={`h-4 w-4 shrink-0 ${colorClass}`} />}
                      {STATUS_LABEL[status]}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {(searchQuery || filters.channel !== 'all' || filters.status !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilters({ channel: 'all', status: 'all' });
              }}
              className="h-9 text-sm font-medium text-slate-400 hover:text-slate-700 px-2 rounded-lg"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* 📋 Bảng danh sách chiến dịch */}
      <CustomTable<MarketingCampaign>
        columns={columns}
        data={displayedCampaigns}
        enablePagination={true}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyMessage="Không tìm thấy chiến dịch marketing nào phù hợp."
        className="h-[calc(100vh-365px)]"
      />

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl rounded-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-slate-800">Tạo chiến dịch marketing</DialogTitle>
          </DialogHeader>
          <MarketingCreateForm
            onCreate={(values) => {
              createCampaign(values);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      <ActionConfirmDialog
        open={campaignToRotateStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignToRotateStatus(null);
          }
        }}
        title="Xác nhận đổi trạng thái"
        description={
          campaignToRotateStatus
            ? `Bạn có chắc muốn đổi trạng thái chiến dịch "${campaignToRotateStatus.name}" sang "${nextStatusLabel}"?`
            : ''
        }
        onConfirm={() => {
          if (campaignToRotateStatus) {
            rotateCampaignStatus(campaignToRotateStatus.id);
          }
        }}
        variant="confirm"
      />

      <ActionConfirmDialog
        open={campaignToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignToDelete(null);
          }
        }}
        title="Xác nhận xóa chiến dịch"
        description={
          campaignToDelete
            ? `Bạn có chắc muốn xóa chiến dịch "${campaignToDelete.name}" không?`
            : ''
        }
        onConfirm={() => {
          if (campaignToDelete) {
            deleteCampaign(campaignToDelete.id);
          }
        }}
        variant="confirm"
      />
    </div>
  );
}

