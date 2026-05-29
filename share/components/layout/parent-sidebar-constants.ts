/**
 * Shared 2-column sidebar layout constants and types.
 *
 * Menu DATA arrays (PARENT_SIDEBAR_MAIN_MENU_ITEMS etc.) stay per-app.
 * Only the types and width constants live here.
 */

import type { LucideIcon } from 'lucide-react';

/** Width sidebar cha khi thu gọn (chỉ icon), px */
export const PARENT_SIDEBAR_WIDTH_COLLAPSED = 66;

/** Width sidebar cha khi mở rộng (icon + text), px */
export const PARENT_SIDEBAR_WIDTH_EXPANDED = 262;

/** Width sidebar con (cột menu chi tiết), dùng trong calc() */
export const CHILD_SIDEBAR_WIDTH = '16rem';

/** Tổng width sidebar = cấp cha + cấp con (dùng cho --sidebar-width) */
export function getTotalSidebarWidth(parentExpanded: boolean): string {
  const parentWidth = parentExpanded
    ? PARENT_SIDEBAR_WIDTH_EXPANDED
    : PARENT_SIDEBAR_WIDTH_COLLAPSED;
  return `calc(${parentWidth}px + ${CHILD_SIDEBAR_WIDTH})`;
}

/** Chỉ width cấp cha (khi ẩn sidebar con), px */
export function getParentOnlySidebarWidth(parentExpanded: boolean): string {
  const parentWidth = parentExpanded
    ? PARENT_SIDEBAR_WIDTH_EXPANDED
    : PARENT_SIDEBAR_WIDTH_COLLAPSED;
  return `${parentWidth}px`;
}

// --- Types ---

/** Một nhóm menu trong sidebar con (vd: Menu chính, Cấu hình) */
export type ParentSidebarMenuGroup = {
  /** Key dịch cho tên nhóm (vd: mainMenu, configuration) */
  titleKey: string;
  items: ParentSidebarMenuItemConfig[];
};

/** Item menu sidebar cha: dùng titleKey (i18n appSidebar), href, icon, permission, items/groups con */
export type ParentSidebarMenuItemConfig = {
  /** Key dịch trong namespace appSidebar */
  titleKey: string;
  href?: string;
  icon: LucideIcon;
  permission?: string;
  /** Optional badge identifier for dynamic badge resolution */
  badgeId?: string;
  /**
   * Menu hiển thị ở sidebar con khi chọn item cha này.
   * Nếu dùng `groups`: chia thành từng nhóm (Menu chính, Cấu hình). Nếu dùng `items`: hiện một danh sách phẳng.
   */
  groups?: ParentSidebarMenuGroup[];
  /** @deprecated Dùng groups thay thế. Danh sách item con (khi không dùng groups). */
  items?: ParentSidebarMenuItemConfig[];
};
