import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Home,
  CheckSquare,
  ListTodo,
  Award,
  AlertTriangle,
  BarChart4,
  BookMarked,
  Megaphone,
  Package,
  HelpCircle,
  LogOut,
  Users,
} from 'lucide-react';

// Type definitions
import { TabType } from '../types/app.types';
import { ChecklistItem } from '../types/checklist.types';
import { SOPIssue } from '../types/issues.types';
import { StaffRank } from '../types/kpi.types';
import { DailyReport } from '../types/reports.types';
import { TaskItem } from '../types/tasks.types';
import { KPIStats } from '../types/today.types';

// Initial Data
import {
  DEFAULT_STORE_ID,
  INITIAL_KPI_STATS,
  INITIAL_STAFF_RANKS,
  DAILY_REPORT_DATA
} from '../data';

// Components
import TodayView from './Today/TodayView';
import ChecklistContainer from './Checklist/checklist-container';
import TasksContainer from './Tasks/TasksContainer';
import KpiView from './Kpi/KpiView';
import IssuesContainer from './Issues/issues-container';
import ReportsView from './Reports/ReportsView';
import HandbookView from './Handbook/HandbookView';
import LoginView from './Login/LoginView';
import StaffPermissionsView from './StaffPermissions/StaffPermissionsView';
import NotificationsView, { NotificationsBellPopover } from './Notifications/NotificationsView';
import { MarketingView } from './marketing';
import { WarehouseView } from './warehouse';
import { enrichSessionWithDefaultFields } from '../shared/auth';
import { SESSION_STORAGE_KEY, useAppStore } from '../stores/app-store';
import { signOutInternalStaff } from '../services/admin/internal-auth-service';
import { MODULE_CODE } from '../constants/staff-permissions.constants';
import { isOwnerUser, useAllowedModules } from '../shared/hooks/use-module-permissions';
import AppFrameLayout, { type AppFrameLayoutLink } from './_components/AppFrameLayout';
import HeaderProfilePopover from './_components/HeaderProfilePopover';

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

