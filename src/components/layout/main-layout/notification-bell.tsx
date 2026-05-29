import type { Locale } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { Bell, Clock, Info } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notification-service';
import { useAuthStore } from '@/stores/auth-store';
import { NotificationItem, PAGE_SIZE } from '@/types/system/notification.type';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
} from '@shared/ui';

export function NotificationBell() {
  const { t, i18n } = useTranslation(['appHeader', 'common', 'message']);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const locale = useMemo<Locale>(() => {
    if (i18n.language?.toLowerCase().startsWith('en')) {
      return enUS;
    }
    return vi;
  }, [i18n.language]);
  const formatRelativeTime = useCallback(
    (value?: string | Date | null) => formatTimestamp(value, locale),
    [locale],
  );

  const loadNotifications = useCallback(
    async ({ page: pageToLoad, append }: { page: number; append: boolean }) => {
      if (!userId) {
        if (!append) {
          setItems([]);
          setHasMore(false);
          setPage(1);
          setFetchError(null);
        }
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setFetchError(null);
      }

      try {
        const response = await notificationService.getPaged({
          employeeId: userId,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        const mapped = (response.data ?? []).map<NotificationItem>((notification) => ({
          id: notification.id,
          message: notification.message,
          userName: notification.userName,
          employeeId: notification.employeeId,
          isRead: notification.isRead,
          type: notification.type,
          url: notification.url,
          readAt: notification.readAt ?? null,
          createdDate: notification.createdDate ?? null,
          level: notification.level,
        }));

        setItems((prev) => {
          if (!append) {
            return mapped;
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const deduped = mapped.filter((item) => !existingIds.has(item.id));
          return [...prev, ...deduped];
        });

        setPage(pageToLoad);
        const totalPages = response.totalPages ?? 0;
        setHasMore(pageToLoad < totalPages);
        setFetchError(null);
        setActionError(null);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        if (!append) {
          setItems([]);
          setHasMore(false);
          setPage(1);
        }
        setFetchError(t('appHeader:notificationsFetchError'));
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [userId, t],
  );

  useEffect(() => {
    void loadNotifications({ page: 1, append: false });
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    void loadNotifications({ page: page + 1, append: true });
  }, [hasMore, isLoading, isLoadingMore, loadNotifications, page]);

  const handleRetry = useCallback(() => {
    setActionError(null);
    void loadNotifications({ page: 1, append: false });
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => items.filter((notification) => !notification.isRead).length,
    [items],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      let originalItem: NotificationItem | undefined;
      const readAt = new Date().toISOString();

      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) {
          return prev;
        }

        const currentItem = prev[index];
        originalItem = currentItem;

        if (currentItem.isRead) {
          return prev;
        }

        const next = [...prev];
        next[index] = { ...currentItem, isRead: true, readAt };
        return next;
      });

      if (!originalItem || originalItem.isRead) {
        return;
      }

      try {
        await notificationService.markAsRead({
          id: originalItem.id,
          message: originalItem.message,
          userName: originalItem.userName,
          employeeId: originalItem.employeeId,
          isRead: true,
          readAt,
          type: originalItem.type,
          url: originalItem.url,
        });
        setActionError(null);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        setActionError(t('appHeader:markReadError'));
        if (originalItem) {
          setItems((prev) => {
            const index = prev.findIndex((item) => item.id === id);
            if (index === -1) {
              return prev;
            }
            const next = [...prev];
            next[index] = originalItem!;
            return next;
          });
        }
      }
    },
    [t],
  );

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) {
      return;
    }

    const unreadItems = items.filter((notification) => !notification.isRead);
    const previousMap = new Map(unreadItems.map((item) => [item.id, item]));
    const readAt = new Date().toISOString();

    setItems((prev) =>
      prev.map((notification) =>
        notification.isRead ? notification : { ...notification, isRead: true, readAt },
      ),
    );

    setIsMarkingAll(true);

    try {
      await Promise.all(
        unreadItems.map((notification) =>
          notificationService.markAsRead({
            id: notification.id,
            message: notification.message,
            userName: notification.userName,
            employeeId: notification.employeeId,
            type: notification.type,
            url: notification.url,
            isRead: true,
            readAt,
          }),
        ),
      );
      setActionError(null);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setActionError(t('appHeader:markAllError'));
      setItems((prev) =>
        prev.map((notification) => previousMap.get(notification.id) ?? notification),
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [items, t, unreadCount]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }, []);

  const handleToggleExpand = useCallback(
    (event: MouseEvent<HTMLButtonElement>, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      toggleExpand(id);
      void markAsRead(id);
    },
    [markAsRead, toggleExpand],
  );

  const scrollAreaClassName = cn(
    'flex-1 overflow-y-auto pr-1',
    isMobile ? 'h-full max-h-none' : 'max-h-[24rem] sm:max-h-[28rem] md:max-h-[30rem]',
  );

  const triggerButton = (
    <div className="relative">
      <Button
        ref={bellButtonRef}
        variant="ghost"
        size="icon"
        type="button"
        aria-label={t('appHeader:notifications')}
        className="relative"
      >
        <Bell className="h-[1.2rem] w-[1.2rem]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-[#fff]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>
    </div>
  );

  const renderList = (variant: 'menu' | 'sheet') => {
    const showEmptyState = !isLoading && items.length === 0 && !fetchError;
    const showErrorState = !isLoading && fetchError !== null;

    return (
      <div className="flex flex-col gap-1.5 p-2">
        {actionError ? (
          <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
            <p>{actionError}</p>
          </div>
        ) : null}

        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => <NotificationSkeleton key={index} />)
          : items.map((notification) => {
              const containerClass = cn(
                'relative flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
                notification.isRead
                  ? 'border-border bg-background hover:bg-muted/70'
                  : 'border-blue-200 bg-blue-50/70 shadow-sm hover:bg-blue-100/70',
              );

              const content = (
                <NotificationListItem
                  notification={notification}
                  isExpanded={expandedIds.includes(notification.id)}
                  onToggle={handleToggleExpand}
                  formatRelative={formatRelativeTime}
                />
              );

              if (variant === 'menu') {
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'cursor-pointer data-[highlighted]:bg-transparent',
                      containerClass,
                    )}
                    onSelect={(event: Event) => {
                      event.preventDefault();
                      void markAsRead(notification.id);
                    }}
                  >
                    {content}
                  </DropdownMenuItem>
                );
              }

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markAsRead(notification.id)}
                  className={cn('cursor-pointer text-left outline-none', containerClass)}
                >
                  {content}
                </button>
              );
            })}

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
            <Bell className="mb-2 h-5 w-5 text-muted-foreground" />
            <p>{t('appHeader:noNotifications')}</p>
          </div>
        ) : null}

        {showErrorState ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-4 py-4 text-center text-xs text-destructive">
            <p>{fetchError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-auto px-2 py-1 text-xs font-medium text-primary hover:text-primary"
            >
              {t('appHeader:retry')}
            </Button>
          </div>
        ) : null}

        {hasMore ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLoadMore()}
            disabled={isLoadingMore}
            className="mt-2 self-center text-xs font-medium text-primary hover:text-primary"
          >
            {isLoadingMore ? t('message:loading') : t('appHeader:loadMore')}
          </Button>
        ) : null}
      </div>
    );
  };

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild onClick={() => setIsSheetOpen(true)}>
          {triggerButton}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-[calc(100vh-1.5rem)] w-full max-w-none rounded-t-2xl border-t p-0 sm:hidden"
        >
          <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b px-5 py-4">
            <div className="space-y-1">
              <SheetTitle className="text-base font-semibold">
                {t('appHeader:notifications')}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? t('appHeader:unreadCount', { count: unreadCount })
                  : t('appHeader:allRead')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || isMarkingAll || isLoading}
              onClick={() => void markAllAsRead()}
              className="h-auto px-2 py-1 mr-4 text-xs font-medium text-primary hover:text-primary"
            >
              {t('appHeader:markAllRead')}
            </Button>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <ScrollArea className={scrollAreaClassName}>{renderList('sheet')}</ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild onClick={() => setIsMenuOpen(true)}>
        {triggerButton}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="flex w-[22rem] max-w-[90vw] flex-col p-0 sm:w-[24rem] md:w-[26rem]"
      >
        <DropdownMenuLabel className="flex items-start justify-between px-4 py-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t('appHeader:notifications')}</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? t('appHeader:unreadCount', { count: unreadCount })
                : t('appHeader:allRead')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || isMarkingAll || isLoading}
            onClick={(event) => {
              event.preventDefault();
              void markAllAsRead();
            }}
            className="h-auto px-2 py-1 text-xs font-medium text-primary hover:text-primary"
          >
            {t('appHeader:markAllRead')}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className={scrollAreaClassName}>{renderList('menu')}</ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type NotificationListItemProps = {
  notification: NotificationItem;
  isExpanded: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
  formatRelative: (value?: string | Date | null) => string;
};

