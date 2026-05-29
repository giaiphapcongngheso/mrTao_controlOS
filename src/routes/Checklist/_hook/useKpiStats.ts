import { useMemo } from 'react';
import { ChecklistItem } from '../../../types/checklist.types';
import { isItemLate } from '../checklist.utils';

/**
 * Hook to compute overall KPI metrics based on today's checklist items
 */
export function useKpiStats(items: ChecklistItem[]) {
  return useMemo(() => {
    const total = items.length;
    const completed = items.filter(it => it.isCompleted);
    const completedCount = completed.length;

    let onTimeCount = 0;
    let lateCount = 0;

    items.forEach(item => {
      if (item.timeLimit) {
        if (isItemLate(item)) {
          lateCount++;
        } else if (item.isCompleted) {
          onTimeCount++;
        }
      } else if (item.isCompleted) {
        onTimeCount++;
      }
    });

    const onTimePercent = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;
    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      completedCount,
      onTimeCount,
      lateCount,
      onTimePercent,
      latePercent,
      completionPercent
    };
  }, [items]);
}
