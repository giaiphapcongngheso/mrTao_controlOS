import { createRootRoute, createRoute, createRouter, createHashHistory, Outlet } from '@tanstack/react-router';
import AppShell from './AppShell';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AppShell,
});

const checklistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checklist',
  component: AppShell,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: AppShell,
});

const kpiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kpi',
  component: AppShell,
});

const sopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sop',
  component: AppShell,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: AppShell,
});

const handbookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/handbook',
  component: AppShell,
});

const marketingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/marketing',
  component: AppShell,
});

const warehouseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/warehouse',
  component: AppShell,
});

const staffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff',
  component: AppShell,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notifications',
  component: AppShell,
});

const routeTree = rootRoute.addChildren([
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
]);

const basepath = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  history: hashHistory,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

