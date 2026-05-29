/**
 * ERP sidebar menu data — specific to ERP app.
 * Types and width constants are imported from @shared/components/layout/parent-sidebar-constants.
 */

export {
  CHILD_SIDEBAR_WIDTH,
  getParentOnlySidebarWidth,
  getTotalSidebarWidth,
  PARENT_SIDEBAR_WIDTH_COLLAPSED,
  PARENT_SIDEBAR_WIDTH_EXPANDED,
} from '@shared/components/layout/parent-sidebar-constants';

export type {
  ParentSidebarMenuGroup,
  ParentSidebarMenuItemConfig,
} from '@shared/components/layout/parent-sidebar-constants';

import type { ParentSidebarMenuItemConfig } from '@shared/components/layout/parent-sidebar-constants';
import { LayoutDashboard } from 'lucide-react';

/** Menu chính (cấp 1) trong sidebar cha */
export const PARENT_SIDEBAR_MAIN_MENU_ITEMS: ParentSidebarMenuItemConfig[] = [
  {
    titleKey: 'dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    groups: [],
  },
];

export const PARENT_SIDEBAR_MANAGEMENT_ITEMS: ParentSidebarMenuItemConfig[] = [];
