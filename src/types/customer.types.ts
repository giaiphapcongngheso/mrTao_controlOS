export type CustomerDataSource = 'synced' | 'manual';

export interface Customer {
  id: string; // KiotViet ID (String representation) or custom generated manual ID
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  debt: number;
  totalSpent: number;
  points: number;
  groupName?: string;
  groupId?: number;
  isActive: boolean;
  source: CustomerDataSource;
  lastSyncedAt?: string;
  updatedAt: string;
}

export interface CustomerSyncLog {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  summary?: string;
  totalSynced: number;
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  errorDetails?: string;
  triggeredBy: string; // 'manual' | 'system_cron'
}

export interface CustomerFilters {
  query: string;
  groupId: number | null;
  hasDebtOnly: boolean;
}
