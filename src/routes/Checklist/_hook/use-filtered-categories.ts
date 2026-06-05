import { useMemo, useRef } from 'react';
import { ChecklistCategory, ChecklistItem, ProcessDocument, ChecklistDocument } from '../../../types/checklist.types';
import type { ChecklistViewCategory } from '../components/checklist-view.types';
import type { CategoryMeta } from '../components/checklist-view.types';
import { getCategoryMeta, getTodayKey } from '../checklist-utils';

interface UseFilteredCategoriesProps {
  todayCategories: ChecklistCategory[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  historySnapshots: ChecklistDocument[];
  subTab: 'today' | 'process' | 'history';
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
  historySnapshots = [],
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

    // 2. History items (subTab === 'history')
    if (subTab === 'history') {
      const templateLookup = new Map(todayCategories.map((t) => [t.id, t] as const));
      const categoriesMap = new Map<string, ChecklistViewCategory>();

      // Filter snapshots by role if active
      const targetedSnapshots = hasRoleFilter
        ? historySnapshots.filter((s) => matchesSelectedRole(s.roleCode))
        : historySnapshots;

      // Group tasks by date and templateId
      for (const doc of targetedSnapshots) {
        const dateKey = doc.dateKey;
        const tasks = (doc.tasks || []).filter((task) => !task.deletedAt);

        const tasksByTemplate = new Map<string, typeof tasks>();
        for (const task of tasks) {
          const tId = task.templateId || 'orphan';
          const list = tasksByTemplate.get(tId) || [];
          list.push(task);
          tasksByTemplate.set(tId, list);
        }

        let index = 0;
        for (const [templateId, templateTasks] of tasksByTemplate.entries()) {
          const template = templateLookup.get(templateId);
          const templateTitle = template?.title || 'Công việc phát sinh';
          const title = `${templateTitle} (${dateKey})`;
          const id = `${dateKey}_${templateId}`;
          const colorKey = template?.colorKey || 'gray';
          const iconName = template?.iconName || 'ClipboardList';

          const flatTasks: ChecklistItem[] = templateTasks.map((task) => ({
            id: task.id,
            storeId: doc.storeId,
            categoryId: id,
            templateId: task.templateId,
            title: task.title,
            isCompleted: task.isCompleted,
            timeLimit: task.timeLimit,
            roleCode: doc.roleCode,
            dateKey: task.dateKey || doc.dateKey,
            checklistName: templateTitle,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            checkedAt: task.checkedAt,
            checkedByName: task.checkedByName,
            checkedByUsername: task.checkedByUsername,
            deletedAt: task.deletedAt,
            deletedByName: task.deletedByName,
            deletedByUsername: task.deletedByUsername,
            imageUrls: task.imageUrls || [],
          }));

          const filteredTasks = flatTasks.filter((it) =>
            it.title.toLowerCase().includes(searchLower)
          );

          if (filteredTasks.length === 0 && hasSearch) {
            continue;
          }

          const doneCount = flatTasks.filter((it) => it.isCompleted).length;
          const meta = getStableMeta(title, index++, colorKey);

          categoriesMap.set(id, {
            id,
            storeId: doc.storeId,
            roleCode: doc.roleCode,
            title,
            iconName,
            colorKey,
            countDone: doneCount,
            countTotal: flatTasks.length,
            isCompleted: flatTasks.length > 0 && doneCount === flatTasks.length,
            meta,
            tasks: filteredTasks,
          });
        }
      }

      const sortedCategories = Array.from(categoriesMap.values()).sort((a, b) => {
        const dateA = a.id.split('_')[0];
        const dateB = b.id.split('_')[0];
        return dateB.localeCompare(dateA);
      });

      return {
        filteredCategories: sortedCategories,
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
    historySnapshots,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode,
    selectedWeekDayKey,
  ]);
}