function NotificationListItem({
  notification,
  isExpanded,
  onToggle,
  formatRelative,
}: NotificationListItemProps) {
  const { t } = useTranslation(['appHeader', 'common']);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [overflow, setOverflow] = useState<boolean>(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (isExpanded) {
        return;
      }

      const titleEl = titleRef.current;
      const hasOverflow =
        !!titleEl && Math.ceil(titleEl.scrollHeight) > Math.ceil(titleEl.clientHeight);
      setOverflow(hasOverflow);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);

    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [isExpanded, notification.message]);

  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden
        className={cn(
          'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all',
          'border-blue-200 bg-blue-50 text-blue-600',
          notification.isRead && 'opacity-70',
        )}
      >
        <Info className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p
          ref={titleRef}
          className={cn('text-sm font-medium text-foreground', !isExpanded && 'line-clamp-2')}
        >
          {notification.message}
        </p>
        {notification.userName ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{notification.userName}</p>
        ) : null}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelative(notification.createdDate)}
          </span>
          <span aria-hidden>•</span>
          <span>{notification.isRead ? t('appHeader:read') : t('appHeader:unread')}</span>
        </div>
        {overflow ? (
          <div className="flex">
            <button
              type="button"
              onClick={(event) => onToggle(event, notification.id)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {isExpanded ? t('common:seeLess') : t('common:seeMore')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useIsMobile(query = '(max-width: 640px)') {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    return undefined;
  }, [query]);

  return isMobile;
}

function NotificationSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-3 rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2">
      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-muted-foreground/20" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-2 w-1/2 rounded bg-muted-foreground/10" />
        <div className="h-2 w-1/3 rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

function formatTimestamp(value?: string | Date | null, locale: Locale = vi) {
  if (!value) {
    return '';
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return formatDistanceToNow(date, { addSuffix: true, locale });
  } catch {
    return '';
  }
}
