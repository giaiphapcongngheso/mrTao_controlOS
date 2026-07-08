import React, { useCallback, useRef, useState } from 'react';
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
  ListChecks,
  Edit,
  Copy,
  Bell,
  QrCode,
  Plus,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Send,
  Paperclip,
  MessageSquare,
  History,
} from 'lucide-react';
import type { TaskItem, TaskStatus, SubTask, TaskComment, ActivityEntry, TaskAttachment } from '../../../types/tasks.types';
import type { UserSession } from '../../../stores/app-store';
import { Button, Checkbox, Sheet, SheetContent, SheetTitle } from '@shared/ui';
import { cn } from '@shared/lib/utils';
import { CustomMultiSelect } from '../../../../share/components/custom/custom-multi-select';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import { getRoleFriendlyName } from '../../../constants';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import { sanitizeHtml } from '../../../shared/lib/sanitize-html';
import { generateTaskCode } from '../constants/task-meta';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  currentUser?: UserSession | null;
  canUpdate?: boolean;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void | Promise<void>;
  onUpdateSubtasks?: (taskId: string, subtasks: SubTask[]) => void | Promise<void>;
  isSaving?: boolean;
  staffMembers?: StaffMember[];
  roles?: StaffRole[];
  onUpdateHelpers?: (taskId: string, helpers: string[]) => void | Promise<void>;
  onUpdateTaskFields?: (taskId: string, fields: Partial<TaskItem>) => void | Promise<void>;
}

const statusMeta = {
  not_started: {
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    activeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    text: 'Chưa làm',
    icon: Circle,
    iconColor: 'text-slate-400'
  },
  in_progress: {
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    activeBg: 'bg-blue-50 text-blue-700 border-blue-250',
    text: 'Đang làm',
    icon: Play,
    iconColor: 'text-blue-500 fill-blue-500/20'
  },
  waiting: {
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    activeBg: 'bg-amber-50 text-amber-750 border-amber-300',
    text: 'Chờ duyệt',
    icon: Clock,
    iconColor: 'text-amber-500'
  },
  completed: {
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    activeBg: 'bg-emerald-50 text-emerald-750 border-emerald-300',
    text: 'Hoàn thành',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600'
  }
};

const priorityMeta = {
  high: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'Cao' },
  medium: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trung bình' },
  low: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Thấp' }
};

const activityActionLabels: Record<string, string> = {
  created: 'tạo công việc',
  status_changed: 'chuyển trạng thái sang',
  assigned: 'phân công cho',
  comment_added: 'thêm bình luận',
  subtask_completed: 'hoàn thành bước',
  attachment_added: 'đính kèm tệp'
};



const formatSubtaskTime = (isoString?: string) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '—';
  }
};

const getDomain = (url: string) => {
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return url;
  }
};

