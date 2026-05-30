import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CircleAlert, Clock3, FileSearch, ListChecks, MessageSquare, Siren, X } from 'lucide-react';
import { Alert, AlertDescription, Badge, Button, Popover, PopoverContent, PopoverTrigger, ScrollArea, Textarea } from '@shared/ui';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { useModulePermissions, isOwnerUser } from '../../shared/hooks/use-module-permissions';
import { notificationsService, subscribeNotificationsRealtime } from '../../services/notifications-service';
import { useAppStore } from '../../stores/app-store';
import type { TabType } from '../../types/app.types';
import type { AppNotification } from '../../types/notification.types';

type NotificationDestination = Exclude<TabType, 'Notifications' | 'Today'> | 'Notifications';

interface NotificationBellPopoverProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NotificationActionPermissions {
  canApprove: boolean;
  canComment: boolean;
  canCreateTask: boolean;
}

const notificationTypeMeta: Record<
  AppNotification['type'],
  { icon: React.ComponentType<{ className?: string }>; dotClass: string; badgeClass: string }
> = {
  khan: {
    icon: Siren,
    dotClass: 'bg-rose-500',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  can_duyet: {
    icon: FileSearch,
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  nhac_viec: {
    icon: ListChecks,
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  canh_bao: {
    icon: CircleAlert,
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

function useIsMobile(query = '(max-width: 768px)') {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    setIsMobile(media.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [query]);

  return isMobile;
}

function normalizeDateTime(value?: string): number {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

// normalizeAccessCode is imported from shared/hooks/use-module-permissions

function formatRelativeTimeVi(value?: string): string {
  if (!value) {
    return 'Vừa xong';
  }

  const nowMs = Date.now();
  const targetMs = Date.parse(value);
  if (Number.isNaN(targetMs)) {
    return 'Vừa xong';
  }

  const diffMinutes = Math.max(0, Math.floor((nowMs - targetMs) / 60000));
  if (diffMinutes < 1) {
    return 'Vừa xong';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  return new Date(targetMs).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveNotificationDestination(notification: AppNotification): NotificationDestination {
  if (notification.sourceModule === 'SOP') {
    return 'SOP';
  }
  if (notification.sourceModule === 'CHECKLIST') {
    return 'Checklist';
  }
  if (notification.sourceModule === 'TASKS') {
    return 'Tasks';
  }
  if (notification.sourceModule === 'REPORTS') {
    return 'Reports';
  }

  if (notification.type === 'khan' || notification.type === 'can_duyet') {
    return 'SOP';
  }
  if (notification.type === 'nhac_viec') {
    return 'Checklist';
  }
  if (notification.type === 'canh_bao') {
    return 'Tasks';
  }

  return 'Notifications';
}

function useNotificationsData() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortNotifications = useCallback((rows: AppNotification[]) => {
    return [...rows].sort(
      (a, b) => normalizeDateTime(b.updatedAt || b.createdAt) - normalizeDateTime(a.updatedAt || a.createdAt),
    );
  }, []);

  const loadFromApi = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await notificationsService.getAll();
      setItems(sortNotifications(rows || []));
    } catch (error) {
      console.error('Không thể tải danh sách thông báo:', error);
      setErrorMessage('Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [sortNotifications]);

  const patchNotificationLocal = useCallback((notificationId: string, patch: Partial<AppNotification>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, ...patch } : item)),
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNotificationsRealtime(
      (rows) => {
        setItems(sortNotifications(rows || []));
        setErrorMessage(null);
        setIsLoading(false);
      },
      (error) => {
        console.error('Không thể đồng bộ realtime Notifications:', error);
        setErrorMessage('Không thể đồng bộ thông báo realtime.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [sortNotifications]);

  const pendingCount = useMemo(
    () => items.filter((notification) => notification.status === 'pending').length,
    [items],
  );

  return {
    items,
    pendingCount,
    isLoading,
    errorMessage,
    loadFromApi,
    patchNotificationLocal,
  };
}

function useNotificationPermissions() {
  const currentUser = useAppStore((state) => state.currentUser);
  const isOwner = isOwnerUser(currentUser);
  const { permissions: sopPermissions } = useModulePermissions(MODULE_CODE.LOI_SOP, currentUser, isOwner);
  const { permissions: taskPermissions } = useModulePermissions(MODULE_CODE.GIAO_VIEC, currentUser, isOwner);

  return useMemo<NotificationActionPermissions>(() => ({
    canApprove: sopPermissions.canApprove || sopPermissions.canUpdate,
    canComment: sopPermissions.canUpdate,
    canCreateTask: taskPermissions.canCreate,
  }), [sopPermissions.canApprove, sopPermissions.canUpdate, taskPermissions.canCreate]);
}

interface NotificationListItemProps {
  item: AppNotification;
  permissions: NotificationActionPermissions;
  commentDraft: string;
  isCommenting: boolean;
  isSubmitting: boolean;
  onOpenDetail: (notification: AppNotification) => void;
  onApprove: (notification: AppNotification) => void;
  onReject: (notification: AppNotification) => void;
  onCreateTask: (notification: AppNotification) => void;
  onStartComment: (notificationId: string) => void;
  onCancelComment: (notificationId: string) => void;
  onSubmitComment: (notification: AppNotification) => void;
  onCommentDraftChange: (notificationId: string, value: string) => void;
}

const NotificationListItem = React.memo(function NotificationListItem({
  item,
  permissions,
  commentDraft,
  isCommenting,
  isSubmitting,
  onOpenDetail,
  onApprove,
  onReject,
  onCreateTask,
  onStartComment,
  onCancelComment,
  onSubmitComment,
  onCommentDraftChange,
}: NotificationListItemProps) {
  const meta = notificationTypeMeta[item.type];
  const IconComp = meta.icon;
  const isPending = item.status === 'pending';

  const handleOpenDetail = useCallback(() => {
    onOpenDetail(item);
  }, [item, onOpenDetail]);

  const handleApprove = useCallback(() => {
    onApprove(item);
  }, [item, onApprove]);

  const handleReject = useCallback(() => {
    onReject(item);
  }, [item, onReject]);

  const handleCreateTask = useCallback(() => {
    onCreateTask(item);
  }, [item, onCreateTask]);

  const handleStartComment = useCallback(() => {
    onStartComment(item.id);
  }, [item.id, onStartComment]);

  const handleCancelComment = useCallback(() => {
    onCancelComment(item.id);
  }, [item.id, onCancelComment]);

  const handleSubmitComment = useCallback(() => {
    onSubmitComment(item);
  }, [item, onSubmitComment]);

  const handleCommentDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onCommentDraftChange(item.id, event.target.value);
    },
    [item.id, onCommentDraftChange],
  );

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_4px_14px_-10px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600">
            <IconComp className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-slate-800">{item.title}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${meta.badgeClass}`}
              >
                {item.typeLabel}
              </Badge>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Clock3 className="h-3 w-3" />
                {formatRelativeTimeVi(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {isPending ? <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClass}`} /> : null}
      </div>

      {item.comments ? (
        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800">
          Phản hồi: {item.comments}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDetail}
          className="h-7 rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-[#C21A1A]/25 hover:bg-[#C21A1A]/5 hover:text-[#C21A1A]"
        >
          Xem chi tiết phiếu
        </Button>

        {isPending && (item.type === 'khan' || item.type === 'can_duyet' || item.type === 'nhac_viec') ? (
          <Button
            size="sm"
            disabled={!permissions.canApprove || isSubmitting}
            onClick={handleApprove}
            className="h-7 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-700"
          >
            Duyệt
          </Button>
        ) : null}

        {isPending && item.type === 'khan' ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!permissions.canApprove || isSubmitting}
            onClick={handleReject}
            className="h-7 rounded-lg border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700 hover:bg-rose-100"
          >
            Từ chối
          </Button>
        ) : null}

        {isPending && item.type === 'can_duyet' && !isCommenting ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!permissions.canComment || isSubmitting}
            onClick={handleStartComment}
            className="h-7 gap-1 rounded-lg border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100"
          >
            <MessageSquare className="h-3 w-3" />
            Góp ý
          </Button>
        ) : null}

        {isPending && item.type === 'canh_bao' ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!permissions.canCreateTask || isSubmitting}
            onClick={handleCreateTask}
            className="h-7 rounded-lg border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700 hover:bg-blue-100"
          >
            Tạo việc
          </Button>
        ) : null}
      </div>

      {isPending && item.type === 'can_duyet' && isCommenting ? (
        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <Textarea
            rows={2}
            value={commentDraft}
            onChange={handleCommentDraftChange}
            placeholder="Nhập góp ý để phản hồi..."
            className="min-h-[70px] rounded-lg border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700"
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelComment}
              className="h-6 rounded-md px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={!commentDraft.trim() || isSubmitting}
              onClick={handleSubmitComment}
              className="h-6 rounded-md bg-[#C21A1A] px-2.5 py-1 text-[10px] font-black text-white hover:bg-[#A31616]"
            >
              Gửi góp ý
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
});

interface NotificationsListProps {
  items: AppNotification[];
  permissions: NotificationActionPermissions;
  isLoading: boolean;
  errorMessage: string | null;
  submittingId: string | null;
  activeCommentId: string | null;
  commentDraftById: Record<string, string>;
  onRetry: () => void;
  onOpenDetail: (notification: AppNotification) => void;
  onApprove: (notification: AppNotification) => void;
  onReject: (notification: AppNotification) => void;
  onCreateTask: (notification: AppNotification) => void;
  onStartComment: (notificationId: string) => void;
  onCancelComment: (notificationId: string) => void;
  onSubmitComment: (notification: AppNotification) => void;
  onCommentDraftChange: (notificationId: string, value: string) => void;
}

const NotificationsList = React.memo(function NotificationsList({
  items,
  permissions,
  isLoading,
  errorMessage,
  submittingId,
  activeCommentId,
  commentDraftById,
  onRetry,
  onOpenDetail,
  onApprove,
  onReject,
  onCreateTask,
  onStartComment,
  onCancelComment,
  onSubmitComment,
  onCommentDraftChange,
}: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 animate-pulse rounded-xl border border-dashed border-slate-200 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-2 p-3 text-left">
        <Alert className="border-rose-200 bg-rose-50 text-rose-700">
          <AlertDescription className="text-[11px] font-semibold text-rose-700">{errorMessage}</AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-7 rounded-lg border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700"
        >
          Tải lại
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-5 text-center">
        <Bell className="mx-auto h-5 w-5 text-slate-300" />
        <p className="mt-1 text-[11px] font-semibold text-slate-500">Chưa có thông báo nào</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(60vh,33rem)] md:h-[32rem]" viewportClassName="px-3 py-3">
      <ul className="space-y-2">
        {items.map((item) => (
          <NotificationListItem
            key={item.id}
            item={item}
            permissions={permissions}
            commentDraft={commentDraftById[item.id] || ''}
            isCommenting={activeCommentId === item.id}
            isSubmitting={submittingId === item.id}
            onOpenDetail={onOpenDetail}
            onApprove={onApprove}
            onReject={onReject}
            onCreateTask={onCreateTask}
            onStartComment={onStartComment}
            onCancelComment={onCancelComment}
            onSubmitComment={onSubmitComment}
            onCommentDraftChange={onCommentDraftChange}
          />
        ))}
      </ul>
    </ScrollArea>
  );
});

export const NotificationsBellPopover = React.memo(function NotificationsBellPopover({
  activeTab,
  onSelectTab,
}: NotificationBellPopoverProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<boolean>(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentDraftById, setCommentDraftById] = useState<Record<string, string>>({});
  const setNotificationFocus = useAppStore((state) => state.setNotificationFocus);
  const permissions = useNotificationPermissions();
  const { items, pendingCount, isLoading, errorMessage, loadFromApi, patchNotificationLocal } = useNotificationsData();

  const handleRetry = useCallback(() => {
    void loadFromApi();
  }, [loadFromApi]);

  const handleDismissActionMessage = useCallback(() => {
    setActionMessage(null);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setActiveCommentId(null);
      setActionMessage(null);
    }
  }, []);

  const handleCommentDraftChange = useCallback((notificationId: string, value: string) => {
    setCommentDraftById((prev) => ({ ...prev, [notificationId]: value }));
  }, []);

  const handleStartComment = useCallback((notificationId: string) => {
    setActiveCommentId(notificationId);
    setActionMessage(null);
  }, []);

  const handleCancelComment = useCallback((notificationId: string) => {
    setActiveCommentId((prev) => (prev === notificationId ? null : prev));
    setCommentDraftById((prev) => ({ ...prev, [notificationId]: '' }));
  }, []);

  const applyNotificationAction = useCallback(
    async (notification: AppNotification, patch: Partial<AppNotification>, successMessage: string) => {
      setSubmittingId(notification.id);
      setActionMessage(null);
      const updatedAt = new Date().toISOString();

      patchNotificationLocal(notification.id, {
        ...patch,
        updatedAt,
      });

      try {
        await notificationsService.update(notification.id, {
          ...patch,
          updatedAt,
        });
        setActionMessage({ type: 'success', message: successMessage });
      } catch (error) {
        console.error('Không thể cập nhật thông báo:', error);
        setActionMessage({ type: 'error', message: 'Không thể cập nhật thông báo. Vui lòng thử lại.' });
        void loadFromApi();
      } finally {
        setSubmittingId(null);
      }
    },
    [loadFromApi, patchNotificationLocal],
  );

  const handleApprove = useCallback(
    (notification: AppNotification) => {
      if (!permissions.canApprove) {
        setActionMessage({ type: 'error', message: 'Bạn không có quyền phê duyệt thông báo này.' });
        return;
      }
      void applyNotificationAction(notification, { status: 'approved' }, 'Đã phê duyệt thông báo.');
    },
    [applyNotificationAction, permissions.canApprove],
  );

  const handleReject = useCallback(
    (notification: AppNotification) => {
      if (!permissions.canApprove) {
        setActionMessage({ type: 'error', message: 'Bạn không có quyền từ chối thông báo này.' });
        return;
      }
      void applyNotificationAction(notification, { status: 'rejected' }, 'Đã từ chối thông báo.');
    },
    [applyNotificationAction, permissions.canApprove],
  );

  const handleCreateTask = useCallback(
    (notification: AppNotification) => {
      if (!permissions.canCreateTask) {
        setActionMessage({ type: 'error', message: 'Bạn không có quyền tạo việc từ cảnh báo này.' });
        return;
      }
      void applyNotificationAction(notification, { status: 'task_created' }, 'Đã tạo việc từ thông báo.');
    },
    [applyNotificationAction, permissions.canCreateTask],
  );

  const handleSubmitComment = useCallback(
    (notification: AppNotification) => {
      if (!permissions.canComment) {
        setActionMessage({ type: 'error', message: 'Bạn không có quyền góp ý thông báo này.' });
        return;
      }

      const comment = (commentDraftById[notification.id] || '').trim();
      if (!comment) {
        setActionMessage({ type: 'error', message: 'Vui lòng nhập nội dung góp ý.' });
        return;
      }

      void applyNotificationAction(
        notification,
        {
          status: 'commented',
          comments: comment,
        },
        'Đã gửi góp ý thành công.',
      );

      setActiveCommentId(null);
      setCommentDraftById((prev) => ({ ...prev, [notification.id]: '' }));
    },
    [applyNotificationAction, commentDraftById, permissions.canComment],
  );

  const handleOpenDetail = useCallback(
    (notification: AppNotification) => {
      const destination = resolveNotificationDestination(notification);

      setNotificationFocus({
        notificationId: notification.id,
        sourceModule: notification.sourceModule,
        sourceId: notification.sourceId,
      });

      setOpen(false);

      if (destination === 'Notifications') {
        onSelectTab('Notifications');
      } else {
        onSelectTab(destination);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [onSelectTab, setNotificationFocus],
  );

  const triggerClassName = useMemo(() => {
    if (activeTab === 'Notifications') {
      return 'bg-rose-50 border-rose-300 text-[#C21A1A] ring-2 ring-rose-200/60';
    }
    return 'bg-slate-50 border-slate-200 hover:bg-[#C21A1A]/5 hover:border-rose-150 hover:text-[#C21A1A] text-slate-500';
  }, [activeTab]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`relative h-11 w-11 rounded-xl border transition-all md:h-9 md:w-9 ${triggerClassName}`}
          title="Xem thông báo"
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white bg-[#C21A1A] px-1 text-[8px] font-black text-white">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isMobile ? 'center' : 'end'}
        side="bottom"
        sideOffset={isMobile ? 8 : 10}
        className="w-[min(96vw,560px)] max-w-[96vw] p-0"
      >
        <div className="border-b border-slate-100 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">Thông báo duyệt phiếu</p>
              <p className="text-[10px] font-semibold text-slate-500">
                {pendingCount > 0 ? `${pendingCount} phiếu đang chờ xử lý` : 'Tất cả thông báo đã xử lý'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="h-7 rounded-md px-2 py-1 text-[9.5px] font-black uppercase tracking-wider text-slate-600"
            >
              Làm mới
            </Button>
          </div>

          {actionMessage ? (
            <Alert
              className={`mt-2 flex items-start justify-between rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
                actionMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <AlertDescription className="flex w-full items-start justify-between gap-2 text-[10px] font-semibold">
                <span>{actionMessage.message}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={handleDismissActionMessage}
                  className="h-4 w-4 shrink-0 rounded p-0.5 hover:bg-white/60"
                  aria-label="Đóng thông báo trạng thái"
                >
                  <X className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="pb-1">
          <NotificationsList
            items={items}
            permissions={permissions}
            isLoading={isLoading}
            errorMessage={errorMessage}
            submittingId={submittingId}
            activeCommentId={activeCommentId}
            commentDraftById={commentDraftById}
            onRetry={handleRetry}
            onOpenDetail={handleOpenDetail}
            onApprove={handleApprove}
            onReject={handleReject}
            onCreateTask={handleCreateTask}
            onStartComment={handleStartComment}
            onCancelComment={handleCancelComment}
            onSubmitComment={handleSubmitComment}
            onCommentDraftChange={handleCommentDraftChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
});

export default function NotificationsView() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left">
        <h1 className="text-base font-black tracking-tight text-slate-800">Thông báo đã chuyển lên Header</h1>
        <p className="mt-1 text-sm text-slate-500">
          Có thể duyệt, góp ý hoặc tạo việc trực tiếp trong popover, đồng thời vẫn mở chi tiết phiếu khi cần.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <NotificationsBellPopover activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    </div>
  );
}
