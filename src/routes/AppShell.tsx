import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart4,
  BookMarked,
  CheckSquare,
  HelpCircle,
  Home,
  ListTodo,
  LogOut,
  Megaphone,
  Package,
  Users,
} from 'lucide-react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import type { TabType } from '../types/app.types';
import { enrichSessionWithDefaultFields } from '../shared/auth';
import { SESSION_STORAGE_KEY, useAppStore } from '../stores/app-store';
import { MODULE_CODE } from '../constants/staff-permissions.constants';
import { isOwnerUser, useAllowedModules } from '../shared/hooks/use-module-permissions';
import AppFrameLayout, { type AppFrameLayoutLink } from './_components/AppFrameLayout';
import HeaderProfilePopover from './_components/HeaderProfilePopover';
import { NotificationsBellPopover } from './Notifications/NotificationsView';
import { AppShellStateProvider, TAB_ROUTE_MAP, getTabFromPath } from './app-shell-state';
import { ROUTE_PRELOAD_MAP } from './route-preload';
import { ensureAllRoleDailySnapshots } from '../services/ensure-daily-snapshots';
import { DEFAULT_STORE_ID } from '../data';

const LazyLoginView = lazy(() => import('./Login/LoginView'));

const TAB_TO_MODULE_CODES: Record<TabType, string[]> = {
  Today: [MODULE_CODE.HOM_NAY],
  Checklist: [MODULE_CODE.CHECKLIST],
  Tasks: [MODULE_CODE.GIAO_VIEC],
  KPI: [MODULE_CODE.KPI],
  SOP: [MODULE_CODE.LOI_SOP],
  Reports: [MODULE_CODE.BAO_CAO],
  Handbook: [MODULE_CODE.SO_TAY],
  Marketing: [MODULE_CODE.MARKETING],
  Warehouse: [MODULE_CODE.KHO_HANG],
  Staff: ['STAFF', 'TAI_KHOAN', 'NHAN_SU', 'STAFF_PERMISSIONS'],
  Notifications: ['THONG_BAO', 'NOTIFICATIONS', 'PHE_DUYET'],
};

const DESKTOP_TITLE_MAP: Record<TabType, string> = {
  Today: 'Tổng quan',
  Checklist: 'Hồ sơ Quy trình ca trực',
  Tasks: 'Công việc',
  KPI: 'Chỉ số hiệu kỳ (KPI)',
  SOP: 'Cải tiến',
  Reports: 'Báo cáo tổng kết ca',
  Handbook: 'Sổ tay Vận hành chuẩn (SOP)',
  Marketing: 'Marketing & Truyền thông',
  Warehouse: 'Quản lý Kho hàng',
  Staff: 'Nhân sự',
  Notifications: 'Thông báo Phê duyệt',
};

const SIDEBAR_LINKS: AppFrameLayoutLink[] = [
  { key: 'Today', label: 'Tổng quan', icon: Home },
  { key: 'Checklist', label: 'Quy trình', icon: CheckSquare },
  { key: 'Tasks', label: 'Công việc', icon: ListTodo },
  { key: 'KPI', label: 'KPI', icon: Award },
  { key: 'SOP', label: 'Cải tiến', icon: AlertTriangle },
  { key: 'Reports', label: 'Báo cáo', icon: BarChart4 },
  { key: 'Handbook', label: 'Sổ tay chuẩn', icon: BookMarked },
  { key: 'Marketing', label: 'Marketing', icon: Megaphone },
  { key: 'Warehouse', label: 'Kho', icon: Package },
  { key: 'Staff', label: 'Nhân sự', icon: Users },
];


function LoginFallback() {
  return <div className="min-h-screen bg-slate-50" />;
}

