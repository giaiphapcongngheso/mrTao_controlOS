export interface HandbookFormState {
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrls: string[];
  roles: string[];
  requiredRead: boolean;
  isUpdated: boolean;
  driveLink: string;
  categoryKey: string;
}

export interface HandbookPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}
