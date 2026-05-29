import React, { useState, useEffect, useCallback } from 'react';
import { ChecklistCategory } from '../../../types/checklist.types';

interface UseChecklistDialogProps {
  defaultRoleCode: string;
  activeCategories: ChecklistCategory[];
  subTab: 'today' | 'process' | 'completed';
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onCreateRoleChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
}

/**
 * Hook to manage the batch creation dialog state and API submission.
 * All returned functions are wrapped with useCallback for stable references.
 */
export function useChecklistDialog({
  defaultRoleCode,
  activeCategories,
  subTab,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onCreateRoleChecklistBatch,
}: UseChecklistDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dialogRoleCode, setDialogRoleCode] = useState(defaultRoleCode);
  const [dialogCategoryId, setDialogCategoryId] = useState('');
  const [dialogChecklistName, setDialogChecklistName] = useState('');
  const [dialogTasks, setDialogTasks] = useState<Array<{ title: string; timeLimit: string }>>([
    { title: '', timeLimit: '08:00' }
  ]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);

  // Sync role code with prop updates
  useEffect(() => {
    setDialogRoleCode(defaultRoleCode);
  }, [defaultRoleCode]);

  // Set default category when categories list loads or tab changes (merged Effect 2+3)
  useEffect(() => {
    if (activeCategories.length > 0) {
      setDialogCategoryId(activeCategories[0].id);
    }
  }, [subTab, activeCategories]);

  const addDialogTaskRow = useCallback(() => {
    setDialogTasks(prev => [...prev, { title: '', timeLimit: '08:00' }]);
  }, []);

  const removeDialogTaskRow = useCallback((index: number) => {
    setDialogTasks(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateDialogTask = useCallback((index: number, fields: Partial<{ title: string; timeLimit: string }>) => {
    setDialogTasks(prev =>
      prev.map((task, i) => (i === index ? { ...task, ...fields } : task))
    );
  }, []);

  const openCreateDialog = useCallback((options?: {
    roleCode?: string;
    categoryId?: string;
    checklistName?: string;
  }) => {
    setDialogRoleCode(options?.roleCode ?? defaultRoleCode);
    setDialogCategoryId(options?.categoryId ?? activeCategories[0]?.id ?? '');
    setDialogChecklistName(options?.checklistName ?? '');
    setDialogTasks([{ title: '', timeLimit: '08:00' }]);
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode, activeCategories]);

  const handleDialogSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    setIsSubmittingDialog(true);

    const checklistName = dialogChecklistName.trim();
    if (!checklistName) {
      setDialogError('Vui lòng điền tên checklist / quy trình.');
      setIsSubmittingDialog(false);
      return;
    }

    const validTasks = dialogTasks.filter((t) => t.title.trim() !== '');
    if (validTasks.length === 0) {
      setDialogError('Vui lòng thêm ít nhất 1 nội dung công việc.');
      setIsSubmittingDialog(false);
      return;
    }

    try {
      if (subTab === 'today' && onCreateTodayChecklistBatch) {
        await onCreateTodayChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
      } else if (onCreateRoleChecklistBatch) {
        await onCreateRoleChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
      } else {
        // Fallback sequentially
        for (const t of validTasks) {
          await onCreateRoleChecklist(dialogRoleCode, dialogCategoryId, checklistName, t.title);
        }
      }
      setIsAddingItem(false);
      setDialogChecklistName('');
      setDialogTasks([{ title: '', timeLimit: '08:00' }]);
    } catch (err: any) {
      setDialogError(err?.message || 'Không thể lưu checklist mới. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsSubmittingDialog(false);
    }
  }, [dialogChecklistName, dialogTasks, dialogRoleCode, dialogCategoryId, subTab, onCreateTodayChecklistBatch, onCreateRoleChecklistBatch, onCreateRoleChecklist]);

  return {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogCategoryId,
    setDialogCategoryId,
    dialogChecklistName,
    setDialogChecklistName,
    dialogTasks,
    setDialogTasks,
    dialogError,
    setDialogError,
    isSubmittingDialog,
    addDialogTaskRow,
    removeDialogTaskRow,
    updateDialogTask,
    openCreateDialog,
    handleDialogSubmit,
  };
}