export default function App() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const handleLogin = useAppStore((state) => state.login);
  const clearSession = useAppStore((state) => state.logout);
  const extendSession = useAppStore((state) => state.extendSession);
  const syncSessionFromStorage = useAppStore((state) => state.syncSessionFromStorage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const sessionExpiryHandledRef = useRef(false);
  const isOwner = isOwnerUser(currentUser);
  const { allowedModules } = useAllowedModules(currentUser, isOwner);

  const handleLogout = useCallback(async ({ reason = 'manual' }: { reason?: 'manual' | 'expired' } = {}) => {
    if (reason === 'expired' && !sessionExpiryHandledRef.current) {
      sessionExpiryHandledRef.current = true;
      setSessionExpiredMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    try {
      await signOutInternalStaff();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  // Lắng nghe tương tác của người dùng để gia hạn phiên đăng nhập
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
    setTabTransitioning(true);
    const timer = setTimeout(() => {
      setTabTransitioning(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [activeTab]);

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
  }, [currentUser?.sessionExpiresAt]);

  useEffect(() => {
    if (!sessionExpiredMessage) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setSessionExpiredMessage(null);
    }, 3500);

    return () => window.clearTimeout(toastTimer);
  }, [sessionExpiredMessage]);

  // ─── Allowed modules loaded via useAllowedModules hook ─────────────────────

  // Central React States
  const [stats, setStats] = useState<KPIStats>(INITIAL_KPI_STATS);
  const [todayChecklistItems, setTodayChecklistItems] = useState<ChecklistItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staffRanks, setStaffRanks] = useState<StaffRank[]>(INITIAL_STAFF_RANKS);
  const [issues, setIssues] = useState<SOPIssue[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport>(DAILY_REPORT_DATA);
  const activeStoreId = dailyReport.storeId || DEFAULT_STORE_ID;

  const handleChecklistMetricsChange = useCallback(({
    items,
    checklistCompletion,
  }: {
    items: ChecklistItem[];
    checklistCompletion: number;
  }) => {
    setTodayChecklistItems(items);
    setStats((prev) => {
      if (prev.checklistCompletion === checklistCompletion) {
        return prev;
      }
      return {
        ...prev,
        checklistCompletion,
      };
    });
  }, []);

  const handleTasksMetricsChange = useCallback(({
    tasks: nextTasks,
    delayedTasksCount,
  }: {
    tasks: TaskItem[];
    delayedTasksCount: number;
  }) => {
    setTasks(nextTasks);
    setStats((prev) => {
      if (prev.delayedTasksCount === delayedTasksCount) {
        return prev;
      }
      return {
        ...prev,
        delayedTasksCount,
      };
    });
  }, []);

  const handleIssuesMetricsChange = useCallback(({
    issues: nextIssues,
    sopErrorsCount,
  }: {
    issues: SOPIssue[];
    sopErrorsCount: number;
  }) => {
    setIssues(nextIssues);
    setStats((prev) => {
      if (prev.sopErrorsCount === sopErrorsCount) {
        return prev;
      }
      return {
        ...prev,
        sopErrorsCount,
      };
    });
  }, []);

  // --- COMPONENT MANDATED RENDER TRAGETS ---
  // The prompt explicitly requires writing these specific function names:

  /**
   * Màn hình 1: Hôm nay
   */
  function renderToday() {
    // Computes dynamic counts
    const completedChecklistsCount = todayChecklistItems.filter(it => it.isCompleted).length;
    const totalChecklistsCount = todayChecklistItems.length;

    return (
      <TodayView
        stats={stats}
        onSetTab={setActiveTab}
        completedChecklistsCount={completedChecklistsCount}
        totalChecklistsCount={totalChecklistsCount}
      />
    );
  }

  /**
   * Màn hình 2: Checklist & Quy trình
   */
  function renderChecklist() {
    return (
      <ChecklistContainer
        currentUser={currentUser!}
        isOwner={isOwner}
        activeStoreId={activeStoreId}
        onMetricsChange={handleChecklistMetricsChange}
      />
    );
  }

  /**
   * Màn hình 3: Giao việc
   */
  function renderTasks() {
    return (
      <TasksContainer
        activeStoreId={activeStoreId}
        onMetricsChange={handleTasksMetricsChange}
      />
    );
  }

  /**
   * Màn hình 4: KPI
   */
  function renderKpi() {
    return (
      <KpiView
        staffRanks={staffRanks}
        onSetTab={setActiveTab}
      />
    );
  }

  /**
   * Màn hình 5: Lỗi SOP & Cải tiến
   */
  function renderIssues() {
    return (
      <IssuesContainer
        currentUser={currentUser!}
        isOwner={isOwner}
        activeStoreId={activeStoreId}
        onMetricsChange={handleIssuesMetricsChange}
      />
    );
  }

  /**
   * Màn hình 6: Báo cáo
   */
  function renderReports() {
    return (
      <ReportsView
        dailyReport={dailyReport}
        stats={stats}
        checklistItems={todayChecklistItems}
        tasks={tasks}
        issues={issues}
        currentUser={currentUser}
      />
    );
  }

  /**
   * Màn hình 7: Sổ tay hệ thống
   */
  function renderHandbook() {
    return (
      <HandbookView />
    );
  }

  const renderSkeletonLoader = () => {
    return (
      <div className="space-y-4 animate-pulse text-left p-1 select-none">
        {/* Header Block skeleton */}
        <div className="bg-white h-20 rounded-2xl border border-slate-100 p-5 flex flex-col justify-center gap-2">
          <div className="h-4.5 bg-slate-200/70 rounded w-1/4"></div>
          <div className="h-3 bg-slate-200/50 rounded w-1/3"></div>
        </div>

        {/* Content Layout structure switcher skeleton */}
        {activeTab === 'Today' ? (
          <div className="space-y-4">
            <div className="h-28 bg-white rounded-2xl border border-slate-100"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-64 bg-white rounded-2xl border border-slate-100"></div>
              <div className="h-64 bg-white rounded-2xl border border-slate-100"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-12 bg-white rounded-xl border border-slate-100"></div>
            <div className="bg-white rounded-2xl border border-slate-100 h-80 flex flex-col p-5 gap-4 justify-between">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
              <div className="h-8 bg-slate-100 rounded-lg w-1/3"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Choose component content selector
  const renderActiveScreen = () => {
    if (tabTransitioning) {
      return renderSkeletonLoader();
    }
    switch (activeTab) {
      case 'Today': return renderToday();
      case 'Notifications': return <NotificationsView />;
      case 'Checklist': return renderChecklist();
      case 'Tasks': return renderTasks();
      case 'KPI': return renderKpi();
      case 'SOP': return renderIssues();
      case 'Reports': return renderReports();
      case 'Handbook': return renderHandbook();
      case 'Marketing': return <MarketingView />;
      case 'Warehouse': return <WarehouseView />;
      case 'Staff': return <StaffPermissionsView currentUser={currentUser ? { fullName: currentUser.fullName, role: currentUser.role, user: currentUser.username } : null} />;
      default: return renderToday();
    }
  };

  // UI lists of sidebar options
  const sidebarLinks: AppFrameLayoutLink[] = [
    { key: 'Today', label: 'Hôm nay', icon: Home },
    { key: 'Checklist', label: 'Checklist', icon: CheckSquare },
    { key: 'Tasks', label: 'Giao việc', icon: ListTodo },
    { key: 'KPI', label: 'KPI', icon: Award },
    { key: 'SOP', label: 'Lỗi SOP / Ngoại lệ', icon: AlertTriangle },
    { key: 'Reports', label: 'Báo cáo', icon: BarChart4 },
    { key: 'Handbook', label: 'Sổ tay chuẩn', icon: BookMarked },
    { key: 'Marketing', label: 'Marketing', icon: Megaphone },
    { key: 'Warehouse', label: 'Kho', icon: Package },
    { key: 'Staff', label: 'Tài khoản', icon: Users },
  ];

  const allowedModuleSet = new Set(allowedModules);

  const canViewTab = (tabKey: TabType) => {
    if (tabKey === 'Today') {
      return true;
    }

    const mappedModules = TAB_TO_MODULE_CODES[tabKey] ?? [];
    const canViewByModule = mappedModules.some((moduleCode) => allowedModuleSet.has(moduleCode));

    if (tabKey === 'Staff' || tabKey === 'Notifications') {
      return canViewByModule || isOwner;
    }

    return canViewByModule;
  };

  const visibleSidebarLinks = sidebarLinks.filter((link) => canViewTab(link.key as TabType));
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!canViewTab(activeTab)) {
      const fallbackTab = (visibleSidebarLinks[0]?.key as TabType | undefined) ?? 'Today';
      if (fallbackTab !== activeTab) {
        setActiveTab(fallbackTab);
      }
    }
  }, [activeTab, currentUser?.id, allowedModules.join('|'), isOwner]);

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
        <LoginView onLogin={handleLogin} />
      </>
    );
  }

  const desktopTitle =
    activeTab === 'Today' ? 'Tổng quan Hôm nay' :
      activeTab === 'Notifications' ? 'Thông báo Phê duyệt' :
        activeTab === 'Checklist' ? 'Hồ sơ Checklist ca trực' :
          activeTab === 'Tasks' ? 'Giao phó công việc' :
            activeTab === 'KPI' ? 'Chỉ số hiệu kỳ (KPI)' :
              activeTab === 'SOP' ? 'Ngoại lệ & Lỗi SOP' :
                activeTab === 'Reports' ? 'Báo cáo tổng kết ca' :
                  activeTab === 'Handbook' ? 'Sổ tay Vận hành chuẩn (SOP)' :
                    activeTab === 'Marketing' ? 'Marketing & Truyền thông' :
                      activeTab === 'Warehouse' ? 'Quản lý Kho hàng' :
                        activeTab === 'Staff' ? 'Phân quyền cộng tác viên' : 'Hệ thống';

  return (
    <>
      {sessionExpiredToast}
      <AppFrameLayout
        activeTab={activeTab}
        visibleSidebarLinks={visibleSidebarLinks}
        currentUser={currentUser}
        mobileMenuOpen={mobileMenuOpen}
        canViewNotifications={canViewTab('Notifications')}
        desktopTitle={desktopTitle}
        onSelectTab={setActiveTab}
        onLogout={() => {
          void handleLogout();
        }}
        onOpenNotifications={() => {
          setActiveTab('Notifications');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        headerRight={
          <>
            {canViewTab('Handbook') && (
              <button
                className="px-3 py-1.5 bg-[#C21A1A]/5 border border-rose-100 text-[#C21A1A] hover:bg-[#C21A1A]/10 rounded-xl text-[10.5px] font-black tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                title="Huong dan chuan SOP"
                onClick={() => setActiveTab('Handbook')}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Tro giup &amp; HD SOP</span>
              </button>
            )}
            {canViewTab('Notifications') && (
              <NotificationsBellPopover activeTab={activeTab} onSelectTab={setActiveTab} />
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
        {renderActiveScreen()}
      </AppFrameLayout>
    </>
  );
}
