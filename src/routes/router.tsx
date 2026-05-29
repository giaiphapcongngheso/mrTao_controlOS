import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import AppShell from './AppShell';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AppShell,
});

const routeTree = rootRoute.addChildren([indexRoute]);

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
