import { BaseEntity } from './base.types';

/**
 * Snapshot task in daily checklist documents.
 * Includes completion state and auditing fields.
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
 * Template/process task without completion state.
 */
export interface ChecklistTemplateTask {
  id: string;
  title: string;
  timeLimit?: string;
}

/**
 * Checklist template source.
 * Collection: checklist_templates
 */
export interface ChecklistTemplateDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  title: string;
  tasks: ChecklistTemplateTask[];
}

/**
 * Daily checklist snapshot.
 * Collection: checklists
 */
export interface ChecklistDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  title: string;
  dateKey: string;
  templateId: string | null;
  tasks: ChecklistTask[];
}

/**
 * Independent process collection (not checklist snapshot).
 * Collection: processes
 */
export interface ProcessDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  title: string;
  tasks: ChecklistTemplateTask[];
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
