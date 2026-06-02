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
  imageUrls?: string[];
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
  iconName?: string;
  colorKey?: string;
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
 * A single step (and optional nested sub-steps) inside a ProcessDocument.
 * Supports one level of nesting: a core step can contain sub-steps.
 */
export interface ProcessStep {
  id: string;
  title: string;
  tasks?: string[];
  steps?: ProcessStep[];
}

/**
 * Independent process collection (not checklist snapshot).
 * Supports a parent-child tree structure via ProcessStep.
 * Collection: processes
 */
export interface ProcessDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  title: string;
  description?: string;
  iconName?: string;
  colorKey?: string;
  steps: ProcessStep[];
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
  roleCode?: string;
  iconName?: string;
  colorKey?: string;
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
  imageUrls?: string[];
}
