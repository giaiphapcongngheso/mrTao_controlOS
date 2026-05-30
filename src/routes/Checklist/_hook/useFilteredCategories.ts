import { useMemo, useRef } from 'react';
import { ChecklistCategory, ChecklistItem } from '../../../types/checklist.types';
import type { ChecklistViewCategory } from '../components/checklist-view.types';
import type { CategoryMeta } from '../components/checklist-view.types';
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
 * Hook to filter categories and their checklist items based on the active tab and search criteria.
 * Uses a stable meta cache to avoid creating new CategoryMeta objects on every render,
 * allowing React.memo on child components to work correctly.
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
  // Stable meta cache: avoids creating new CategoryMeta objects when title+index haven't changed
  const metaCacheRef = useRef(new Map<string, CategoryMeta>());

  return useMemo<ChecklistViewCategory[]>(() => {
    const normalizedSelectedRole = selectedRoleCode.trim().toUpperCase();
    const metaCache = metaCacheRef.current;

    // Stable getCategoryMeta - returns same reference for same title+index
    const getStableMeta = (title: string, index: number): CategoryMeta => {
      const key = `${title}__${index}`;
      const cached = metaCache.get(key);
      if (cached) return cached;
      const meta = getCategoryMeta(title, index);
      metaCache.set(key, meta);
      return meta;
    };

    // Pre-compute lowercase search once
    const searchLower = searchTerm.toLowerCase();
    const hasSearch = searchTerm.trim() !== '';

    // 1. Process templates (subTab === 'process')
    if (subTab === 'process') {
      const templates = allChecklistItems.filter(
        (it) => !it.dateKey && it.roleCode?.trim().toUpperCase() === normalizedSelectedRole
      );

      return processCategories
        .map((cat, index) => {
          const meta = getStableMeta(cat.title, index);

          const catTasks = templates.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchLower)
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
        .filter((cat) => (hasSearch ? cat.tasks.length > 0 : true));
    }

    // 2. Completed items (subTab === 'completed')
    if (subTab === 'completed') {
      const targetDateKey = completedViewMode === 'day' ? getTodayKey() : selectedWeekDayKey;
      const completedItems = allChecklistItems.filter(
        (it) => it.isCompleted && it.dateKey === targetDateKey
      );

      return todayCategories
        .map((cat, index) => {
          const meta = getStableMeta(cat.title, index);

          const catTasks = completedItems.filter((it) => it.categoryId === cat.id);
          const filteredTasks = catTasks.filter((it) =>
            it.title.toLowerCase().includes(searchLower)
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
        const meta = getStableMeta(cat.title, index);

        const catTasks = items.filter((it) => it.categoryId === cat.id);
        const filteredTasks = catTasks.filter((it) =>
          it.title.toLowerCase().includes(searchLower)
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
      .filter((cat) => (hasSearch ? cat.tasks.length > 0 : true));
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
