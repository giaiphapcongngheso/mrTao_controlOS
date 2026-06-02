import { useMemo, useState } from 'react';
import {
  INITIAL_MARKETING_CAMPAIGNS,
  MARKETING_STATUS_OPTIONS,
  calculateMarketingSummary,
  createMarketingCampaign,
  filterMarketingCampaigns,
} from '../services/marketing.service';
import type {
  MarketingCampaign,
  MarketingCampaignCreateInput,
  MarketingCampaignFilters,
} from '../types/marketing.types';

const DEFAULT_FILTERS: MarketingCampaignFilters = {
  channel: 'all',
  status: 'all',
};

export function useMarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_MARKETING_CAMPAIGNS);
  const [filters, setFilters] = useState<MarketingCampaignFilters>(DEFAULT_FILTERS);

  const summary = useMemo(() => calculateMarketingSummary(campaigns), [campaigns]);
  const filteredCampaigns = useMemo(() => filterMarketingCampaigns(campaigns, filters), [campaigns, filters]);

  const createCampaign = (input: MarketingCampaignCreateInput) => {
    const nextCampaign = createMarketingCampaign(input);
    setCampaigns((prev) => [nextCampaign, ...prev]);
  };

  const deleteCampaign = (campaignId: string) => {
    setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId));
  };

  const rotateCampaignStatus = (campaignId: string) => {
    setCampaigns((prev) =>
      prev.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }

        const currentIndex = MARKETING_STATUS_OPTIONS.indexOf(campaign.status);
        const nextStatus = MARKETING_STATUS_OPTIONS[(currentIndex + 1) % MARKETING_STATUS_OPTIONS.length];

        return {
          ...campaign,
          status: nextStatus,
        };
      }),
    );
  };

  return {
    campaigns,
    filteredCampaigns,
    filters,
    summary,
    setFilters,
    createCampaign,
    deleteCampaign,
    rotateCampaignStatus,
  };
}
