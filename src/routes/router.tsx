import React, { Suspense, lazy } from 'react';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import AppShell from './AppShell';

const LazyTodayRoute = lazy(() => import('./Today/today-route'));
const LazyChecklistRoute = lazy(() => import('./Checklist/checklist-route'));
const LazyTasksRoute = lazy(() => import('./Tasks/tasks-route'));
const LazyKpiRoute = lazy(() => import('./Kpi/kpi-route'));
const LazyIssuesRoute = lazy(() => import('./Issues/issues-route'));
const LazyReportsRoute = lazy(() => import('./Reports/reports-route'));
const LazyHandbookView = lazy(() => import('./Handbook/HandbookView'));
const LazyMarketingView = lazy(() => import('./marketing/marketing-view'));
const LazyWarehouseView = lazy(() => import('./warehouse/warehouse-view'));
const LazyStaffRoute = lazy(() => import('./StaffPermissions/staff-route'));
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

const notificationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'notifications',
  component: withSuspense(LazyNotificationsView),
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    checklistRoute,
    tasksRoute,
    kpiRoute,
    sopRoute,
    reportsRoute,
    handbookRoute,
    marketingRoute,
    warehouseRoute,
    staffRoute,
    notificationsRoute,
  ]),
]);

const basepath = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createRouter({
  routeTree,
  basepath,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
