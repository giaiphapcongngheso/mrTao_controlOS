export interface SOPIssue {
  id: string;
  storeId: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  status: string;
  category: 'sop_error' | 'exception' | 'risk' | 'improvement';
  date: string;
  actor: string;
  description?: string;
  process?: string;
  occurrence?: number;
  assignee?: string;
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
