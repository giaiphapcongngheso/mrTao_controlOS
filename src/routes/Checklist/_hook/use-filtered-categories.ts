import { useMemo, useRef } from 'react';
import { ChecklistCategory, ChecklistItem, ProcessDocument } from '../../../types/checklist.types';
import type { ChecklistViewCategory } from '../components/checklist-view.types';
import type { CategoryMeta } from '../components/checklist-view.types';
import { getCategoryMeta, getTodayKey } from '../checklist-utils';

interface UseFilteredCategoriesProps {
  todayCategories: ChecklistCategory[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  allChecklistItems: ChecklistItem[];
  subTab: 'today' | 'process' | 'completed';
  searchTerm: string;
  selectedRoleCode: string;
  completedViewMode: 'day' | 'week';
  selectedWeekDayKey: string;
}

function matchesProcessSearch(process: ProcessDocument, searchLower: string): boolean {
  if (!searchLower) {
    return true;
  }

  const matchesStep = (step: ProcessDocument['steps'][number]): boolean => {
    if (step.title.toLowerCase().includes(searchLower)) {
      return true;
    }
    if ((step.tasks || []).some((task) => task.toLowerCase().includes(searchLower))) {
      return true;
    }
    return (step.steps || []).some((subStep) => {
      if (subStep.title.toLowerCase().includes(searchLower)) {
        return true;
      }
      return (subStep.tasks || []).some((task) => task.toLowerCase().includes(searchLower));
    });
  };

  return (
    process.title.toLowerCase().includes(searchLower) ||
    process.description?.toLowerCase().includes(searchLower) === true ||
    (process.steps || []).some(matchesStep)
  );
}

/**
 * Hook to filter categories and their checklist items based on the active tab and search criteria.
 * Uses a stable meta cache to avoid creating new CategoryMeta objects on every render,
 * allowing React.memo on child components to work correctly.
 */
export function useFilteredCategories({
  todayCategories,
  processes,
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

  return useMemo(() => {
    const normalizedSelectedRole = selectedRoleCode.trim().toUpperCase();
    const hasRoleFilter = normalizedSelectedRole.length > 0;
    const metaCache = metaCacheRef.current;
    const matchesSelectedRole = (roleCode?: string) =>
      !hasRoleFilter || roleCode?.trim().toUpperCase() === normalizedSelectedRole;

    // Stable getCategoryMeta - returns same reference for same title+index
    const getStableMeta = (title: string, index: number, colorKey?: string): CategoryMeta => {
      const key = `${title}__${index}__${colorKey || ''}`;
      const cached = metaCache.get(key);
      if (cached) return cached;
      const meta = getCategoryMeta(title, index, colorKey);
      metaCache.set(key, meta);
      return meta;
    };

    // Pre-compute lowercase search once
    const searchLower = searchTerm.toLowerCase();
    const hasSearch = searchTerm.trim() !== '';

    const filteredProcesses = processes.filter(
      (process) => matchesSelectedRole(process.roleCode) && matchesProcessSearch(process, searchLower),
    );

    // 2. Completed items (subTab === 'completed')
    if (subTab === 'completed') {
      const targetDateKey = completedViewMode === 'day' ? getTodayKey() : selectedWeekDayKey;
      const completedItems = allChecklistItems.filter(
        (it) => it.isCompleted && it.dateKey === targetDateKey && matchesSelectedRole(it.roleCode)
      );

      const filteredCategories = todayCategories
        .map((cat, index) => {
          const meta = getStableMeta(cat.title, index, cat.colorKey);

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
            tasks: filteredTasks,
          };
        })
        .filter((cat) => cat.tasks.length > 0);

      return {
        filteredCategories,
        filteredProcesses,
      };
    }

    if (subTab === 'process') {
      return {
        filteredCategories: [] as ChecklistViewCategory[],
        filteredProcesses,
      };
    }

    // 3. Today's checklists (subTab === 'today')
    const todayItemsForRole = hasRoleFilter
      ? items.filter((it) => matchesSelectedRole(it.roleCode))
      : items;

    const filteredCategories = todayCategories
      .map((cat, index) => {
        const meta = getStableMeta(cat.title, index, cat.colorKey);

        const catTasks = todayItemsForRole.filter((it) => it.categoryId === cat.id);
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
          tasks: filteredTasks,
        };
      })
      .filter((cat) => {
        if (hasSearch) {
          return cat.tasks.length > 0;
        }
        return hasRoleFilter ? cat.countTotal > 0 : true;
      });

    return {
      filteredCategories,
      filteredProcesses,
    };
  }, [
    todayCategories,
    processes,
    items,
    allChecklistItems,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode,
    selectedWeekDayKey,
  ]);
}
