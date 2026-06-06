import React from 'react';
import {
  Calendar,
  ClipboardList,
  Clock,
  Link as LinkIcon,
  User,
  Users,
  CheckCircle2,
  Circle,
  Play,
  Check,
  Building,
} from 'lucide-react';
import type { TaskItem, TaskStatus } from '../../../types/tasks.types';
import type { UserSession } from '../../../stores/app-store';
import { Button } from '@shared/ui';
import { cn } from '@shared/lib/utils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  currentUser?: UserSession | null;
  canUpdate?: boolean;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void | Promise<void>;
  isSaving?: boolean;
}

const statusMeta = {
  not_started: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Chưa làm', icon: Circle, iconColor: 'text-slate-400' },
  in_progress: { bg: 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse', text: 'Đang làm', icon: Play, iconColor: 'text-blue-500 fill-blue-500/20' },
  waiting: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Chờ duyệt', icon: Clock, iconColor: 'text-amber-500' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-150', text: 'Hoàn thành', icon: CheckCircle2, iconColor: 'text-emerald-600' }
};

const priorityMeta = {
  high: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'Cao' },
  medium: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trung bình' },
  low: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Thấp' }
};

const generateTaskCode = (task: TaskItem) => {
  const deptCode = task.department
    ? task.department
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4)
    : 'GEN';

  let dateStr = '2026-06-06';
  const targetDate = task.createdAt || task.deadline || '';
  const dateMatch = targetDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    dateStr = `${dateMatch[3]}-${dateMatch[2]}${dateMatch[1]}`;
  } else {
    const dateMatch2 = targetDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch2) {
      dateStr = `${dateMatch2[1]}-${dateMatch2[2]}${dateMatch2[3]}`;
    }
  }

  const indexStr = task.id ? task.id.slice(-2).toUpperCase() : '01';
  return `CV-${deptCode}-${dateStr}-${indexStr}`;
};

export const TaskDetailModal = React.memo(function TaskDetailModal({
  isOpen,
  onClose,
  task,
  currentUser,
  canUpdate = false,
  onUpdateStatus,
  isSaving = false,
}: TaskDetailModalProps) {
  if (!isOpen || !task) return null;

  const isAssignee = task.assignee === currentUser?.fullName;
  const isHelper = (task.helpers || []).includes(currentUser?.fullName || '');
  const isAuthorizedToUpdate = canUpdate || isAssignee || isHelper;

  const priorityInfo = priorityMeta[task.priority] || priorityMeta.medium;
  const statusInfo = statusMeta[task.status] || statusMeta.not_started;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;
    await onUpdateStatus(task.id, newStatus);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl space-y-4 text-left border border-slate-100 overflow-hidden transition-all duration-300 ease-in-out">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={cn("p-1.5 rounded-lg text-slate-400 bg-slate-50 border border-slate-200/50")}>
              <ClipboardList className="w-5 h-5 text-[#C21A1A] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Chi tiết công việc
              </h3>
              <div className="text-[10px] text-slate-400 font-sans tracking-wider font-semibold">
                {generateTaskCode(task)}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-750 text-lg cursor-pointer h-auto p-0 hover:bg-transparent"
          >
            x
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Title and Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide", priorityInfo.bg)}>
                <span className="w-1 h-1 rounded-full bg-current"></span>
                Uư tiên: {priorityInfo.text}
              </span>
              <span className={cn("inline-flex items-center gap-1 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border tracking-normal", statusInfo.bg)}>
                {statusInfo.icon && (
                  <statusInfo.icon className={cn("w-2.5 h-2.5 shrink-0", statusInfo.iconColor)} />
                )}
                <span>Trạng thái: {statusInfo.text}</span>
              </span>
            </div>
            <h2 className="font-extrabold text-slate-900 text-lg leading-snug tracking-tight break-words">
              {task.title}
            </h2>
          </div>

          <div className="border-t border-slate-100/80 my-1" />

          {/* Key-Value Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
            {/* Assignee */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Người phụ trách
              </span>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                <div className="w-5.5 h-5.5 rounded-full bg-red-50 text-[10px] flex items-center justify-center font-black text-[#C21A1A] border border-[#C21A1A]/20 uppercase">
                  {task.assignee?.charAt(0) || 'U'}
                </div>
                <span className="text-slate-800 font-bold text-xs">{task.assignee || 'Chưa phân công'}</span>
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Bộ phận / Vai trò
              </span>
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-slate-800 font-bold text-xs h-11 flex items-center">
                {task.department}
              </div>
            </div>

            {/* Start Date & Deadline */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Thời gian thực hiện
              </span>
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-slate-800 font-bold text-xs h-11 flex items-center gap-1.5">
                {task.startDate ? (
                  <>
                    <span>{task.startDate}</span>
                    <span className="text-slate-450 font-normal">đến</span>
                    <span>{task.deadline}</span>
                  </>
                ) : (
                  <span>Hạn chót: {task.deadline}</span>
                )}
              </div>
            </div>

            {/* Helpers */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Người phụ giúp (Helpers)
              </span>
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl text-slate-800 font-bold text-xs min-h-11 flex flex-wrap items-center gap-1.5">
                {task.helpers && task.helpers.length > 0 ? (
                  task.helpers.map((helper, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 text-[10px] font-bold shadow-3xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      {helper}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 font-normal italic pl-1.5">Không có người phụ giúp</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes (HTML Content) */}
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
              Hướng dẫn & Ghi chú
            </span>
            <div
              className="p-4 bg-slate-50 border border-slate-150 rounded-xl overflow-y-auto max-h-[300px] leading-relaxed text-slate-800 text-xs font-semibold
                        [&_img]:max-w-full [&_img]:rounded-xl [&_img]:shadow-md [&_img]:mx-auto [&_img]:my-3 [&_img]:block
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                        [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-200 [&_h3]:pb-1 [&_h3]:uppercase
                        [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                        [&_p]:mb-2 [&_p]:leading-relaxed
                        [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3
                        [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
              dangerouslySetInnerHTML={{ __html: task.notes || '<span class="italic text-slate-400 font-medium">Không có ghi chú...</span>' }}
            />
          </div>

          {/* Attachment Link */}
          {task.link && (
            <div className="pt-1">
              <a
                href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-[#C21A1A] border border-rose-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs"
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#C21A1A]" />
                <span>Xem liên kết đính kèm</span>
              </a>
            </div>
          )}

          {/* Interactive Status Update Segment for Authorized Users */}
          {isAuthorizedToUpdate && (
            <div className="pt-2 space-y-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                Cập nhật trạng thái
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-150 p-1.5 rounded-xl select-none">
                {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => {
                  const Icon = statusMeta[st].icon;
                  const isActive = task.status === st;
                  const activeColorClass = st === 'completed'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : st === 'in_progress'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : st === 'waiting'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-600 hover:bg-slate-750 text-white';

                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusChange(st)}
                      className={cn(
                        "py-2 px-2.5 rounded-lg border text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait",
                        isActive
                          ? `${activeColorClass} border-transparent shadow-xs`
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : statusMeta[st].iconColor)} />
                      <span>{statusMeta[st].text}</span>
                      {isActive && <Check className="w-3 h-3 text-white ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer h-auto animate-none"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
});
