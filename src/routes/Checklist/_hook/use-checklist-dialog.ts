import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

export type ChecklistDialogSubTab = 'today' | 'process' | 'completed';
export type ChecklistCategoryType = 'today' | 'process';

export type ChecklistDialogTaskInput = {
  id?: string;
  title: string;
  timeLimit?: string;
};

export type EditableChecklistCategory = {
  id: string;
  title: string;
  roleCode: string;
  tasks: ChecklistDialogTaskInput[];
};

export const checklistFormSchema = z.object({
  roleCode: z.string().min(1, 'Vui lòng chọn vai trò'),
  categoryId: z.string().trim().min(1, 'Vui lòng điền tên nhóm công việc'),
  tasks: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Vui lòng điền nội dung công việc'),
      timeLimit: z.string().min(1, 'Vui lòng chọn giờ quy định'),
    })
  ).min(1, 'Vui lòng thêm ít nhất 1 công việc'),
});

export type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface UseChecklistDialogProps {
  defaultRoleCode: string;
  subTab: ChecklistDialogSubTab;
  onSaveCategoryBatch?: (params: {
    categoryType: ChecklistCategoryType;
    id: string | null;
    title: string;
    roleCode: string;
    tasks: ChecklistDialogTaskInput[];
  }) => Promise<void>;
  onRequestEditCategory?: (
    categoryId: string,
    categoryType: ChecklistCategoryType,
  ) => Promise<EditableChecklistCategory | null> | EditableChecklistCategory | null;
}

const DEFAULT_TIME = '08:00';

export function useChecklistDialog({
  defaultRoleCode,
  subTab,
  onSaveCategoryBatch,
  onRequestEditCategory,
}: UseChecklistDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dialogRoleCode, setDialogRoleCode] = useState(defaultRoleCode);
  const [dialogEditCategoryId, setDialogEditCategoryId] = useState<string | null>(null);
  const [dialogInitialValues, setDialogInitialValues] = useState<ChecklistFormValues | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);

  useEffect(() => {
    setDialogRoleCode(defaultRoleCode);
  }, [defaultRoleCode]);

  const openCreateDialog = useCallback((options?: {
    roleCode?: string;
    categoryTitle?: string;
  }) => {
    setDialogEditCategoryId(null);
    setDialogInitialValues({
      roleCode: options?.roleCode ?? dialogRoleCode ?? defaultRoleCode,
      categoryId: options?.categoryTitle ?? '',
      tasks: [{ title: '', timeLimit: DEFAULT_TIME }],
    });
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode, dialogRoleCode]);

  const openEditDialog = useCallback(async (categoryId: string, categoryType: ChecklistCategoryType) => {
    if (!onRequestEditCategory) {
      return;
    }

    try {
      const data = await onRequestEditCategory(categoryId, categoryType);
      if (!data) {
        setDialogError('Không thể tải dữ liệu nhóm để chỉnh sửa.');
        return;
      }

      setDialogEditCategoryId(data.id);
      setDialogInitialValues({
        roleCode: data.roleCode || defaultRoleCode,
        categoryId: data.title,
        tasks: data.tasks.length > 0
          ? data.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              timeLimit: task.timeLimit || DEFAULT_TIME,
            }))
          : [{ title: '', timeLimit: DEFAULT_TIME }],
      });
      setDialogError(null);
      setIsAddingItem(true);
    } catch (err: any) {
      setDialogError('Đã xảy ra lỗi khi tải thông tin chỉnh sửa.');
    }
  }, [defaultRoleCode, onRequestEditCategory]);

  const handleDialogSubmit = useCallback(async (values: ChecklistFormValues) => {
    setDialogError(null);

    if (!onSaveCategoryBatch) {
      setDialogError('Không thể lưu checklist do thiếu cấu hình callback.');
      return;
    }

    const categoryTitle = values.categoryId.trim();
    const validTasks = values.tasks
      .map((task) => ({
        id: task.id,
        title: task.title.trim(),
        timeLimit: task.timeLimit?.trim() || undefined,
      }))
      .filter((task) => task.title.length > 0);

    if (validTasks.length === 0) {
      setDialogError('Vui lòng thêm ít nhất 1 nội dung công việc.');
      return;
    }

    setIsSubmittingDialog(true);
    try {
      const categoryType: ChecklistCategoryType = subTab === 'process' ? 'process' : 'today';
      await onSaveCategoryBatch({
        categoryType,
        id: dialogEditCategoryId,
        title: categoryTitle,
        roleCode: values.roleCode,
        tasks: validTasks,
      });

      setIsAddingItem(false);
      setDialogEditCategoryId(null);
      setDialogInitialValues(null);
    } catch (err: any) {
      setDialogError(err?.message || 'Không thể lưu checklist. Vui lòng kiểm tra dữ liệu và thử lại.');
      throw err;
    } finally {
      setIsSubmittingDialog(false);
    }
  }, [dialogEditCategoryId, onSaveCategoryBatch, subTab]);

  return {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogEditCategoryId,
    dialogInitialValues,
    dialogError,
    isSubmittingDialog,
    openCreateDialog,
    openEditDialog,
    handleDialogSubmit,
  };
}
