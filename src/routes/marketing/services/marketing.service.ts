import type {
  MarketingCampaign,
  MarketingCampaignCreateInput,
  MarketingCampaignFilters,
  MarketingCampaignStatus,
  MarketingCampaignSummary,
  MarketingChannel,
} from '../types/marketing.types';

export const MARKETING_CHANNEL_OPTIONS = [
  'Facebook',
  'TikTok',
  'Zalo',
  'Google Maps',
  'KOL/KOC',
] as const satisfies readonly MarketingChannel[];

export const MARKETING_STATUS_OPTIONS = [
  'active',
  'scheduled',
  'paused',
  'ended',
] as const satisfies readonly MarketingCampaignStatus[];

export const INITIAL_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-1',
    name: 'Đại tiệc iPhone 11 - Giá hủy diệt học sinh sinh viên',
    channel: 'Facebook',
    budget: 8000000,
    spent: 4500000,
    reach: 52000,
    clicks: 3400,
    conversions: 45,
    status: 'active',
    startDate: '2026-05-20',
    endDate: '2026-06-05',
  },
  {
    id: 'camp-2',
    name: 'Thu cũ đổi mới 18 bước tiêu chuẩn - Lên đời iPhone 15 Pro Max',
    channel: 'TikTok',
    budget: 15000000,
    spent: 12000000,
    reach: 185000,
    clicks: 14200,
    conversions: 88,
    status: 'active',
    startDate: '2026-05-15',
    endDate: '2026-05-31',
  },
  {
    id: 'camp-3',
    name: 'Khai trương quầy phụ kiện VIP - Tặng dán cường lực trọn đời',
    channel: 'Google Maps',
    budget: 3000000,
    spent: 1500000,
    reach: 22000,
    clicks: 1800,
    conversions: 120,
    status: 'active',
    startDate: '2026-05-25',
    endDate: '2026-06-10',
  },
  {
    id: 'camp-4',
    name: 'Chiến dịch Livestream TikTok Shop - Xả kho iPad Air 5 cũ',
    channel: 'KOL/KOC',
    budget: 12000000,
    spent: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
    status: 'scheduled',
    startDate: '2026-06-02',
    endDate: '2026-06-04',
  },
];

export function createMarketingCampaign(input: MarketingCampaignCreateInput): MarketingCampaign {
  return {
    ...input,
    id: `camp-${Date.now()}`,
    spent: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
  };
}

export function filterMarketingCampaigns(
  campaigns: MarketingCampaign[],
  filters: MarketingCampaignFilters,
): MarketingCampaign[] {
  return campaigns.filter((campaign) => {
    if (filters.channel !== 'all' && campaign.channel !== filters.channel) {
      return false;
    }

    if (filters.status !== 'all' && campaign.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export function calculateMarketingSummary(campaigns: MarketingCampaign[]): MarketingCampaignSummary {
  return campaigns.reduce<MarketingCampaignSummary>(
    (summary, campaign) => ({
      totalBudget: summary.totalBudget + campaign.budget,
      totalSpent: summary.totalSpent + campaign.spent,
      totalReach: summary.totalReach + campaign.reach,
      totalClicks: summary.totalClicks + campaign.clicks,
      totalConversions: summary.totalConversions + campaign.conversions,
    }),
    {
      totalBudget: 0,
      totalSpent: 0,
      totalReach: 0,
      totalClicks: 0,
      totalConversions: 0,
    },
  );
}
