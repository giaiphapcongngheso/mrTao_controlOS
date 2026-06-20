import React, { useCallback, useState } from 'react';
import { Send, MessageSquare, History, User } from 'lucide-react';
import type { TaskComment, ActivityEntry } from '../../../types/tasks.types';
import { cn } from '@shared/lib/utils';
import { Button, Input } from '@shared/ui';

interface TaskCommentsSectionProps {
  comments: TaskComment[];
  activityLog: ActivityEntry[];
  currentUser: string;
  onAddComment: (content: string) => void | Promise<void>;
}

const activityActionLabels: Record<string, string> = {
  created: 'đã tạo công việc',
  status_changed: 'đã đổi trạng thái',
  assigned: 'đã phân công',
  comment_added: 'đã bình luận',
  subtask_completed: 'đã hoàn thành bước con',
  deadline_changed: 'đã đổi hạn chót',
  priority_changed: 'đã đổi ưu tiên',
};

// Comment list
const CommentItem = React.memo(function CommentItem({ comment }: { comment: TaskComment }) {
  return (
    <div className="flex gap-2.5 py-2.5 min-h-[44px]">
      <div className="w-7 h-7 rounded-full bg-blue-100 text-[10px] flex items-center justify-center font-bold text-blue-600 border border-blue-200 uppercase shrink-0 mt-0.5">
        {comment.author?.charAt(0) || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700">{comment.author}</span>
          <span className="text-[10px] text-slate-400 font-medium">{comment.createdAt}</span>
        </div>
        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
});

// Activity log item
const ActivityItem = React.memo(function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-2.5 py-2 min-h-[36px]">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 font-medium">
          <span className="font-bold text-slate-600">{entry.actor}</span>
          {' '}{activityActionLabels[entry.action] || entry.action}
          {entry.detail && (
            <span className="text-slate-400"> — {entry.detail}</span>
          )}
        </p>
        <span className="text-[10px] text-slate-400 font-medium">{entry.timestamp}</span>
      </div>
    </div>
  );
});

export const TaskCommentsSection = React.memo(function TaskCommentsSection({
  comments,
  activityLog,
  currentUser,
  onAddComment,
}: TaskCommentsSectionProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = useCallback(async () => {
    const content = newComment.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await onAddComment(content);
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  }, [newComment, onAddComment]);

  return (
    <div className="space-y-3">
      {/* Tab switch */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
            activeTab === 'comments'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <MessageSquare className="w-3 h-3" />
          Bình luận ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
            activeTab === 'activity'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <History className="w-3 h-3" />
          Lịch sử ({activityLog.length})
        </button>
      </div>

      {/* Comments tab */}
      {activeTab === 'comments' && (
        <div className="space-y-1">
          {/* Comment list */}
          <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-300 italic text-center py-6 font-semibold">
                Chưa có bình luận nào
              </p>
            ) : (
              comments.map((c) => <CommentItem key={c.id} comment={c} />)
            )}
          </div>

          {/* Add comment input */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="Viết bình luận..."
              className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px]"
              disabled={submitting}
            />
            <Button
              type="button"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="shrink-0 h-[40px] w-[40px] p-0 bg-[#C21A1A] hover:bg-[#A81515] text-white rounded-lg cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="max-h-[260px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {activityLog.length === 0 ? (
            <p className="text-xs text-slate-300 italic text-center py-6 font-semibold">
              Chưa có hoạt động nào
            </p>
          ) : (
            activityLog.map((entry) => <ActivityItem key={entry.id} entry={entry} />)
          )}
        </div>
      )}
    </div>
  );
});
