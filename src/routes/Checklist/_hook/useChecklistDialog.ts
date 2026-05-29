import React, { useState, useEffect, useCallback } from 'react';
import { ChecklistCategory, ChecklistItem } from '../../../types/checklist.types';

interface UseChecklistDialogProps {
  defaultRoleCode: string;
  activeCategories: ChecklistCategory[];
  subTab: 'today' | 'process' | 'completed';
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onCreateRoleChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onUpdateCategory?: (id: string, title: string, categoryType: 'today' | 'process') => Promise<void>;
  onDeleteChecklistItem?: (itemId: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
}

export function useChecklistDialog({
  defaultRoleCode,
  activeCategories,
  subTab,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onCreateRoleChecklistBatch,
  onUpdateCategory,
  onDeleteChecklistItem,
  onUpdateChecklistItem,
}: UseChecklistDialogProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dialogRoleCode, setDialogRoleCode] = useState(defaultRoleCode);
  const [dialogCategoryId, setDialogCategoryId] = useState('');
  const [dialogChecklistName, setDialogChecklistName] = useState('');
  const [dialogEditCategoryId, setDialogEditCategoryId] = useState<string | null>(null);
  const [dialogTasks, setDialogTasks] = useState<Array<{ id?: string; title: string; timeLimit: string }>>([
    { title: '', timeLimit: '08:00' }
  ]);
  const [originalTasks, setOriginalTasks] = useState<Array<{ id?: string; title: string; timeLimit: string }>>([]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);

  // Sync role code with prop updates
  useEffect(() => {
    setDialogRoleCode(defaultRoleCode);
  }, [defaultRoleCode]);

  // Set default category when categories list loads or tab changes
  useEffect(() => {
    if (activeCategories.length > 0 && !dialogEditCategoryId) {
      setDialogCategoryId(activeCategories[0].id);
    }
  }, [subTab, activeCategories, dialogEditCategoryId]);

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
    setDialogEditCategoryId(null);
    setDialogRoleCode(options?.roleCode ?? defaultRoleCode);
    setDialogCategoryId(options?.categoryId ?? '');
    setDialogChecklistName(options?.checklistName ?? '');
    setDialogTasks([{ title: '', timeLimit: '08:00' }]);
    setOriginalTasks([]);
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode]);

  const openEditDialog = useCallback((cat: {
    id: string;
    title: string;
    tasks: Array<{ id: string; title: string; timeLimit?: string; roleCode?: string }>;
  }) => {
    setDialogEditCategoryId(cat.id);
    // Find the roleCode from first task or use default
    const firstTaskRole = cat.tasks[0]?.roleCode;
    setDialogRoleCode(firstTaskRole ?? defaultRoleCode);
    setDialogCategoryId(cat.title);
    setDialogChecklistName(cat.title);
    
    const tasksData: Array<{ id?: string; title: string; timeLimit: string }> = cat.tasks.map(t => ({
      id: t.id,
      title: t.title,
      timeLimit: t.timeLimit || '08:00'
    }));
    
    // If no tasks, put a blank row
    if (tasksData.length === 0) {
      tasksData.push({ title: '', timeLimit: '08:00' });
    }
    
    setDialogTasks(tasksData);
    setOriginalTasks(JSON.parse(JSON.stringify(tasksData)));
    setDialogError(null);
    setIsAddingItem(true);
  }, [defaultRoleCode]);

  const handleDialogSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    setIsSubmittingDialog(true);

    const checklistName = dialogCategoryId.trim();
    if (!checklistName) {
      setDialogError('Vui lòng điền tên nhóm công việc.');
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
      const activeCategoryType: 'today' | 'process' = subTab === 'process' ? 'process' : 'today';

      // ─── EDIT MODE ───
      if (dialogEditCategoryId) {
        // 1. Update Category name if changed
        const originalCat = activeCategories.find(c => c.id === dialogEditCategoryId);
        if (originalCat && originalCat.title !== checklistName && onUpdateCategory) {
          await onUpdateCategory(dialogEditCategoryId, checklistName, activeCategoryType);
        }

        // 2. Identify deleted, updated, and new tasks
        const originalTaskIds = originalTasks.map(t => t.id).filter(Boolean) as string[];
        const currentTaskIds = validTasks.map(t => t.id).filter(Boolean) as string[];
        
        // 2.1 Delete removed tasks
        const deletedTaskIds = originalTaskIds.filter(id => !currentTaskIds.includes(id));
        if (onDeleteChecklistItem) {
          for (const id of deletedTaskIds) {
            await onDeleteChecklistItem(id);
          }
        }

        // 2.2 Update changed tasks and Create new ones
        for (const task of validTasks) {
          if (task.id) {
            // Existing task
            const orig = originalTasks.find(o => o.id === task.id);
            if (orig && (orig.title !== task.title || orig.timeLimit !== task.timeLimit)) {
              if (onUpdateChecklistItem) {
                await onUpdateChecklistItem(task.id, {
                  title: task.title,
                  timeLimit: subTab === 'today' ? task.timeLimit : undefined
                });
              }
            }
          } else {
            // New task inside edited category
            if (subTab === 'today' && onCreateTodayChecklistBatch) {
              await onCreateTodayChecklistBatch(dialogRoleCode, dialogEditCategoryId, checklistName, [{
                title: task.title,
                timeLimit: task.timeLimit
              }]);
            } else if (onCreateRoleChecklistBatch) {
              await onCreateRoleChecklistBatch(dialogRoleCode, dialogEditCategoryId, checklistName, [{
                title: task.title,
                timeLimit: task.timeLimit
              }]);
            } else {
              await onCreateRoleChecklist(dialogRoleCode, dialogEditCategoryId, checklistName, task.title);
            }
          }
        }
      } 
      // ─── CREATE MODE ───
      else {
        if (subTab === 'today' && onCreateTodayChecklistBatch) {
          await onCreateTodayChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
        } else if (onCreateRoleChecklistBatch) {
          await onCreateRoleChecklistBatch(dialogRoleCode, dialogCategoryId, checklistName, validTasks);
        } else {
          for (const t of validTasks) {
            await onCreateRoleChecklist(dialogRoleCode, dialogCategoryId, checklistName, t.title);
          }
        }
      }

      setIsAddingItem(false);
      setDialogEditCategoryId(null);
      setDialogCategoryId('');
      setDialogChecklistName('');
      setDialogTasks([{ title: '', timeLimit: '08:00' }]);
      setOriginalTasks([]);
    } catch (err: any) {
      setDialogError(err?.message || 'Không thể lưu checklist. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsSubmittingDialog(false);
    }
  }, [
    dialogCategoryId,
    dialogTasks,
    dialogRoleCode,
    subTab,
    dialogEditCategoryId,
    activeCategories,
    originalTasks,
    onCreateTodayChecklistBatch,
    onCreateRoleChecklistBatch,
    onCreateRoleChecklist,
    onUpdateCategory,
    onDeleteChecklistItem,
    onUpdateChecklistItem
  ]);

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
