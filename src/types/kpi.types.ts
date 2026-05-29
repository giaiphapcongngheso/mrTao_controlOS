export interface StaffRank {
  storeId: string;
  name: string;
  role: string;
  score: number;
  classification: 'excellent' | 'good' | 'pass' | 'needs_improvement';
  avatar?: string;
}
