import { useMemo, useRef } from 'react';
import { ChecklistCategory, ChecklistItem, ProcessDocument, ChecklistDocument, ChecklistTemplateDocument } from '../../../types/checklist.types';
import type { ChecklistViewCategory, HistoryDateGroup } from '../checklist-view.types';
import type { CategoryMeta } from '../checklist-view.types';
import { getCategoryMeta, getTodayKey, formatDateKeyToVietnamese } from '../checklist-utils';

interface UseFilteredCategoriesProps {
  todayCategories: ChecklistCategory[];
  templates: ChecklistTemplateDocument[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  historySnapshots: ChecklistDocument[];
  subTab: 'today' | 'checklist_template' | 'process' | 'history';
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
  templates,
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

    // 1. Checklist Templates Tab
    if (subTab === 'checklist_template') {
      const templatesForRole = hasRoleFilter
        ? templates.filter((t) => matchesSelectedRole(t.roleCode))
        : templates;

      const filteredCategories = templatesForRole
        .map((template, index) => {
          const meta = getStableMeta(template.title || template.roleCode, index, template.colorKey);

          const flatTasks: ChecklistItem[] = (template.tasks || []).map((task) => ({
            id: task.id,
            storeId: template.storeId,
            categoryId: template.id,
            templateId: template.id,
            title: task.title,
            isCompleted: false,
            timeLimit: task.timeLimit,
            roleCode: template.roleCode,
            dateKey: '',
            checklistName: template.title || template.roleCode,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            imageUrls: [],
          }));

          const filteredTasks = flatTasks.filter((it) =>
            it.title.toLowerCase().includes(searchLower)
          );

          return {
            id: template.id,
            storeId: template.storeId,
            roleCode: template.roleCode,
            title: template.title || template.roleCode,
            iconName: template.iconName || 'ClipboardList',
            colorKey: template.colorKey || 'gray',
            countDone: 0,
            countTotal: flatTasks.length,
            isCompleted: false,
            meta,
            tasks: filteredTasks,
          };
        })
        .filter((cat) => {
          if (hasSearch) {
            return cat.tasks.length > 0;
          }
          return true;
        });

      return {
        filteredCategories,
        filteredProcesses,
        historyDateGroups: [] as HistoryDateGroup[],
      };
    }

    // 2. History items (subTab === 'history')
    if (subTab === 'history') {
      const templateLookup = new Map(todayCategories.map((t) => [t.id, t] as const));
      const todayKey = getTodayKey();

      // Filter snapshots by role if active
      const targetedSnapshots = hasRoleFilter
        ? historySnapshots.filter((s) => matchesSelectedRole(s.roleCode))
        : historySnapshots;

      // Intermediate: collect categories per dateKey
      const dateGroupMap = new Map<string, ChecklistViewCategory[]>();

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

        const existingCats = dateGroupMap.get(dateKey) || [];
        let index = existingCats.length;

        for (const [templateId, templateTasks] of tasksByTemplate.entries()) {
          const template = templateLookup.get(templateId);
          const templateTitle = template?.title || 'Công việc phát sinh';
          // Title without dateKey — date is shown in the group header
          const title = templateTitle;
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

          existingCats.push({
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

        if (existingCats.length > 0) {
          dateGroupMap.set(dateKey, existingCats);
        }
      }

      // Build HistoryDateGroup[] sorted by date descending
      const historyDateGroups: HistoryDateGroup[] = Array.from(dateGroupMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dateKey, categories]) => {
          const totalTasks = categories.reduce((sum, cat) => sum + cat.countTotal, 0);
          const completedTasks = categories.reduce((sum, cat) => sum + cat.countDone, 0);
          return {
            dateKey,
            dayLabel: formatDateKeyToVietnamese(dateKey),
            isToday: dateKey === todayKey,
            categories,
            totalTasks,
            completedTasks,
          };
        });

      // Flatten for backward compat (filteredCategories)
      const allCategories = historyDateGroups.flatMap((g) => g.categories);

      return {
        filteredCategories: allCategories,
        filteredProcesses,
        historyDateGroups,
      };
    }

    if (subTab === 'process') {
      return {
        filteredCategories: [] as ChecklistViewCategory[],
        filteredProcesses,
        historyDateGroups: [] as HistoryDateGroup[],
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
      historyDateGroups: [] as HistoryDateGroup[],
    };
  }, [
    todayCategories,
    templates,
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
