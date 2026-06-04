import { useEffect, useMemo, useState } from 'react';
import {
  MARKETING_STATUS_OPTIONS,
  calculateMarketingSummary,
  createMarketingCampaign,
  filterMarketingCampaigns,
  marketingCampaignsService,
} from '../../../services/marketing-service';
import type {
  MarketingCampaign,
  MarketingCampaignCreateInput,
  MarketingCampaignFilters,
} from '../../../types/marketing.types';

const DEFAULT_FILTERS: MarketingCampaignFilters = {
  channel: 'all',
  status: 'all',
};

export function useMarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [filters, setFilters] = useState<MarketingCampaignFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load campaigns from Firestore on mount
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setIsLoading(true);
        const data = await marketingCampaignsService.getAll();
        // Sort campaigns by ID descending (newest first based on timestamp ID)
        const sorted = [...data].sort((a, b) => b.id.localeCompare(a.id));
        setCampaigns(sorted);
      } catch (error) {
        console.error('Failed to fetch marketing campaigns from Firestore:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  const summary = useMemo(() => calculateMarketingSummary(campaigns), [campaigns]);
  const filteredCampaigns = useMemo(() => filterMarketingCampaigns(campaigns, filters), [campaigns, filters]);

  const createCampaign = async (input: MarketingCampaignCreateInput) => {
    try {
      const nextCampaign = createMarketingCampaign(input);
      const created = await marketingCampaignsService.create(nextCampaign);
      setCampaigns((prev) => [created, ...prev]);
      marketingCampaignsService.invalidateCache();
    } catch (error) {
      console.error('Failed to create marketing campaign in Firestore:', error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      await marketingCampaignsService.delete(campaignId);
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId));
      marketingCampaignsService.invalidateCache();
    } catch (error) {
      console.error('Failed to delete marketing campaign from Firestore:', error);
    }
  };

  const rotateCampaignStatus = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    const currentIndex = MARKETING_STATUS_OPTIONS.indexOf(campaign.status);
    const nextStatus = MARKETING_STATUS_OPTIONS[(currentIndex + 1) % MARKETING_STATUS_OPTIONS.length];

    try {
      await marketingCampaignsService.update(campaignId, { status: nextStatus });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, status: nextStatus } : c))
      );
      marketingCampaignsService.invalidateCache();
    } catch (error) {
      console.error('Failed to rotate campaign status in Firestore:', error);
    }
  };

  const updateCampaign = async (campaignId: string, input: Partial<MarketingCampaign>) => {
    try {
      await marketingCampaignsService.update(campaignId, input);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, ...input } : c))
      );
      marketingCampaignsService.invalidateCache();
    } catch (error) {
      console.error('Failed to update marketing campaign in Firestore:', error);
    }
  };

  return {
    campaigns,
    filteredCampaigns,
    filters,
    summary,
    isLoading,
    setFilters,
    createCampaign,
    deleteCampaign,
    rotateCampaignStatus,
    updateCampaign,
  };
}
