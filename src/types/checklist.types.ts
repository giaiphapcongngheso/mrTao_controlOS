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
  templateId?: string;  // Source template ID for category grouping
  checkedAt?: string | null;
  checkedByName?: string | null;
  checkedByUsername?: string | null;
  imageUrls?: string[];
  // Mang theo cấu hình từ template để validate
  isRequired?: boolean;
  evidenceRequired?: boolean;
}

/**
 * Template/process task without completion state.
 */
export interface ChecklistTemplateTask {
  id: string;
  title: string;
  timeLimit?: string;
  isRequired?: boolean; // Bắt buộc thực hiện
  evidenceRequired?: boolean; // Yêu cầu bằng chứng hình ảnh (boolean)
}

/**
 * Checklist template source.
 * Collection: checklist_templates
 */
export interface ChecklistTemplateDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  title?: string;
  iconName?: string;
  colorKey?: string;
  tasks: ChecklistTemplateTask[];
  // Các trường cấu hình nâng cao mới
  frequency?: string;          // daily | weekly | monthly
  frequencyDetail?: string;    // Chi tiết tần suất ví dụ thứ trong tuần: "1" (T2) -> "7" (CN)
  shift?: string;              // all_day | morning | afternoon | night
  autoCreateDaily?: boolean;   // Tự động tạo checklist hàng ngày
  status?: string;             // active | hidden
  defaultAssignee?: string;    // all_staff | ID cụ thể
  inspectorId?: string;        // ID người kiểm tra
  inspectorName?: string;      // Tên người kiểm tra
}

/**
 * Daily checklist snapshot.
 * Collection: checklists
 */
export interface ChecklistDocument extends BaseEntity {
  storeId: string;
  roleCode: string;
  dateKey: string;
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
  
  // Advanced SOP fields
  objective?: string;           // Mục tiêu quy trình
  whenToUse?: string;           // Khi nào dùng
  responsibleRole?: string;     // Vai trò chịu trách nhiệm chính
  mandatoryControls?: string[]; // Điểm kiểm soát bắt buộc (bullet points)
  attachments?: Array<{         // Biểu mẫu / tài liệu liên quan
    name: string;
    url: string;
    type: 'pdf' | 'excel' | 'word' | 'other';
  }>;
  status?: string;              // Trạng thái: active | hidden
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
  templateId?: string;
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
  // Mang theo cấu hình từ template để validate
  isRequired?: boolean;
  evidenceRequired?: boolean;
}
