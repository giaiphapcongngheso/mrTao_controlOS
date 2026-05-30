import { useMemo } from 'react';
import { ChecklistCategory, ChecklistItem } from '../../../types/checklist.types';
import type { ChecklistViewCategory } from '../components/checklist-view.types';
import { getCategoryMeta, getTodayKey } from '../checklist.utils';

interface UseFilteredCategoriesProps {
  todayCategories: ChecklistCategory[];
  processCategories: ChecklistCategory[];
  items: ChecklistItem[];
  allChecklistItems: ChecklistItem[];
  subTab: 'today' | 'process' | 'completed';
  searchTerm: string;
  selectedRoleCode: string;
  completedViewMode: 'day' | 'week';
  selectedWeekDayKey: string;
}

/**
 * Hook to filter categories and their checklist items based on the active tab and search criteria
 */
export function useFilteredCategories({
  todayCategories,
  processCategories,
  items,
  allChecklistItems = [],
  subTab,
  searchTerm,
  selectedRoleCode,
  completedViewMode,
  selectedWeekDayKey,
}: UseFilteredCategoriesProps) {
  return useMemo<ChecklistViewCategory[]>(() => {
    const normalizedSelectedRole = selectedRoleCode.trim().toUpperCase();

    // 1. Process templates (subTab === 'process')
    if (subTab === 'process') {
      const templates = allChecklistItems.filter(
        (it) => !it.dateKey && it.roleCode?.trim().toUpperCase() === normalizedSelectedRole
      );

      return processCategories
        .map((cat, index) => {
          const meta = getCategoryMeta(cat.title, index);

          const catTasks = templates.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return {
            ...cat,
            countDone: 0,
            countTotal: catTasks.length,
            isCompleted: false,
            meta,
            iconIndex: index,
            tasks: filteredTasks,
          };
        })
        .filter((cat) => (searchTerm.trim() !== '' ? cat.tasks.length > 0 : true));
    }

    // 2. Completed items (subTab === 'completed')
    if (subTab === 'completed') {
      const targetDateKey = completedViewMode === 'day' ? getTodayKey() : selectedWeekDayKey;
      const completedItems = allChecklistItems.filter(
        (it) => it.isCompleted && it.dateKey === targetDateKey
      );

      return todayCategories
        .map((cat, index) => {
          const meta = getCategoryMeta(cat.title, index);

          const catTasks = completedItems.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return {
            ...cat,
            countDone: catTasks.length,
            countTotal: catTasks.length,
            isCompleted: catTasks.length > 0,
            meta,
            iconIndex: index,
            tasks: filteredTasks,
          };
        })
        .filter((cat) => cat.tasks.length > 0);
    }

    // 3. Today's checklists (subTab === 'today')
    return todayCategories
      .map((cat, index) => {
        const meta = getCategoryMeta(cat.title, index);

        const catTasks = items.filter((it) => it.categoryId === cat.id);
        const filteredTasks = catTasks.filter((it) =>
          it.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const doneCount = catTasks.filter((it) => it.isCompleted).length;

        return {
          ...cat,
          countDone: doneCount,
          countTotal: catTasks.length,
          isCompleted: catTasks.length > 0 && doneCount === catTasks.length,
          meta,
          iconIndex: index,
          tasks: filteredTasks,
        };
      })
      .filter((cat) => (searchTerm.trim() !== '' ? cat.tasks.length > 0 : true));
  }, [
    todayCategories,
    processCategories,
    items,
    allChecklistItems,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode,
    selectedWeekDayKey,
  ]);
}
