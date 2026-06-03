export type MarketingChannel = 'Facebook' | 'TikTok' | 'Zalo' | 'Google Maps' | 'KOL/KOC';

export type MarketingCampaignStatus = 'active' | 'scheduled' | 'paused' | 'ended';

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: MarketingChannel;
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  status: MarketingCampaignStatus;
  startDate: string;
  endDate: string;
}

export interface MarketingCampaignCreateInput {
  name: string;
  channel: MarketingChannel;
  budget: number;
  spent: number;
  status: MarketingCampaignStatus;
  startDate: string;
  endDate: string;
}

export interface MarketingCampaignFilters {
  channel: MarketingChannel | 'all';
  status: MarketingCampaignStatus | 'all';
}

export interface MarketingCampaignSummary {
  totalBudget: number;
  totalSpent: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
}
