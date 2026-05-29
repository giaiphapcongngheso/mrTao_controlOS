import { useState } from 'react';
import {
  getParentOnlySidebarWidth,
  getTotalSidebarWidth,
} from '@shared/components/layout/parent-sidebar-constants';
import { SidebarProvider } from '@shared/ui/sidebar';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [parentSidebarExpanded, setParentSidebarExpanded] = useState(false);
  const [childSidebarOpen, setChildSidebarOpen] = useState(true);
  const totalSidebarWidth = childSidebarOpen
    ? getTotalSidebarWidth(parentSidebarExpanded)
    : getParentOnlySidebarWidth(parentSidebarExpanded);

  return (
    <SidebarProvider
      open={childSidebarOpen}
      onOpenChange={setChildSidebarOpen}
      className="h-full transition-[--sidebar-width] duration-150 ease-out will-change-[--sidebar-width]"
      style={{ '--sidebar-width': totalSidebarWidth } as React.CSSProperties}
    >
      <div className="flex h-full w-full overflow-hidden">
        <AppSidebar
          parentExpanded={parentSidebarExpanded}
          onParentExpandedChange={setParentSidebarExpanded}
        />
        <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <AppHeader />

          <div className="p-5 flex-1 min-h-0 overflow-y-auto bg-[#F5F5F5] dark:bg-[#F5F5F5]/5">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
