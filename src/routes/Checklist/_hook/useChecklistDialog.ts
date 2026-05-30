import React, { useCallback, useEffect, useState } from 'react';

type ChecklistDialogSubTab = 'today' | 'process' | 'completed';
type ChecklistCategoryType = 'today' | 'process';

export type ChecklistDialogTaskInput = {
  id?: string;
  title: string;
  timeLimit?: string;
};

type EditableChecklistCategory = {
  id: string;
  title: string;
  roleCode: string;
  tasks: ChecklistDialogTaskInput[];
};

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

type DialogTask = { id?: string; title: string; timeLimit: string };

const DEFAULT_TIME = '08:00';

export function useChecklistDialog({
  defaultRoleCode,
  subTab,
  onSaveCategoryBatch,
  onRequestEditCategory,
}: UseChecklistDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dialogRoleCode, setDialogRoleCode] = useState(defaultRoleCode);
  const [dialogCategoryId, setDialogCategoryId] = useState('');
  const [dialogChecklistName, setDialogChecklistName] = useState('');
  const [dialogEditCategoryId, setDialogEditCategoryId] = useState<string | null>(null);
  const [dialogTasks, setDialogTasks] = useState<DialogTask[]>([{ title: '', timeLimit: DEFAULT_TIME }]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);

  useEffect(() => {
    setDialogRoleCode(defaultRoleCode);
  }, [defaultRoleCode]);

  const addDialogTaskRow = useCallback(() => {
    setDialogTasks((prev) => [...prev, { title: '', timeLimit: DEFAULT_TIME }]);
  }, []);

  const removeDialogTaskRow = useCallback((index: number) => {
    setDialogTasks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateDialogTask = useCallback((index: number, fields: Partial<{ title: string; timeLimit: string }>) => {
    setDialogTasks((prev) => prev.map((task, i) => (i === index ? { ...task, ...fields } : task)));
  }, []);

  const openCreateDialog = useCallback((options?: {
    roleCode?: string;
    categoryTitle?: string;
  }) => {
    setDialogEditCategoryId(null);
    setDialogRoleCode(options?.roleCode ?? defaultRoleCode);
    setDialogCategoryId(options?.categoryTitle ?? '');
    setDialogChecklistName(options?.categoryTitle ?? '');
    setDialogTasks([{ title: '', timeLimit: DEFAULT_TIME }]);
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode]);

  const openEditDialog = useCallback(async (categoryId: string, categoryType: ChecklistCategoryType) => {
    if (!onRequestEditCategory) {
      return;
    }

    const data = await onRequestEditCategory(categoryId, categoryType);
    if (!data) {
      setDialogError('Không thể tải dữ liệu nhóm để chỉnh sửa.');
      return;
    }

    setDialogEditCategoryId(data.id);
    setDialogRoleCode(data.roleCode || defaultRoleCode);
    setDialogCategoryId(data.title);
    setDialogChecklistName(data.title);
    setDialogTasks(
      data.tasks.length > 0
        ? data.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            timeLimit: task.timeLimit || DEFAULT_TIME,
          }))
        : [{ title: '', timeLimit: DEFAULT_TIME }],
    );
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode, onRequestEditCategory]);

  const handleDialogSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);

    if (!onSaveCategoryBatch) {
      setDialogError('Không thể lưu checklist do thiếu cấu hình callback.');
      return;
    }

    const categoryTitle = dialogCategoryId.trim();
    if (!categoryTitle) {
      setDialogError('Vui lòng điền tên nhóm công việc.');
      return;
    }

    const validTasks = dialogTasks
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
        roleCode: dialogRoleCode,
        tasks: validTasks,
      });

      setIsAddingItem(false);
      setDialogEditCategoryId(null);
      setDialogCategoryId('');
      setDialogChecklistName('');
      setDialogTasks([{ title: '', timeLimit: DEFAULT_TIME }]);
    } catch (err: any) {
      setDialogError(err?.message || 'Không thể lưu checklist. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsSubmittingDialog(false);
    }
  }, [dialogCategoryId, dialogEditCategoryId, dialogRoleCode, dialogTasks, onSaveCategoryBatch, subTab]);

  return {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogCategoryId,
    setDialogCategoryId,
    dialogChecklistName,
    setDialogChecklistName,
    dialogEditCategoryId,
    dialogTasks,
    setDialogTasks,
    dialogError,
    setDialogError,
    isSubmittingDialog,
    addDialogTaskRow,
    removeDialogTaskRow,
    updateDialogTask,
    openCreateDialog,
    openEditDialog,
    handleDialogSubmit,
  };
}
