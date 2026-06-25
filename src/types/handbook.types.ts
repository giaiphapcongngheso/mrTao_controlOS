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
  imageUrls?: string[];
  requiredRead?: boolean;
  isUpdated?: boolean;
  driveLink?: string;
  categoryKey?: string;
  sortOrder?: number;
  readAudits?: Record<string, HandbookReadAudit>;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HandbookCategory {
  id: string;
  name: string;
  normalizedName?: string;
  iconName?: string;
  colorKey?: HandbookCategoryColorKey;
  createdAt?: string;
  updatedAt?: string;
}

export type HandbookCategoryColorKey =
  | 'slate'
  | 'rose'
  | 'orange'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'pink'
  | 'sky'
  | 'amber'
  | 'violet';

export type HandbookCategoryRequestType = Pick<
  Partial<HandbookCategory>,
  'name' | 'normalizedName' | 'iconName' | 'colorKey' | 'createdAt' | 'updatedAt'
>;
