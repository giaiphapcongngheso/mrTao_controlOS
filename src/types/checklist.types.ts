/**
 * A single task within a checklist category.
 * Tasks are embedded directly inside a ChecklistDocument.
 */
export interface ChecklistTask {
  id: string;
  title: string;
  isCompleted: boolean;
  timeLimit?: string;
  dateKey?: string;
  checkedAt?: string | null;
  checkedByName?: string | null;
  checkedByUsername?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A Firestore document representing a checklist category
 * with its tasks embedded directly inside.
 *
 * Collection: "checklists"
 */
export interface ChecklistDocument {
  id: string;
  storeId: string;
  title: string;
  categoryType: 'today' | 'process';
  roleCode: string;
  tasks: ChecklistTask[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Derived type for UI display — keeps backward compatibility
 * with ChecklistViewCategory used in view components.
 */
export interface ChecklistCategory {
  id: string;
  storeId: string;
  title: string;
  countDone: number;
  countTotal: number;
  isCompleted: boolean;
  categoryType?: 'today' | 'process';
}

/**
 * Flat item representation used by view-layer components.
 * Derived from ChecklistTask + parent document info.
 */
export interface ChecklistItem {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  isCompleted: boolean;
  timeLimit?: string;
  roleCode?: string;
  dateKey?: string;
  checklistName?: string;
  createdAt?: string;
  updatedAt?: string;
  checkedAt?: string | null;
  checkedByName?: string | null;
  checkedByUsername?: string | null;
}
