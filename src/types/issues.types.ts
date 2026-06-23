export const SOP_ISSUE_STATUSES = [
  'Xử lý ngay',
  'Chờ duyệt',
  'Đang triển khai',
  'Đã xử lý',
] as const;

export type SOPIssueStatus = (typeof SOP_ISSUE_STATUSES)[number];
export type SOPIssueStatusFilter = 'all' | SOPIssueStatus;
export type SOPIssueCategory = 'sop_error' | 'exception' | 'risk' | 'improvement';

export const RESOLVED_SOP_ISSUE_STATUS: SOPIssueStatus = 'Đã xử lý';

export interface SOPIssue {
  id: string;
  storeId: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  status: SOPIssueStatus;
  category: SOPIssueCategory;
  date: string;
  actor: string;
  description?: string;
  process?: string;
  occurrence?: number;
  assignee?: string;
  rootCause?: string;
  proposedSolution?: string;
  expectedBenefit?: {
    timeSaved?: string;
    costSaved?: string;
    revenueIncrease?: string;
    otherBenefit?: string;
  };
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
  readConfirmedAt?: string;
  readConfirmedBy?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export function isOpenSopIssue(issue: Pick<SOPIssue, 'category' | 'status'>): boolean {
  return issue.category === 'sop_error' && issue.status !== RESOLVED_SOP_ISSUE_STATUS;
}
