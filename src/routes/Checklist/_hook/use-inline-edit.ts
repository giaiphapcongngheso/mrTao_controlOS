import { useState } from 'react';
import { ChecklistItem } from '../../../types/checklist.types';

interface UseInlineEditProps {
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
  onDeleteChecklistItem?: (itemId: string, dateKey?: string) => Promise<void>;
}

/**
 * Hook to manage inline editing and deletion of checklist items
 */
export function useInlineEdit({
  onUpdateChecklistItem,
  onDeleteChecklistItem,
}: UseInlineEditProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemTimeLimit, setEditItemTimeLimit] = useState('');

  /**
   * Save individual item edits
   */
  const handleInlineSave = async (itemId: string, dateKey?: string) => {
    if (!editItemTitle.trim()) return;
    try {
      if (onUpdateChecklistItem) {
        await onUpdateChecklistItem(itemId, {
          title: editItemTitle.trim(),
          timeLimit: editItemTimeLimit || undefined,
        }, dateKey);
      }
      setEditingItemId(null);
    } catch (err) {
      console.error('Lỗi khi cập nhật công việc:', err);
    }
  };

  /**
   * Delete an individual checklist item
   */
  const handleDeleteItem = async (itemId: string, dateKey?: string) => {
    try {
      if (onDeleteChecklistItem) {
        await onDeleteChecklistItem(itemId, dateKey);
      }
    } catch (err) {
      console.error('Lỗi khi xóa công việc:', err);
    }
  };

  return {
    editingItemId,
    setEditingItemId,
    editItemTitle,
    setEditItemTitle,
    editItemTimeLimit,
    setEditItemTimeLimit,
    handleInlineSave,
    handleDeleteItem,
  };
}
