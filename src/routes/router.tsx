import React, { Suspense } from 'react';
import { safeLazy as lazy } from '../shared/lib/lazy';
import { Navigate, createRootRoute, createRoute, createRouter, Outlet, createHashHistory } from '@tanstack/react-router';
import AppShell from './AppShell';

const LazyTodayRoute = lazy(() => import('./Today/today-route'));
const LazyChecklistRoute = lazy(() => import('./Checklist/checklist-route'));
const LazyTasksRoute = lazy(() => import('./Tasks/tasks-route'));
const LazyKpiRoute = lazy(() => import('./Kpi/kpi-route'));
const LazyIssuesRoute = lazy(() => import('./Issues/issues-route'));
const LazyReportsRoute = lazy(() => import('./Reports/reports-route'));
const LazyReportDetailRoute = lazy(() => import('./Reports/report-detail-route'));
const LazyHandbookView = lazy(() => import('./Handbook/HandbookView'));
const LazyMarketingView = lazy(() => import('./marketing/marketing-view'));
const LazyWarehouseView = lazy(() => import('./warehouse/warehouse-view'));
const LazyStaffRoute = lazy(() => import('./StaffPermissions/staff-route'));
const LazyPlansRoute = lazy(() => import('./Plans/index'));
const LazyPlanDetailRoute = lazy(() => import('./Plans/plan-detail-route'));
const LazyCustomersRoute = lazy(() => import('./Customers/customers-route'));
const LazyNotificationsView = lazy(() => import('./Notifications/NotificationsView'));

function RouteFallback() {
  return (
    <div className="space-y-4 animate-pulse text-left p-1 select-none">
      <div className="bg-white h-20 rounded-2xl border border-slate-100 p-5 flex flex-col justify-center gap-2">
        <div className="h-4.5 bg-slate-200/70 rounded w-1/4" />
        <div className="h-3 bg-slate-200/50 rounded w-1/3" />
      </div>
      <div className="space-y-4">
        <div className="h-12 bg-white rounded-xl border border-slate-100" />
        <div className="bg-white rounded-2xl border border-slate-100 h-80 flex flex-col p-5 gap-4 justify-between">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-lg" />
            ))}
          </div>
          <div className="h-8 bg-slate-100 rounded-lg w-1/3" />
        </div>
      </div>
    </div>
  );
}

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function RouteComponent() {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Component />
      </Suspense>
    );
  };
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => <Navigate to="/today" replace />,
});

const todayRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'today',
  component: withSuspense(LazyTodayRoute),
});

const checklistRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'checklist',
  component: withSuspense(LazyChecklistRoute),
});

const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'tasks',
  component: withSuspense(LazyTasksRoute),
});

const kpiRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'kpi',
  component: withSuspense(LazyKpiRoute),
});

const sopRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'sop',
  component: withSuspense(LazyIssuesRoute),
});

const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'reports',
  component: withSuspense(LazyReportsRoute),
});

const reportDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'reports/$reportId',
  component: withSuspense(LazyReportDetailRoute),
});

const handbookRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'handbook',
  component: withSuspense(LazyHandbookView),
});

const marketingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'marketing',
  component: withSuspense(LazyMarketingView),
});

const warehouseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'warehouse',
  component: withSuspense(LazyWarehouseView),
});

const staffRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'staff',
  component: withSuspense(LazyStaffRoute),
});

const plansRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'plans',
  component: withSuspense(LazyPlansRoute),
});

const planDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'plans/$planId',
  component: withSuspense(LazyPlanDetailRoute),
});

const customersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'customers',
  component: withSuspense(LazyCustomersRoute),
});

const notificationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'notifications',
  component: withSuspense(LazyNotificationsView),
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    todayRoute,
    checklistRoute,
    tasksRoute,
    kpiRoute,
    sopRoute,
    reportsRoute,
    reportDetailRoute,
    handbookRoute,
    marketingRoute,
    warehouseRoute,
    staffRoute,
    plansRoute,
    planDetailRoute,
    customersRoute,
    notificationsRoute,
  ]),
]);

const basepath = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

// const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  basepath,
  // history: hashHistory,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
