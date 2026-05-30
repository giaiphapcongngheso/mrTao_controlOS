export interface HandbookReadAudit {
  username: string;
  fullName: string;
  readAt: string;
}

export interface HandbookDoc {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  requiredRead?: boolean;
  isUpdated?: boolean;
  driveLink?: string;
  categoryKey?: string;
  sortOrder?: number;
  readAudits?: Record<string, HandbookReadAudit>;
  createdAt?: string;
  updatedAt?: string;
}

export interface HandbookCategory {
  id: string;
  name: string;
  normalizedName?: string;
  createdAt?: string;
  updatedAt?: string;
}
