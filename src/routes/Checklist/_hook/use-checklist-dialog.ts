import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  DEFAULT_CHECKLIST_COLOR_KEY,
  DEFAULT_CHECKLIST_ICON_NAME,
} from '../checklist-meta';

export type ChecklistDialogTaskInput = {
  id?: string;
  title: string;
  timeLimit?: string;
};

export type EditableChecklistCategory = {
  id: string;
  title: string;
  roleCode: string;
  iconName?: string;
  colorKey?: string;
  tasks: ChecklistDialogTaskInput[];
};

export const checklistFormSchema = z.object({
  roleCode: z.string().min(1, 'Vui long chon vai tro'),
  title: z.string().trim().min(1, 'Vui long dien ten nhom cong viec'),
  iconName: z.string().min(1, 'Vui long chon icon'),
  colorKey: z.string().min(1, 'Vui long chon mau'),
  tasks: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Vui long dien noi dung cong viec'),
      timeLimit: z.string().min(1, 'Vui long chon gio quy dinh'),
    }),
  ).min(1, 'Vui long them it nhat 1 cong viec'),
});

export type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface UseChecklistDialogProps {
  defaultRoleCode: string;
  onSaveCategoryBatch?: (params: {
    id: string | null;
    title: string;
    roleCode: string;
    iconName: string;
    colorKey: string;
    tasks: ChecklistDialogTaskInput[];
  }) => Promise<void>;
  onRequestEditCategory?: (
    categoryId: string,
  ) => Promise<EditableChecklistCategory | null> | EditableChecklistCategory | null;
}

const DEFAULT_TIME = '08:00';

export function useChecklistDialog({
  defaultRoleCode,
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
      title: options?.categoryTitle ?? '',
      iconName: DEFAULT_CHECKLIST_ICON_NAME,
      colorKey: DEFAULT_CHECKLIST_COLOR_KEY,
      tasks: [{ title: '', timeLimit: DEFAULT_TIME }],
    });
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode, dialogRoleCode]);

  const openEditDialog = useCallback(async (categoryId: string) => {
    if (!onRequestEditCategory) {
      return;
    }

    try {
      const data = await onRequestEditCategory(categoryId);
      if (!data) {
        setDialogError('Khong the tai du lieu nhom de chinh sua.');
        return;
      }

      setDialogEditCategoryId(data.id);
      setDialogInitialValues({
        roleCode: data.roleCode || defaultRoleCode,
        title: data.title,
        iconName: data.iconName || DEFAULT_CHECKLIST_ICON_NAME,
        colorKey: data.colorKey || DEFAULT_CHECKLIST_COLOR_KEY,
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
    } catch {
      setDialogError('Da xay ra loi khi tai thong tin chinh sua.');
    }
  }, [defaultRoleCode, onRequestEditCategory]);

  const handleDialogSubmit = useCallback(async (values: ChecklistFormValues) => {
    setDialogError(null);

    if (!onSaveCategoryBatch) {
      setDialogError('Khong the luu checklist do thieu cau hinh callback.');
      return;
    }

    const categoryTitle = values.title.trim();
    const validTasks = values.tasks
      .map((task) => ({
        id: task.id,
        title: task.title.trim(),
        timeLimit: task.timeLimit?.trim() || undefined,
      }))
      .filter((task) => task.title.length > 0);

    if (validTasks.length === 0) {
      setDialogError('Vui long them it nhat 1 noi dung cong viec.');
      return;
    }

    setIsSubmittingDialog(true);
    try {
      await onSaveCategoryBatch({
        id: dialogEditCategoryId,
        title: categoryTitle,
        roleCode: values.roleCode,
        iconName: values.iconName,
        colorKey: values.colorKey,
        tasks: validTasks,
      });

      setIsAddingItem(false);
      setDialogEditCategoryId(null);
      setDialogInitialValues(null);
    } catch (err: any) {
      setDialogError(err?.message || 'Khong the luu checklist. Vui long kiem tra du lieu va thu lai.');
      throw err;
    } finally {
      setIsSubmittingDialog(false);
    }
  }, [dialogEditCategoryId, onSaveCategoryBatch]);

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
