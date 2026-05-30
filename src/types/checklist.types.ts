import { BaseEntity } from './base.types';

/**
 * A single task within a checklist category.
 * Tasks are embedded directly inside a ChecklistDocument.
 */
export interface ChecklistTask extends BaseEntity {
  title: string;
  isCompleted: boolean;
  timeLimit?: string;
  dateKey?: string;
  checkedAt?: string | null;
  checkedByName?: string | null;
  checkedByUsername?: string | null;
}

/**
 * A Firestore document representing a checklist category
 * with its tasks embedded directly inside.
 *
 * Collection: "checklists"
 */
export interface ChecklistDocument extends BaseEntity {
  storeId: string;
  title: string;
  categoryType: 'today' | 'process';
  roleCode: string;
  tasks: ChecklistTask[];
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
export interface ChecklistItem extends BaseEntity {
  storeId: string;
  categoryId: string;
  title: string;
  isCompleted: boolean;
  timeLimit?: string;
  roleCode?: string;
  dateKey?: string;
  checklistName?: string;
  checkedAt?: string | null;
  checkedByName?: string | null;
  checkedByUsername?: string | null;
}
