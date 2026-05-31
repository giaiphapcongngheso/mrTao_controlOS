import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Check,
  Zap,
  Send,
} from 'lucide-react';
import { TaskItem, TaskRequestType, TaskStatus } from '../../types/tasks.types';
import { Button, Tabs, TabsList, TabsTrigger, SearchInput } from '@shared/ui';
import { cn } from '@shared/lib/utils';
import { ModuleHeader } from '@shared/components';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { TaskCreateModal } from './components/task-create-modal';
import { TaskQuickDelegateModal } from './components/task-quick-delegate-modal';

interface TasksViewProps {
  tasks: TaskItem[];
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
  onAddTask: (task: TaskRequestType) => void | Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void | Promise<void>;
}


export default function TasksView({
  tasks,
  isLoading = false,
  isSaving = false,
  errorMessage,
  onRefresh,
  onAddTask,
  onUpdateTaskStatus
}: TasksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'late' | 'completed'>('all');

  // Modals controller
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickDelegateOpen, setQuickDelegateOpen] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Active Menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Auto disappear toast notifications
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);


  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);


  const handleCreateTask = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
    setIsAddingTask(false);
    showToast("🎉 Đã lưu và giao việc mới thành công!");
    } catch {
      showToast("Không thể lưu công việc. Vui lòng thử lại.");
    }
  }, [onAddTask, showToast]);

  const handleQuickDelegate = useCallback(async (taskPayload: TaskRequestType) => {
    try {
      await onAddTask(taskPayload);
    setQuickDelegateOpen(false);
    showToast(`✈️ Đã kích hoạt Giao nhanh cho nhân viên ${taskPayload.assignee}!`);
    } catch {
      showToast("Không thể giao nhanh công việc. Vui lòng thử lại.");
    }
  }, [onAddTask, showToast]);


  // Filter computation
  const filteredTasks = tasks.filter(task => {
    const titleMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = task.department.toLowerCase().includes(searchTerm.toLowerCase());
    const assigneeMatch = task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const notesMatch = task.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;

    if (!titleMatch && !deptMatch && !assigneeMatch && !notesMatch) return false;

    if (activeFilter === 'completed') {
      return task.status === 'completed';
    }
    if (activeFilter === 'late') {
      return task.status !== 'completed' && (task.deadline.toLowerCase().includes('trễ') || task.deadline.includes('08/05') || task.deadline.includes('Overdue'));
    }
    if (activeFilter === 'mine') {
      return task.assignee === 'Nguyễn Trường Giang' || task.assignee === 'Quản lý cửa hàng';
    }

    return true;
  });

  const getDeptCircle = (dept: string) => {
    switch (dept?.toLowerCase()) {
      case 'kho':
      case 'kho hàng':
        return { short: 'KHO', bg: 'bg-[#005FF9] text-white' };
      case 'marketing':
      case 'mkt':
        return { short: 'MKT', bg: 'bg-[#7F00FF] text-white' };
      case 'kỹ thuật':
      case 'kt':
        return { short: 'KT', bg: 'bg-[#00B050] text-white' };
      case 'vận hành':
      case 'vh':
        return { short: 'VH', bg: 'bg-[#FF8000] text-white' };
      default:
        return { short: dept?.substring(0, 3).toUpperCase() || 'SYS', bg: 'bg-slate-600 text-white' };
    }
  };

  const priorityMeta = {
    high: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'Cao' },
    medium: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trung bình' },
    low: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Thấp' }
  };

  const statusMeta = {
    not_started: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Chưa làm' },
    in_progress: { bg: 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse', text: 'Đang làm' },
    waiting: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Chờ duyệt' },
    completed: { bg: 'bg-slate-900 text-white border-slate-950', text: 'Hoàn thành' }
  };

  const stats = useMemo(() => {
    const notStarted = tasks.filter((t) => t.status === 'not_started').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const waiting = tasks.filter((t) => t.status === 'waiting').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        (t.deadline.toLowerCase().includes('trễ') ||
          t.deadline.includes('08/05') ||
          t.deadline.includes('overdue')),
    ).length;

    return [
      {
        label: 'CHƯA KHỞI ĐỘNG',
        count: notStarted,
        wrapperClass: 'bg-white border-slate-200 shadow-2xs',
        labelColor: 'text-slate-400',
        countColor: 'text-slate-950',
        dotClass: 'bg-slate-400',
      },
      {
        label: 'ĐANG THỰC HIỆN',
        count: inProgress,
        wrapperClass: 'bg-blue-50/50 border-blue-100 shadow-2xs',
        labelColor: 'text-blue-600',
        countColor: 'text-blue-700',
        dotClass: 'bg-blue-500 animate-pulse',
      },
      {
        label: 'CHỜ DUYỆT CA',
        count: waiting,
        wrapperClass: 'bg-amber-50/50 border-amber-100 shadow-2xs',
        labelColor: 'text-amber-600',
        countColor: 'text-amber-700',
        dotClass: 'bg-[#FFB800]',
      },
      {
        label: 'HOÀN THÀNH',
        count: completed,
        wrapperClass: 'bg-emerald-50/40 border-emerald-150 shadow-2xs',
        labelColor: 'text-emerald-600',
        countColor: 'text-[#00B050]',
        dotClass: 'bg-[#00B050]',
      },
      {
        label: 'QUÁ HẠN CHỐT CA',
        count: overdue,
        wrapperClass: 'bg-rose-50 text-rose-800 border-rose-100 shadow-2xs col-span-2 md:col-span-1',
        labelColor: 'text-rose-600',
        countColor: 'text-rose-700',
        dotClass: 'bg-rose-600',
      },
    ];
  }, [tasks]);



  const actionOptions = useMemo(() => [
    {
      value: 'create',
      label: (
        <div className="flex items-center gap-2.5 text-xs text-slate-800 font-bold w-full">
          <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>Tạo việc mới</span>
        </div>
      )
    },
    {
      value: 'quick',
      label: (
        <div className="flex items-center gap-2.5 text-xs text-slate-800 font-bold w-full">
          <Send className="w-4 h-4 text-[#C21A1A]" />
          <span>Giao nhanh</span>
        </div>
      )
    },
  ], []);

  const selectPlaceholder = useMemo(() => (
    <div className="flex items-center gap-2 text-white font-extrabold text-[11px] uppercase tracking-wider">
      <Zap className="w-4 h-4 fill-white text-white animate-none" />
      <span>Thao tác nhanh</span>
    </div>
  ), []);

  const handleActionChange = useCallback((val: string | number) => {
    if (val === 'create') {
      setIsAddingTask(true);
    } else if (val === 'quick') {
      setQuickDelegateOpen(true);
    }
  }, []);

  return (
    <div className="space-y-3.5 text-left">

      {/* 1. NOTIFICATION TOAST SUCCESS STATUS */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xl text-xs font-bold font-sans max-w-sm transition-all animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <ModuleHeader
        badgeText="🛫 PHÂN HỆ GIAO VIỆC & CHI CA"
        title="Điều phối công việc Chi nhánh"
        description="Quản trị tiến độ, ủy nhiệm siêu tốc và kiểm soát chỉ tiêu nhân sự trong ca trực showroom thời gian thực."
      >
        <div className="w-48">
          <CustomSelect
            options={actionOptions}
            value=""
            onChangeValue={handleActionChange}
            placeholder={selectPlaceholder}
            clearable={false}
            className="!bg-[#C21A1A] hover:!bg-[#A81515] !text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl border-none shadow-sm flex items-center justify-between px-4 py-2.5 h-10 w-full"
            containerClassName="w-full"
            iconClassName="!text-white opacity-100 right-4"
          />
        </div>
      </ModuleHeader>

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              onClick={onRefresh}
              className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100"
            >
              Thử lại
            </Button>
          )}
        </div>
      )}

      {/* 3. CORE ANALYTICAL PILLS STRIP (NATIVE OVERVIEW STATS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={cn('p-4 rounded-xl border', stat.wrapperClass)}>
            <p className={cn('text-[10px] font-black uppercase tracking-wider', stat.labelColor)}>{stat.label}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn('text-xl font-black font-mono', stat.countColor)}>{stat.count}</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', stat.dotClass)}></span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. FILTER CONTROLS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

        {/* Switch Filter Tab Segment */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-fit">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none h-auto">
            <TabsTrigger
              value="all"
              className="px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Tất cả ({tasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="mine"
              className="px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Của tôi ({tasks.filter(t => t.assignee === 'Nguyễn Trường Giang' || t.assignee === 'Quản lý cửa hàng').length})
            </TabsTrigger>
            <TabsTrigger
              value="late"
              className="px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-rose-100/60 data-[state=active]:border data-[state=active]:border-rose-100 data-[state=active]:text-rose-700 text-slate-500 hover:text-rose-700 bg-transparent"
            >
              Trễ hạn ({tasks.filter(t => t.status !== 'completed' && (t.deadline.toLowerCase().includes('trễ') || t.deadline.includes('08/05'))).length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="px-4 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap border-b-0 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-2xs text-slate-500 hover:text-slate-800 bg-transparent"
            >
              Đã hoàn thành ({tasks.filter(t => t.status === 'completed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Dynamic Live Text Input */}
        <div className="md:w-80 w-full">
          <SearchInput
            placeholder="Tìm kiếm theo công việc, phòng ban..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
          />
        </div>

      </div>

      {/* 5. PRISTINE CARD STREAM OF TASKS / RECOVERED FROM CUSTOMTABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading && filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 font-semibold">
              Đang tải danh sách công việc...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 font-semibold">
              Không tìm thấy nhiệm vụ nào. Vui lòng rà soát lại ký tự tìm kiếm hoặc bộ chuyển đổi trạng thái ở trên.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const deptMeta = getDeptCircle(task.department);
              const priorityInfo = priorityMeta[task.priority] || priorityMeta.medium;
              const statusInfo = statusMeta[task.status] || statusMeta.not_started;
              const isLate = task.status !== 'completed' && (task.deadline.toLowerCase().includes('trễ') || task.deadline.includes('08/05') || task.deadline.includes('Overdue'));

              return (
                <div
                  key={task.id}
                  className={cn(
                    "bg-white rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all relative",
                    task.status === 'in_progress'
                      ? 'border-rose-200 bg-rose-50/5 shadow-xs'
                      : 'border-slate-100 shadow-xs hover:border-slate-200'
                  )}
                >
                  {/* Card Header: Dept & Priority and More Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 text-[10px] font-black rounded tracking-wide shadow-2xs inline-block", deptMeta.bg)}>
                        {deptMeta.short}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border", priorityInfo.bg)}>
                        <span className="w-1.2 h-1.2 rounded-full bg-current"></span>
                        {priorityInfo.text}
                      </span>
                    </div>

                    {/* 3-dots Menu for quick status change */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                        className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer w-7 h-7 flex items-center justify-center"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === task.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-slate-900 text-white rounded-xl shadow-xl z-50 py-1 text-[11px] font-bold border border-slate-800 animate-in fade-in duration-100">
                          <p className="px-3 py-1 text-slate-400 text-[8.5px] uppercase font-black tracking-wider border-b border-slate-800 mb-1 text-left">Cập nhật nhanh</p>
                          {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={async () => {
                                try {
                                  await onUpdateTaskStatus(task.id, st);
                                setActiveMenuId(null);
                                showToast(`🔄 Cập nhật trạng thái sang: "${statusMeta[st].text}"`);
                                } catch {
                                  showToast("Không thể cập nhật trạng thái. Vui lòng thử lại.");
                                }
                              }}
                              disabled={isSaving}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between font-bold text-slate-200 transition-colors rounded-none h-auto disabled:cursor-wait disabled:opacity-60"
                            >
                              <span>{statusMeta[st].text}</span>
                              {task.status === st && <Check className="w-3.5 h-3.5 text-[#C21A1A] stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Title & Notes */}
                  <div className="space-y-1 text-left flex-1">
                    <h4 className="font-extrabold text-slate-900 text-xs tracking-tight leading-snug">
                      {task.title}
                    </h4>
                    {task.notes ? (
                      <p className="text-[10px] text-slate-450 font-medium leading-relaxed whitespace-pre-line">
                        {task.notes}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic font-medium leading-relaxed">
                        Không có ghi chú...
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Deadline & Status + Assignee */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-auto">
                    {/* Deadline */}
                    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                      isLate ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'
                    )}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.deadline}</span>
                    </span>

                    {/* Status & Assignee */}
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border inline-block", statusInfo.bg)}>
                        {statusInfo.text}
                      </span>

                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 pl-1.5 pr-2 py-0.5 rounded-lg shrink-0 max-w-[135px]">
                        <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0 text-[10px] flex items-center justify-center font-bold text-slate-600">
                          {task.assignee?.charAt(0) || 'U'}
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-500 truncate">{task.assignee}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ======================= INTERACTIVE MODAL FORMS ========================= */}
      {/* ========================================================================= */}

      {/* Manual Add Task Form Modal */}
      <TaskCreateModal
        isOpen={isAddingTask}
        onClose={() => setIsAddingTask(false)}
        onSubmit={handleCreateTask}
      />

      {/* Quick Delegate Modal */}
      <TaskQuickDelegateModal
        isOpen={quickDelegateOpen}
        onClose={() => setQuickDelegateOpen(false)}
        onSubmit={handleQuickDelegate}
      />


    </div>
  );
}
