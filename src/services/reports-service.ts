import type { DailyReport } from '../types/reports.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

export interface HighlightIssue {
  id: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  rootCause: string;
  action: string;
}

export interface PromiseItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  url?: string;
}

export interface ReportSubmission {
  id: string;
  storeId: string;
  period: 'day' | 'week' | 'month';
  dateKey: string;
  timestamp: string;
  status: 'green' | 'yellow' | 'red';
  revenue: number;
  billCount: number;
  checklistPct: number;
  checklistRatio: string;
  delayedCount: number;
  sopErrorsCount: number;
  complaintsCount: number;
  staffIssuesCount: number;
  notes: string;
  actor: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'supplement_requested';
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // New fields for extended form
  reportDate?: string;
  shift?: string;
  department?: string;
  reporter?: string;
  highlightIssues?: HighlightIssue[];
  promises?: PromiseItem[];
  attachments?: AttachmentItem[];
  managerComment?: string;
  isDeleted?: boolean;
}

export const reportsDailyService = createBaseService<ReportSubmission, Partial<ReportSubmission>>({
  client: dataClient,
  resource: RESOURCE_PATH.REPORTS_DAILY,
});
