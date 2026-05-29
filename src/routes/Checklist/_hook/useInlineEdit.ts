import { useState } from 'react';
import { ChecklistItem } from '../../../types/checklist.types';

interface UseInlineEditProps {
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  onDeleteChecklistItem?: (itemId: string) => Promise<void>;
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
  const handleInlineSave = async (itemId: string) => {
    if (!editItemTitle.trim()) return;
    try {
      if (onUpdateChecklistItem) {
        await onUpdateChecklistItem(itemId, {
          title: editItemTitle.trim(),
          timeLimit: editItemTimeLimit || undefined,
        });
      }
      setEditingItemId(null);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  /**
   * Delete an individual checklist item with confirmation
   */
  const handleDeleteItem = async (itemId: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc "${title}"?`)) {
      try {
        if (onDeleteChecklistItem) {
          await onDeleteChecklistItem(itemId);
        }
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
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
