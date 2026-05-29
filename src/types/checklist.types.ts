export interface ChecklistCategory {
  id: string;
  storeId: string;
  title: string;
  countDone: number;
  countTotal: number;
  isCompleted: boolean;
  categoryType?: 'today' | 'process';
}

export interface ChecklistItem {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  isCompleted: boolean;
  timeSlot?: string;
  timeLimit?: string;
  roleCode?: string;
  dateKey?: string;
  isTemplate?: boolean;
  checklistName?: string;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
  checkedAt?: string;
  checkedByName?: string;
  checkedByUsername?: string;
}