export const TaskDetailModal = React.memo(function TaskDetailModal({
  isOpen,
  onClose,
  task,
  currentUser,
  canUpdate = false,
  onUpdateStatus,
  onUpdateSubtasks,
  isSaving = false,
  staffMembers = [],
  roles = [],
  onUpdateHelpers,
  onUpdateTaskFields,
}: TaskDetailModalProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentInput, setCommentInput] = useState('');

  const staffOptions = React.useMemo(() => {
    return (staffMembers || []).map((staff) => {
      const foundRole = (roles || []).find(
        (r) => r.code.toUpperCase().trim() === (staff.role || '').toUpperCase().trim()
      );
      const roleName = foundRole ? foundRole.name : getRoleFriendlyName(staff.role);
      return {
        value: staff.fullName,
        label: `${staff.fullName} (${staff.position || roleName})`,
      };
    });
  }, [staffMembers, roles]);

  // Subtask toggle handler
  const handleSubtaskToggle = useCallback((subtaskId: string) => {
    if (!task || !task.subtasks || !onUpdateSubtasks) return;
    const updated = task.subtasks.map((s) =>
      s.id === subtaskId
        ? {
          ...s,
          completed: !s.completed,
          completedBy: !s.completed ? (currentUser?.fullName || 'Hệ thống') : undefined,
          completedAt: !s.completed ? new Date().toISOString() : undefined
        }
        : s
    );
    void onUpdateSubtasks(task.id, updated);
  }, [task, onUpdateSubtasks, currentUser]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || newStatus === task.status) return;
    await onUpdateStatus(task.id, newStatus);
  };

  const handleAddComment = useCallback(async () => {
    if (!task || !currentUser || !onUpdateTaskFields || !commentInput.trim()) return;

    const timestampStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      author: currentUser.fullName,
      content: commentInput.trim(),
      createdAt: timestampStr
    };

    const newActivity: ActivityEntry = {
      id: crypto.randomUUID(),
      action: 'comment_added',
      actor: currentUser.fullName,
      detail: commentInput.trim().slice(0, 50) + (commentInput.trim().length > 50 ? '...' : ''),
      timestamp: timestampStr
    };

    const updatedComments = [...(task.comments || []), newComment];
    const updatedActivityLog = [...(task.activityLog || []), newActivity];

    try {
      await onUpdateTaskFields(task.id, {
        comments: updatedComments,
        activityLog: updatedActivityLog
      });
      setCommentInput('');
    } catch (e) {
      console.error("Error adding comment: ", e);
    }
  }, [task, currentUser, onUpdateTaskFields, commentInput]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task || !currentUser || !onUpdateTaskFields) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const timestampStr = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newAttachment: TaskAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: base64Data,
        type: file.type,
        size: file.size,
        uploadedBy: currentUser.fullName,
        uploadedAt: new Date().toISOString()
      };

      const newActivity: ActivityEntry = {
        id: crypto.randomUUID(),
        action: 'attachment_added',
        actor: currentUser.fullName,
        detail: file.name,
        timestamp: timestampStr
      };

      const updatedAttachments = [...(task.attachments || []), newAttachment];
      const updatedActivityLog = [...(task.activityLog || []), newActivity];

      try {
        await onUpdateTaskFields(task.id, {
          attachments: updatedAttachments,
          activityLog: updatedActivityLog
        });
      } catch (e) {
        console.error("Error uploading file: ", e);
      }
    };
    reader.readAsDataURL(file);
  }, [task, currentUser, onUpdateTaskFields]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddLink = useCallback(async () => {
    if (!task || !onUpdateTaskFields) return;
    const url = window.prompt("Nhập URL liên kết (ví dụ: docs.google.com):");
    if (!url || !url.trim()) return;

    try {
      await onUpdateTaskFields(task.id, {
        link: url.trim()
      });
    } catch (e) {
      console.error("Error adding link: ", e);
    }
  }, [task, onUpdateTaskFields]);

  if (!isOpen || !task) return null;

  const isAssignee = task.assignee === currentUser?.fullName;
  const isHelper = (task.helpers || []).includes(currentUser?.fullName || '');
  const isAuthorizedToUpdate = canUpdate || isAssignee || isHelper;

  const priorityInfo = priorityMeta[task.priority] || priorityMeta.medium;
  const statusInfo = statusMeta[task.status] || statusMeta.not_started;

  const subtasks = task.subtasks ?? [];
  const subtaskCompleted = subtasks.filter((s) => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((subtaskCompleted / subtasks.length) * 100) : 0;

  const attachments = task.attachments || [];

  const links = task.link
    ? [
      { name: 'Liên kết đính kèm chính', url: task.link, domain: getDomain(task.link) }
    ]
    : [];

  const comments = task.comments || [];

  const displayLog = task.activityLog && task.activityLog.length > 0
    ? task.activityLog
    : [
      {
        id: 'init',
        action: 'created' as const,
        actor: task.assignee || '-',
        timestamp: task.createdAt || '-'
      }
    ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className={cn(
          "p-0 font-sans border-l border-slate-200 bg-white flex flex-col h-full focus:outline-none shadow-2xl overflow-hidden",
          isMobile
            ? "w-full"
            : "w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl"
        )}
      >
        {/* Hidden File Input for attachments */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Header Section (Mockup style) */}
        <div className="flex flex-col border-b border-slate-100 shrink-0 px-6 pt-5 pb-4 space-y-3.5">
          {/* Row 1: Left Info | Right QR & Close */}
          <div className="flex items-center justify-between">
            {/* Left Header Info */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100 shadow-3xs">
                <Calendar className="w-4.5 h-4.5 text-[#C21A1A] stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#C21A1A]">Chi tiết công việc</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wide">{generateTaskCode(task)}</span>
              </div>
            </div>

            {/* Right Action panel */}
            <div className="flex items-center gap-2">
              {/* QR Code Scan icon */}
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                title="Quét QR Code / Barcode"
              >
                <QrCode className="w-4 h-4 stroke-[2]" />
              </button>

              {/* Close Sheet button */}
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-slate-450 hover:text-slate-650 text-xl cursor-pointer h-8 w-8 p-0 hover:bg-slate-100 rounded-lg ml-1"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Row 2: Title and Priority / Status Badges | Right Action Buttons */}
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row text-left">
            <div className="flex-1 min-w-0 space-y-1">
              <SheetTitle className="font-extrabold text-slate-900 text-xl leading-snug tracking-tight break-words">
                {task.title}
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider', priorityInfo.bg)}>
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {priorityInfo.text}
                </span>
                <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider', statusInfo.bg)}>
                  {statusInfo.text}
                </span>
              </div>
            </div>

            {/* Action Buttons (Moved here to align with Title) */}
            {isAuthorizedToUpdate && (
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button type="button" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 h-8 bg-white shadow-2xs">
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  Chỉnh sửa
                </button>
                <button type="button" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 h-8 bg-white shadow-2xs">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Sao chép
                </button>
                <button type="button" className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 h-8 bg-white shadow-2xs">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  Nhắc việc
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Section (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">

          {/* Key-Value Details (mockup: 2 rows x 3 columns grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 text-xs font-semibold text-slate-650 pt-1">
            {/* Column 1 Row 1: Assignee */}
            <div className="space-y-1.5 text-left">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Người phụ trách
              </span>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 p-2.5 rounded-xl h-12 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-red-50 text-[11px] flex items-center justify-center font-black text-[#C21A1A] border border-[#C21A1A]/20 uppercase shrink-0">
                  {task.assignee?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <span className="text-slate-800 font-bold text-xs block truncate">{task.assignee || 'Chưa phân công'}</span>
                </div>
              </div>
            </div>

            {/* Column 2 Row 1: Department */}
            <div className="space-y-1.5 text-left">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Vai trò / Bộ phận
              </span>
              <div className="bg-slate-50 border border-slate-150 px-3.5 rounded-xl text-slate-800 font-bold text-xs h-12 flex items-center shadow-2xs">
                {task.department || 'Giám đốc điều hành'}
              </div>
            </div>

            {/* Column 3 Row 1: Start Date & Deadline */}
            <div className="space-y-1.5 text-left">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Thời gian thực hiện
              </span>
              <div className="bg-slate-50 border border-slate-150 px-3 rounded-xl text-slate-800 font-bold text-xs h-12 flex items-center gap-2.5 shadow-2xs">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {task.startDate ? `${task.startDate} ➔ ${task.deadline}` : `Hạn chót: ${task.deadline}`}
                </span>
              </div>
            </div>

            {/* Column 1 & 2 Row 2: Helpers (col-span-2) */}
            <div className="space-y-1.5 md:col-span-2 text-left">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Người phụ giúp (Helpers)
              </span>
              {isAuthorizedToUpdate && onUpdateHelpers ? (
                <CustomMultiSelect
                  options={staffOptions}
                  selected={task.helpers || []}
                  onChange={(selectedHelpers) => onUpdateHelpers(task.id, selectedHelpers)}
                  placeholder="Chọn người phụ giúp"
                  searchPlaceholder="Tìm nhân sự..."
                  className="min-h-12 h-auto"
                />
              ) : (
                <div className="bg-slate-50 border border-slate-150 px-3.5 rounded-xl text-slate-800 font-bold text-xs h-12 flex items-center shadow-2xs">
                  {task.helpers && task.helpers.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-slate-200">
                      {task.helpers.map((helper, idx) => {
                        const init = helper.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-white border border-slate-200 pl-1.5 pr-2 py-0.5 rounded-full text-slate-700 text-[10px] font-bold shadow-3xs shrink-0"
                            title={helper}
                          >
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-bold text-slate-650 border border-slate-200">
                              {init}
                            </div>
                            <span>{helper}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-400 font-normal italic pl-1.5">Không có người phụ giúp</span>
                  )}
                </div>
              )}
            </div>

            {/* Column 3 Row 2: Created By */}
            <div className="space-y-1.5 text-left">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Tạo bởi
              </span>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-150 p-2 rounded-xl h-12 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[11px] flex items-center justify-center font-black text-blue-600 border border-blue-100 uppercase shrink-0">
                  {task.assignee?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 text-left">
                  <span className="text-slate-800 font-bold text-xs block truncate">{task.assignee || 'Trần Tấn Phát'}</span>
                  <span className="text-[10px] text-slate-400 block font-normal mt-0.5">{task.createdAt || '01/06/2026 09:18'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtasks / Checklist Progress (Section 5) */}
          {subtasks.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-left">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-450 font-black uppercase tracking-wider">
                  <ListChecks className="w-3.5 h-3.5 text-slate-400" />
                  Tiến độ công việc ({subtaskCompleted}/{subtasks.length})
                </span>
                <div className="flex items-center gap-2 shrink-0 select-none">
                  <span className="text-xs font-black text-blue-600">{subtaskProgress}%</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Checklist items list */}
              <div className="space-y-2">
                {subtasks.map((subtask) => {
                  const initials = subtask.completedBy
                    ? subtask.completedBy.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2)
                    : (task.assignee ? task.assignee.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2) : 'U');

                  return (
                    <div
                      key={subtask.id}
                      onClick={() => {
                        if (isAuthorizedToUpdate && onUpdateSubtasks) {
                          handleSubtaskToggle(subtask.id);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-left transition-all min-h-[44px]',
                        subtask.completed
                          ? 'bg-emerald-50/20 border-emerald-100'
                          : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50',
                        isAuthorizedToUpdate && onUpdateSubtasks ? 'cursor-pointer select-none' : 'cursor-default',
                      )}
                    >
                      {/* Checkbox + Title block */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="shrink-0">
                          {subtask.completed ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-emerald-500 shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-blue-300 bg-white hover:border-blue-400 transition-colors" />
                          )}
                        </span>
                        <span className={cn(
                          'text-xs font-semibold break-words min-w-0 leading-relaxed',
                          subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700',
                        )}>
                          {subtask.title}
                        </span>
                      </div>

                      {/* Subtask Meta (Assignee avatar & Check Time) */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Circle Initials Avatar */}
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-bold text-slate-500 border border-slate-200 uppercase shrink-0">
                          {initials}
                        </div>
                        {/* Check Time */}
                        <span className="text-[10px] font-semibold text-slate-400 w-28 text-right select-none tabular-nums">
                          {subtask.completed && subtask.completedAt
                            ? formatSubtaskTime(subtask.completedAt)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 6: Notes (HTML Content) */}
          <div className="space-y-2.5 text-left">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-450 font-black uppercase tracking-wider">
              Mô tả / Hướng dẫn
            </span>
            <div
              className="p-4 bg-slate-50 border border-slate-150 rounded-xl overflow-y-auto max-h-[500px] leading-relaxed text-slate-800 text-xs font-semibold
                        [&_img]:max-w-full [&_img]:max-h-[300px] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-xl [&_img]:shadow-md [&_img]:mx-auto [&_img]:my-3 [&_img]:block
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                        [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-200 [&_h3]:pb-1 [&_h3]:uppercase
                        [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                        [&_p]:mb-2 [&_p]:leading-relaxed
                        [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3
                        [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.notes || '<span class="italic text-slate-400 font-medium">Không có ghi chú...</span>') }}
            />
          </div>

          {/* Columns Grid: Section 7 Attachments & Section 8 Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {/* Section 7: Attachments */}
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-455 font-black uppercase tracking-wider">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                Tệp đính kèm ({attachments.length})
              </span>
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((file) => {
                  const isImage = file.type?.startsWith('image/') || file.url.startsWith('data:image/');
                  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
                  const isPdf = file.name.endsWith('.pdf');

                  return (
                    <div
                      key={file.id}
                      className="bg-slate-50/50 border border-slate-150 rounded-xl p-2.5 flex flex-col justify-between aspect-[4/3] group/file hover:border-blue-200 transition-colors shadow-3xs"
                    >
                      {/* File type icon / image preview */}
                      <div className="flex-1 flex items-center justify-center min-h-0 mb-2">
                        {isImage ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="max-h-full max-w-full object-cover rounded-lg shadow-3xs"
                          />
                        ) : isExcel ? (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                        ) : isPdf ? (
                          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-[#C21A1A]">
                            <FileText className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                            <Paperclip className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Name & Size */}
                      <div className="min-w-0">
                        <span
                          className="text-[10px] font-bold text-slate-700 block truncate"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase block mt-0.5">
                          {file.name.split('.').pop()} - {Math.round(file.size / 1024) >= 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add file button */}
                {isAuthorizedToUpdate && onUpdateTaskFields && (
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="border border-dashed border-slate-200 hover:border-blue-300 hover:bg-slate-50/40 rounded-xl aspect-[4/3] flex flex-col items-center justify-center text-slate-450 gap-1.5 transition-all cursor-pointer group"
                  >
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-bold">Thêm tệp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 8: Links */}
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-455 font-black uppercase tracking-wider">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Liên kết đính kèm ({links.length})
              </span>
              <div className="space-y-2.5">
                {links.map((link, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-xl flex items-center justify-between shadow-3xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <span className="text-[11px] font-bold text-slate-700 block truncate">{link.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">
                          {link.domain} - <a
                            href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          >
                            Mở
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add link button */}
                {isAuthorizedToUpdate && onUpdateTaskFields && (
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="w-full border border-dashed border-slate-200 hover:border-blue-300 hover:bg-slate-50/40 rounded-xl py-2.5 flex items-center justify-center text-slate-450 gap-1.5 transition-all cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-bold">Thêm liên kết</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 9 & 10: Comments & Activity Log Side-by-Side (Bố cục 2 cột) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
            {/* Column Left: Comments Section (span 7) */}
            <div className="lg:col-span-7 space-y-4">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-450 font-black uppercase tracking-wider text-left block">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Bình luận / Cập nhật
              </span>

              {/* Add comment input (Moved to the Top matching mockup) */}
              {isAuthorizedToUpdate && onUpdateTaskFields && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                    placeholder="Viết bình luận hoặc @nhắc tên..."
                    className="flex-1 bg-slate-55 border border-slate-150 px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] focus:outline-none focus:border-slate-350 focus:bg-white transition-all shadow-3xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAddComment}
                    className="shrink-0 h-[40px] w-[40px] p-0 bg-[#C21A1A] hover:bg-[#A81515] text-white rounded-lg cursor-pointer flex items-center justify-center shadow-2xs border-none"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </Button>
                </div>
              )}

              {/* Comment list */}
              <div className="space-y-3 divide-y divide-slate-100/80 max-h-[300px] overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full pt-1">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-medium italic text-xs">
                    Chưa có bình luận nào...
                  </div>
                ) : (
                  comments.map((comment) => {
                    const initials = comment.author.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
                    return (
                      <div key={comment.id} className="flex gap-2.5 py-2.5 min-h-[44px] text-left">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-black text-slate-700 border border-slate-200 uppercase shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-800">{comment.author}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-slate-400 font-semibold">{comment.createdAt}</span>
                          </div>
                          <p className="text-xs text-slate-650 font-semibold mt-0.5 leading-relaxed break-words">
                            {comment.content}
                          </p>
                          <button type="button" className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline mt-1 cursor-pointer">Trả lời</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column Right: Activity Log Timeline (span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-450 font-black uppercase tracking-wider text-left block">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Lịch sử hoạt động
              </span>

              {/* Timeline Log */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full text-left pl-1">
                {displayLog.map((entry, idx) => {
                  const initials = entry.actor.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
                  const isCompletedAction = entry.action === 'subtask_completed' || (entry.action === 'status_changed' && entry.detail === 'completed');

                  return (
                    <div key={entry.id} className="flex items-start gap-2.5 min-h-[36px] relative pb-3 last:pb-0">
                      {idx < displayLog.length - 1 && (
                        <div className="absolute left-[9px] top-4.5 bottom-0 w-0.5 bg-slate-150" />
                      )}

                      {isCompletedAction ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 border border-emerald-500 flex items-center justify-center text-white shrink-0 z-10 shadow-3xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase shrink-0 z-10">
                          {initials}
                        </div>
                      )}

                      <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
                        <p className="text-[11px] text-slate-650 font-semibold leading-relaxed truncate">
                          <span className="font-bold text-slate-800">{entry.actor}</span>
                          {' '}{activityActionLabels[entry.action] || entry.action}
                          {entry.detail && (
                            <span className={cn(
                              "font-extrabold",
                              entry.action === 'status_changed' && (
                                entry.detail === 'completed' ? 'text-emerald-600' :
                                  entry.detail === 'in_progress' ? 'text-blue-600' :
                                    entry.detail === 'waiting' ? 'text-amber-600' : 'text-slate-600'
                              )
                            )}>
                              {' '}{entry.detail}
                            </span>
                          )}
                        </p>
                        <span className="text-[9px] text-slate-400 font-semibold tabular-nums shrink-0 mt-0.5">{entry.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 11: Cập nhật trạng thái */}
          {isAuthorizedToUpdate && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-450 font-black uppercase tracking-wider text-left block">
                Cập nhật trạng thái
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-150 p-2 rounded-xl select-none shadow-3xs">
                {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => {
                  const Icon = statusMeta[st].icon;
                  const isActive = task.status === st;
                  const activeBgClass = statusMeta[st].activeBg;
                  const iconColor = isActive
                    ? (st === 'completed'
                      ? 'text-emerald-650 font-bold'
                      : st === 'in_progress'
                        ? 'text-blue-650 font-bold'
                        : st === 'waiting'
                          ? 'text-amber-650 font-bold'
                          : 'text-slate-850 font-bold')
                    : statusMeta[st].iconColor;

                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusChange(st)}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait h-10 active:scale-95 shadow-3xs",
                        isActive
                          ? `${activeBgClass} font-extrabold`
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                      <span>{statusMeta[st].text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Desktop Footer */}
        {!isMobile && (
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 shrink-0 px-6 pb-4 bg-slate-50/50">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer h-9 animate-none border border-slate-200 bg-white shadow-2xs"
            >
              Đóng lại
            </Button>
          </div>
        )}

        {/* Mobile Fixed Bottom Status Bar */}
        {isMobile && isAuthorizedToUpdate && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 shrink-0 safe-area-bottom">
            <div className="grid grid-cols-4 gap-1.5">
              {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => {
                const Icon = statusMeta[st].icon;
                const isActive = task.status === st;
                const activeBgClass = statusMeta[st].activeBg;
                const iconColor = isActive
                  ? (st === 'completed'
                    ? 'text-emerald-650'
                    : st === 'in_progress'
                      ? 'text-blue-650'
                      : st === 'waiting'
                        ? 'text-amber-650'
                        : 'text-slate-850')
                  : statusMeta[st].iconColor;

                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleStatusChange(st)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider min-h-[52px] transition-all cursor-pointer disabled:opacity-50',
                      isActive
                        ? `${activeBgClass} border border-transparent shadow-sm`
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', iconColor)} />
                    <span className="leading-tight text-center">{statusMeta[st].text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});
