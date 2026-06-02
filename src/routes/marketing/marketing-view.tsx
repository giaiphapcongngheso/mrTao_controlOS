import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui';
import { Trash2 } from 'lucide-react';
import MarketingCreateForm from './components/marketing-create-form';
import { useMarketingCampaigns } from './hooks/use-marketing-campaigns';
import { MARKETING_CHANNEL_OPTIONS, MARKETING_STATUS_OPTIONS } from './services/marketing.service';
import type { MarketingCampaignStatus } from './types/marketing.types';

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

export default function MarketingView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    filters,
    filteredCampaigns,
    summary,
    setFilters,
    createCampaign,
    deleteCampaign,
    rotateCampaignStatus,
  } = useMarketingCampaigns();

  const avgCpc = useMemo(
    () => (summary.totalClicks > 0 ? summary.totalSpent / summary.totalClicks : 0),
    [summary.totalClicks, summary.totalSpent],
  );

  const avgCpa = useMemo(
    () => (summary.totalConversions > 0 ? summary.totalSpent / summary.totalConversions : 0),
    [summary.totalConversions, summary.totalSpent],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Marketing & truyền thông</CardTitle>
          <Button onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? 'Đóng form' : 'Tạo chiến dịch'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-4">
            <p>Tổng ngân sách: <strong>{CURRENCY_FORMATTER.format(summary.totalBudget)}</strong></p>
            <p>Tổng chi tiêu: <strong>{CURRENCY_FORMATTER.format(summary.totalSpent)}</strong></p>
            <p>Avg CPC: <strong>{CURRENCY_FORMATTER.format(avgCpc)}</strong></p>
            <p>Avg CPA: <strong>{CURRENCY_FORMATTER.format(avgCpa)}</strong></p>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <MarketingCreateForm
          onCreate={(values) => {
            createCampaign(values);
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Danh sách chiến dịch</CardTitle>
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={filters.channel}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  channel: value as (typeof prev)['channel'],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Lọc theo kênh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kênh</SelectItem>
                {MARKETING_CHANNEL_OPTIONS.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value as (typeof prev)['status'],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {MARKETING_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredCampaigns.length === 0 ? (
            <p className="text-sm text-slate-500">Không có chiến dịch phù hợp.</p>
          ) : (
            filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{campaign.name}</h3>
                    <p className="text-xs text-slate-500">{campaign.channel} • {campaign.startDate} → {campaign.endDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{STATUS_LABEL[campaign.status]}</Badge>
                    <Button size="sm" variant="outline" onClick={() => rotateCampaignStatus(campaign.id)}>
                      Đổi trạng thái
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCampaign(campaign.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-4">
                  <p>Ngân sách: <strong>{CURRENCY_FORMATTER.format(campaign.budget)}</strong></p>
                  <p>Đã chi: <strong>{CURRENCY_FORMATTER.format(campaign.spent)}</strong></p>
                  <p>Lượt click: <strong>{campaign.clicks.toLocaleString('vi-VN')}</strong></p>
                  <p>Chuyển đổi: <strong>{campaign.conversions.toLocaleString('vi-VN')}</strong></p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
