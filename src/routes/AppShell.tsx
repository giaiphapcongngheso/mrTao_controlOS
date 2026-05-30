import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Home,
  CheckSquare,
  ListTodo,
  Award,
  AlertTriangle,
  BarChart4,
  BookMarked,
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
  INITIAL_TASKS,
  INITIAL_STAFF_RANKS,
  DAILY_REPORT_DATA
} from '../data';

// Components
import TodayView from './Today/TodayView';
import ChecklistContainer from './Checklist/ChecklistContainer';
import TasksView from './Tasks/TasksView';
import KpiView from './Kpi/KpiView';
import IssuesContainer from './Issues/IssuesContainer';
import ReportsView from './Reports/ReportsView';
import HandbookView from './Handbook/HandbookView';
import LoginView from './Login/LoginView';
import StaffPermissionsView from './StaffPermissions/StaffPermissionsView';
import NotificationsView, { NotificationsBellPopover } from './Notifications/NotificationsView';
import { useAppStore } from '../stores/app-store';
import { signOutInternalStaff } from '../services/admin/internal-auth-service';
import { MODULE_CODE } from '../constants/staff-permissions.constants';
import { isOwnerUser, useAllowedModules } from '../shared/hooks/use-module-permissions';
import AppFrameLayout, { type AppFrameLayoutLink } from './_components/AppFrameLayout';
import HeaderProfilePopover from './_components/HeaderProfilePopover';


export interface UserSession {
  username: string;
  fullName: string;
  role: string;
  roleCode?: string;
  avatar?: string;
  id?: string;
  employeeCode?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  statusLabel?: string;
}

export function enrichSessionWithDefaultFields(user: any): UserSession {
  if (!user) {
    return {
      username: 'sales',
      fullName: 'Nguyễn Văn A',
      role: 'Nhân viên bán lẻ',
      id: 'NV-002',
      employeeCode: 'MNS-002',
      phone: '0987654321',
      email: 'sales@mrtaocoop.com',
      department: 'Phòng Kinh Doanh',
      position: 'Quầy Bán Lẻ Hàng Hóa',
      statusLabel: 'Đang hoạt động',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
    };
  }
  const username = user.username || 'admin';
  const fullName = user.fullName || (username === 'admin' ? 'Nguyễn Minh Đức' : username === 'sales' ? 'Nguyễn Văn A' : username === 'tech' ? 'Trần Thị B' : 'Lê Hoàng C');
  const role = user.role || (username === 'admin' ? 'Chủ cửa hàng' : username === 'sales' ? 'Nhân viên bán lẻ' : username === 'tech' ? 'Kỹ thuật viên' : 'Quản lý cửa hàng');

  return {
    username,
    fullName,
    role,
    avatar: user.avatar || (username === 'admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      : username === 'sales'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
    id: user.id || (username === 'admin' ? 'NV-001' : username === 'sales' ? 'NV-002' : username === 'tech' ? 'NV-003' : 'NV-005'),
    employeeCode: user.employeeCode || user.maNhanSu || (username === 'admin' ? 'MNS-001' : username === 'sales' ? 'MNS-002' : username === 'tech' ? 'MNS-003' : 'MNS-005'),
    phone: user.phone || (username === 'admin' ? '0912345678' : username === 'sales' ? '0987654321' : username === 'tech' ? '0901238899' : '0944556677'),
    email: user.email || (username === 'admin' ? 'duc.nm@mrtaocoop.com' : username === 'sales' ? 'sales@mrtaocoop.com' : username === 'tech' ? 'tech@mrtaocoop.com' : 'manager@mrtaocoop.com'),
    department: user.department || user.boPhan || (username === 'admin' ? 'Ban Điều Hành' : username === 'sales' ? 'Phòng Kinh Doanh' : username === 'tech' ? 'Ban Kỹ Thuật' : 'Ban Quản Lý'),
    position: user.position || user.viTri || (username === 'admin' ? 'Quầy Trưởng Showroom' : username === 'sales' ? 'Quầy Bán Lẻ Hàng Hóa' : username === 'tech' ? 'Bàn Sửa Chữa & Thẩm Định' : 'Phòng Làm Việc'),
    statusLabel: user.statusLabel || user.trangThai || 'Đang hoạt động'
  };
}

const TAB_TO_MODULE_CODES: Record<TabType, string[]> = {
  Today: [MODULE_CODE.HOM_NAY],
  Checklist: [MODULE_CODE.CHECKLIST],
  Tasks: [MODULE_CODE.GIAO_VIEC],
  KPI: [MODULE_CODE.KPI],
  SOP: [MODULE_CODE.LOI_SOP],
  Reports: [MODULE_CODE.BAO_CAO],
  Handbook: [MODULE_CODE.SO_TAY],
  Staff: ['STAFF', 'TAI_KHOAN', 'NHAN_SU', 'STAFF_PERMISSIONS'],
  Notifications: ['THONG_BAO', 'NOTIFICATIONS', 'PHE_DUYET'],
};

export default function App() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const handleLogin = useAppStore((state) => state.login);
  const clearSession = useAppStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const sessionExpiryHandledRef = useRef(false);
  const isOwner = isOwnerUser(currentUser);
  const { allowedModules } = useAllowedModules(currentUser, isOwner);

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
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [staffRanks, setStaffRanks] = useState<StaffRank[]>(INITIAL_STAFF_RANKS);
  const [issues, setIssues] = useState<SOPIssue[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport>(DAILY_REPORT_DATA);
  const activeStoreId = dailyReport.storeId || DEFAULT_STORE_ID;

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

  // Add Task handler
  const handleAddTask = useCallback((taskParam: Omit<TaskItem, 'id' | 'storeId'>) => {
    const newTask: TaskItem = {
      ...taskParam,
      storeId: activeStoreId,
      id: `task-${Date.now()}`
    };
    setTasks((prevTasks) => [newTask, ...prevTasks]);

    // Update KPIStats counts
    setStats(prev => ({
      ...prev,
      delayedTasksCount: taskParam.status !== 'completed' && taskParam.deadline.includes('08/05')
        ? prev.delayedTasksCount + 1
        : prev.delayedTasksCount
    }));
  }, [activeStoreId]);

  // Update Task Status
  const handleUpdateTaskStatus = useCallback((taskId: string, status: TaskItem['status']) => {
    setTasks((prevTasks) => {
      const previousTask = prevTasks.find(t => t.id === taskId);
      const updatedTasks = prevTasks.map(t => {
        if (t.id === taskId) {
          return { ...t, status };
        }
        return t;
      });

      // Re-calculate stats delayed count
      let changeLate = 0;
      if (previousTask) {
        const isLateDeadline = previousTask.deadline.includes('08/05') || previousTask.deadline.includes('Trễ');
        if (isLateDeadline) {
          if (status === 'completed' && previousTask.status !== 'completed') {
            changeLate = -1;
          } else if (status !== 'completed' && previousTask.status === 'completed') {
            changeLate = 1;
          }
        }
      }

      setStats(prev => ({
        ...prev,
        delayedTasksCount: Math.max(0, prev.delayedTasksCount + changeLate)
      }));

      return updatedTasks;
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
      <TasksView
        tasks={tasks}
        onAddTask={handleAddTask}
        onUpdateTaskStatus={handleUpdateTaskStatus}
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
