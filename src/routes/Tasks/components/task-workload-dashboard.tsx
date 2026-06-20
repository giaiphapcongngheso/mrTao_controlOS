import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { TaskItem } from '../../../types/tasks.types';
import type { StaffMember } from '../../../types/staff.types';
import { cn } from '@shared/lib/utils';
import { isTaskOverdue } from '../_hook/use-task-deadline';

interface TaskWorkloadDashboardProps {
  tasks: TaskItem[];
  staffMembers: StaffMember[];
}

interface StaffWorkload {
  name: string;
  department: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export const TaskWorkloadDashboard = React.memo(function TaskWorkloadDashboard({
  tasks,
  staffMembers,
}: TaskWorkloadDashboardProps) {
  // Calculate per-person metrics
  const workloads = useMemo((): StaffWorkload[] => {
    const map = new Map<string, StaffWorkload>();

    // Initialize from staff list
    for (const staff of staffMembers) {
      map.set(staff.fullName, {
        name: staff.fullName,
        department: staff.department || '',
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0,
      });
    }

    // Aggregate tasks
    for (const task of tasks) {
      const name = task.assignee;
      if (!name) continue;
      let entry = map.get(name);
      if (!entry) {
        entry = { name, department: '', total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0 };
        map.set(name, entry);
      }

      entry.total++;
      if (task.status === 'completed') entry.completed++;
      if (task.status === 'in_progress') entry.inProgress++;
      if (isTaskOverdue(task)) entry.overdue++;
    }

    // Calculate rates
    for (const entry of map.values()) {
      entry.completionRate = entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks, staffMembers]);

  // Global stats
  const globalStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const avgPerPerson = workloads.length > 0 ? (total / workloads.length).toFixed(1) : '0';
    return { total, completed, overdue, avgPerPerson, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks, workloads]);

  const maxTasks = useMemo(() => Math.max(...workloads.map((w) => w.total), 1), [workloads]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase">Tổng công việc</p>
          <p className="text-xl font-black text-slate-800 mt-1">{globalStats.total}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
          </p>
          <p className="text-xl font-black text-emerald-700 mt-1">{globalStats.completionRate}%</p>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Quá hạn
          </p>
          <p className="text-xl font-black text-rose-700 mt-1">{globalStats.overdue}</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> TB/Người
          </p>
          <p className="text-xl font-black text-blue-700 mt-1">{globalStats.avgPerPerson}</p>
        </div>
      </div>

      {/* Workload bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          Khối lượng công việc theo nhân sự
        </h4>

        {workloads.length === 0 ? (
          <p className="text-xs text-slate-300 italic text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {workloads.map((w) => (
              <div key={w.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-bold text-slate-500 border border-slate-200 uppercase shrink-0">
                      {w.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{w.name}</span>
                    {w.department && (
                      <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                        {w.department}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-slate-500">{w.total} việc</span>
                    {w.overdue > 0 && (
                      <span className="text-rose-500 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {w.overdue} trễ
                      </span>
                    )}
                    <span className="text-emerald-600">{w.completionRate}%</span>
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  {w.completed > 0 && (
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(w.completed / maxTasks) * 100}%` }}
                      title={`Hoàn thành: ${w.completed}`}
                    />
                  )}
                  {w.inProgress > 0 && (
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${(w.inProgress / maxTasks) * 100}%` }}
                      title={`Đang làm: ${w.inProgress}`}
                    />
                  )}
                  {w.overdue > 0 && (
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${(w.overdue / maxTasks) * 100}%` }}
                      title={`Quá hạn: ${w.overdue}`}
                    />
                  )}
                  {(w.total - w.completed - w.inProgress - w.overdue) > 0 && (
                    <div
                      className="bg-slate-300 h-full transition-all duration-300"
                      style={{ width: `${((w.total - w.completed - w.inProgress - w.overdue) / maxTasks) * 100}%` }}
                      title={`Chưa làm: ${w.total - w.completed - w.inProgress - w.overdue}`}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
              {[
                { color: 'bg-emerald-500', label: 'Hoàn thành' },
                { color: 'bg-blue-500', label: 'Đang làm' },
                { color: 'bg-rose-500', label: 'Quá hạn' },
                { color: 'bg-slate-300', label: 'Chưa làm' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-[9px] text-slate-400 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