export default function AppShell() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;
  const activeTab = getTabFromPath(pathname);

  const currentUser = useAppStore((state) => state.currentUser);
  const handleLogin = useAppStore((state) => state.login);
  const clearSession = useAppStore((state) => state.logout);
  const extendSession = useAppStore((state) => state.extendSession);
  const syncSessionFromStorage = useAppStore((state) => state.syncSessionFromStorage);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const sessionExpiryHandledRef = useRef(false);
  const isOwner = isOwnerUser(currentUser);
  const { allowedModules, isLoading: isLoadingModules } = useAllowedModules(currentUser, isOwner);
  const snapshotTriggeredRef = useRef(false);

  const handleSelectTab = useCallback(
    (tab: TabType) => {
      void navigate({ to: TAB_ROUTE_MAP[tab] });
    },
    [navigate],
  );

  const handleLogout = useCallback(async ({ reason = 'manual' }: { reason?: 'manual' | 'expired' } = {}) => {
    if (reason === 'expired' && !sessionExpiryHandledRef.current) {
      sessionExpiryHandledRef.current = true;
      setSessionExpiredMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    try {
      const authModule = await import('../services/admin/internal-auth-service');
      await authModule.signOutInternalStaff();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const handleLogoutClick = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

  const handleOpenNotifications = useCallback(() => {
    handleSelectTab('Notifications');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [handleSelectTab]);

  const handleToggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);
  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Prefetch route chunk + data on sidebar hover to eliminate lazy-load delay
  const prefetchedRef = useRef<Set<TabType>>(new Set());
  const handlePrefetchTab = useCallback((tab: TabType) => {
    if (prefetchedRef.current.has(tab)) return;
    prefetchedRef.current.add(tab);
    // Trigger route chunk import
    const preloader = ROUTE_PRELOAD_MAP[tab];
    if (preloader) {
      void preloader();
    }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!currentUser) return;

    const handleActivity = () => {
      const expiresAt = useAppStore.getState().currentUser?.sessionExpiresAt ?? 0;
      if (expiresAt <= Date.now()) {
        void handleLogout({ reason: 'expired' });
        return;
      }

      extendSession();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [currentUser, extendSession, handleLogout]);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== SESSION_STORAGE_KEY) {
        return;
      }

      const hadSession = Boolean(useAppStore.getState().currentUser);
      syncSessionFromStorage();

      if (hadSession && !event.newValue) {
        sessionExpiryHandledRef.current = true;
        setSessionExpiredMessage('Phiên đăng nhập đã kết thúc ở tab khác. Vui lòng đăng nhập lại.');
      }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [syncSessionFromStorage]);

  useEffect(() => {
    const validateSessionOnForeground = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      const expiresAt = useAppStore.getState().currentUser?.sessionExpiresAt;
      if (typeof expiresAt === 'number' && expiresAt <= Date.now()) {
        void handleLogout({ reason: 'expired' });
      }
    };

    document.addEventListener('visibilitychange', validateSessionOnForeground);
    window.addEventListener('focus', validateSessionOnForeground);
    return () => {
      document.removeEventListener('visibilitychange', validateSessionOnForeground);
      window.removeEventListener('focus', validateSessionOnForeground);
    };
  }, [handleLogout]);

  useEffect(() => {
    if (!currentUser?.sessionExpiresAt) {
      return;
    }

    sessionExpiryHandledRef.current = false;
    const delayMs = currentUser.sessionExpiresAt - Date.now();
    if (delayMs <= 0) {
      void handleLogout({ reason: 'expired' });
      return;
    }

    const sessionTimer = window.setTimeout(() => {
      void handleLogout({ reason: 'expired' });
    }, delayMs);

    return () => window.clearTimeout(sessionTimer);
  }, [currentUser?.sessionExpiresAt, handleLogout]);

  useEffect(() => {
    if (!sessionExpiredMessage) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setSessionExpiredMessage(null);
    }, 3500);

    return () => window.clearTimeout(toastTimer);
  }, [sessionExpiredMessage]);

  // ── Background: Create daily checklist snapshots for ALL roles after login ──
  useEffect(() => {
    if (!currentUser || snapshotTriggeredRef.current) return;
    snapshotTriggeredRef.current = true;

    void ensureAllRoleDailySnapshots(DEFAULT_STORE_ID);
  }, [currentUser]);

  const allowedModuleSet = useMemo(() => new Set(allowedModules), [allowedModules]);

  const canViewTab = useCallback((tabKey: TabType) => {
    if (tabKey === 'Today') {
      return true;
    }

    if (isOwner) {
      return true;
    }

    const mappedModules = TAB_TO_MODULE_CODES[tabKey] ?? [];
    const canViewByModule = mappedModules.some((moduleCode) => allowedModuleSet.has(moduleCode));

    return canViewByModule;
  }, [allowedModuleSet, isOwner]);

  const visibleSidebarLinks = useMemo(
    () => SIDEBAR_LINKS.filter((link) => canViewTab(link.key)),
    [canViewTab],
  );

  useEffect(() => {
    if (!currentUser || isLoadingModules) {
      return;
    }

    if (!canViewTab(activeTab)) {
      const fallbackTab = visibleSidebarLinks[0]?.key ?? 'Today';
      if (fallbackTab !== activeTab) {
        handleSelectTab(fallbackTab);
      }
    }
  }, [activeTab, canViewTab, currentUser, handleSelectTab, isLoadingModules, visibleSidebarLinks]);

  const sessionExpiredToast = sessionExpiredMessage ? (
    <div className="fixed top-4 right-4 z-[110] pointer-events-none">
      <div className="max-w-[330px] bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 shadow-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11px] font-semibold leading-relaxed">{sessionExpiredMessage}</p>
      </div>
    </div>
  ) : null;

  if (!currentUser) {
    return (
      <>
        {sessionExpiredToast}
        <Suspense fallback={<LoginFallback />}>
          <LazyLoginView onLogin={handleLogin} />
        </Suspense>
      </>
    );
  }

  return (
    <>
      {sessionExpiredToast}
      <AppShellStateProvider>
        <AppFrameLayout
          activeTab={activeTab}
          visibleSidebarLinks={visibleSidebarLinks}
          currentUser={currentUser}
          mobileMenuOpen={mobileMenuOpen}
          canViewNotifications={canViewTab('Notifications')}
          desktopTitle={DESKTOP_TITLE_MAP[activeTab]}
          onSelectTab={handleSelectTab}
          onLogout={handleLogoutClick}
          onOpenNotifications={handleOpenNotifications}
          onToggleMobileMenu={handleToggleMobileMenu}
          onCloseMobileMenu={handleCloseMobileMenu}
          onPrefetchTab={handlePrefetchTab}
          headerRight={
            <>
              {canViewTab('Handbook') && (
                <button
                  className="px-3 py-1.5 bg-[#C21A1A]/5 border border-rose-100 text-[#C21A1A] hover:bg-[#C21A1A]/10 rounded-xl text-[10.5px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Hướng dẫn chuẩn SOP"
                  onClick={() => handleSelectTab('Handbook')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Trợ giúp &amp; HD SOP</span>
                </button>
              )}
              {canViewTab('Notifications') && (
                <NotificationsBellPopover activeTab={activeTab} onSelectTab={handleSelectTab} />
              )}
              <HeaderProfilePopover
                currentUser={currentUser}
                enrichSession={enrichSessionWithDefaultFields}
                onSaveProfile={handleLogin}
              />
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 hover:border-rose-200 cursor-pointer transition-all"
                title="Đăng xuất ca trực"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          }
        >
          <Outlet />
        </AppFrameLayout>
      </AppShellStateProvider>
    </>
  );
}
