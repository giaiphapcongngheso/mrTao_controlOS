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
