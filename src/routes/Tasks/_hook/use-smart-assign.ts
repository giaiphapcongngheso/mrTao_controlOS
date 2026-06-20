import { useMemo } from 'react';
import type { TaskItem } from '../../../types/tasks.types';
import type { StaffMember } from '../../../types/staff.types';

interface SmartAssignSuggestion {
  staff: StaffMember;
  score: number;
  reason: string;
}

/**
 * Calculates workload score and suggests optimal assignees.
 * Factors: active task count (lower = better), same department bonus, completion history.
 */
export function useSmartAssign(
  tasks: TaskItem[],
  staffMembers: StaffMember[],
  targetDepartment?: string,
): SmartAssignSuggestion[] {
  return useMemo(() => {
    if (!staffMembers.length) return [];

    // Count active tasks per staff member
    const activeTasks = tasks.filter((t) => t.status !== 'completed');
    const workloadMap = new Map<string, number>();
    for (const task of activeTasks) {
      const name = task.assignee;
      if (name) {
        workloadMap.set(name, (workloadMap.get(name) || 0) + 1);
      }
    }

    // Count completed tasks per staff (performance indicator)
    const completedMap = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === 'completed' && task.assignee) {
        completedMap.set(task.assignee, (completedMap.get(task.assignee) || 0) + 1);
      }
    }

    // Score each staff member (lower workload + same dept + higher completion = better)
    const scored: SmartAssignSuggestion[] = staffMembers.map((staff) => {
      const activeCount = workloadMap.get(staff.fullName) || 0;
      const completedCount = completedMap.get(staff.fullName) || 0;

      // Base score (inverted workload: fewer tasks = higher score)
      let score = 100 - activeCount * 15;

      // Department match bonus
      const isSameDept = targetDepartment && staff.department === targetDepartment;
      if (isSameDept) score += 20;

      // Completion history bonus (max +15)
      score += Math.min(completedCount * 3, 15);

      // Build reason
      const reasons: string[] = [];
      if (activeCount === 0) reasons.push('Đang rảnh');
      else reasons.push(`${activeCount} việc đang làm`);
      if (isSameDept) reasons.push('Cùng phòng ban');
      if (completedCount > 0) reasons.push(`Đã xong ${completedCount} việc`);

      return {
        staff,
        score: Math.max(0, Math.min(100, score)),
        reason: reasons.join(' • '),
      };
    });

    // Sort by score descending and return top 3
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [tasks, staffMembers, targetDepartment]);
}
