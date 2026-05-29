/**
 * Unified AppSidebar component — handles both single-column and two-column layouts.
 *
 * Usage:
 *   <AppSidebar mode="single-column" header={...} items={...} />
 *   <AppSidebar mode="two-column" header={...} level1Items={...} ... />
 */

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import {
  type MenuItemType,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarNav,
  useSidebar,
} from '../../ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import {
  CHILD_SIDEBAR_WIDTH,
  PARENT_SIDEBAR_WIDTH_COLLAPSED,
  PARENT_SIDEBAR_WIDTH_EXPANDED,
} from './parent-sidebar-constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Level-1 node for two-column mode (icon rail on the left) */
export type TwoColumnLevel1Item = {
  id: string;
  name: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** If the level1 item itself is a link (no children) */
  href?: string;
  /** Whether this item has children (determines button vs link rendering) */
  hasChildren: boolean;
};

/** A child menu group rendered in the right column */
export type ChildMenuGroup = {
  /** Translation key or display label for the group */
  label?: string;
  items: MenuItemType[];
};

type BaseProps = {
  /** Logo/brand slot for the sidebar header */
  header: React.ReactNode;
  /** Optional footer slot */
  footer?: React.ReactNode;
  /** Dashboard / home href for the logo link */
  dashboardHref?: string;
};

type SingleColumnProps = BaseProps & {
  mode: 'single-column';
  /** All menu items (flat tree) */
  items: MenuItemType[];
  /** Enable Ctrl+K search on menu items */
  searchEnabled?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
};

type TwoColumnProps = BaseProps & {
  mode: 'two-column';
  /** Level-1 items shown in the left icon rail */
  level1Items: TwoColumnLevel1Item[];
  /** Currently active/selected level-1 item ID */
  activeLevel1Id: string | null;
  /** Callback when user clicks a level-1 item */
  onLevel1Select: (id: string) => void;
  /** Child menu groups shown in the right column */
  childMenuGroups: ChildMenuGroup[];
  /** Name of the active parent (shown as right column heading) */
  activeParentName?: string;
  /** Whether the left column is expanded (shows text) or collapsed (icon-only) */
  parentExpanded: boolean;
  /** Toggle left column expansion */
  onParentExpandedChange: (expanded: boolean) => void;
  /** Enable search in the right column (level 2) */
  searchEnabled?: boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
};

export type AppSidebarProps = SingleColumnProps | TwoColumnProps;

// ---------------------------------------------------------------------------
// Single-column helpers
// ---------------------------------------------------------------------------

function filterBySearch(items: MenuItemType[], query: string): MenuItemType[] {
  if (!query.trim()) return items;
  const normalizedQuery = query.toLowerCase().trim();

  return items
    .map((item) => {
      const titleMatches = item.title.toLowerCase().includes(normalizedQuery);

      if (item.items && item.items.length > 0) {
        const filteredChildren = filterBySearch(item.items, query);
        if (titleMatches || filteredChildren.length > 0) {
          return { ...item, items: filteredChildren.length > 0 ? filteredChildren : item.items };
        }
        return null;
      }

      return titleMatches ? item : null;
    })
    .filter((item): item is MenuItemType => item !== null);
}

// ---------------------------------------------------------------------------
// Single-column mode
// ---------------------------------------------------------------------------

function SingleColumnSidebar({
  items,
  searchEnabled,
  searchPlaceholder,
  header,
  footer,
}: SingleColumnProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = globalThis.window.setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => globalThis.window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('[data-sidebar="input"]');
        input?.focus();
      }
    };
    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [searchEnabled]);

  const displayItems = useMemo(() => {
    return filterBySearch(items, debouncedQuery);
  }, [items, debouncedQuery]);

  let content = null;
  if (displayItems.length > 0) {
    content = <SidebarNav items={displayItems} expandAll={!!debouncedQuery} />;
  } else if (searchQuery) {
    content = (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Không tìm thấy chức năng nào
      </div>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className={!searchEnabled ? 'mb-4' : ''}>
        {header}

        {searchEnabled && (
          <SidebarInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder || 'Tìm chức năng... (Ctrl+K)'}
            icon={<Search className="h-4 w-4" />}
            position="left"
          />
        )}
      </SidebarHeader>

      <SidebarContent>{content}</SidebarContent>

      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </Sidebar>
  );
}

// ---------------------------------------------------------------------------
// Two-column mode
// ---------------------------------------------------------------------------

function TwoColumnSidebar({
  level1Items,
  activeLevel1Id,
  onLevel1Select,
  childMenuGroups,
  activeParentName,
  parentExpanded,
  onParentExpandedChange,
  header,
  searchEnabled,
  searchPlaceholder,
}: TwoColumnProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = globalThis.window.setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => globalThis.window.clearTimeout(timer);
  }, [searchQuery]);

  // Reset search khi đổi level1
  useEffect(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, [activeLevel1Id]);

  const filteredChildMenuGroups = useMemo(() => {
    if (!searchEnabled || !debouncedQuery.trim()) return childMenuGroups;
    return childMenuGroups
      .map((group) => ({ ...group, items: filterBySearch(group.items, debouncedQuery) }))
      .filter((group) => group.items.length > 0);
  }, [childMenuGroups, debouncedQuery, searchEnabled]);
  const { open: childSidebarOpen, activeRootSelected } = useSidebar();

  const parentWidth = useMemo(
    () => (parentExpanded ? PARENT_SIDEBAR_WIDTH_EXPANDED : PARENT_SIDEBAR_WIDTH_COLLAPSED),
    [parentExpanded],
  );

  const hasChildItems = childMenuGroups.length > 0;
  const isChildSidebarVisible = childSidebarOpen && hasChildItems;
  const hasSearchResults = filteredChildMenuGroups.length > 0;

  const navItemClass =
    'flex cursor-pointer items-center gap-3 rounded-md text-[var(--figma-background-base)]/80 transition-colors ' +
    'hover:bg-white/10 hover:text-[var(--figma-background-base)] ' +
    'data-[status=partial]:bg-white/10 data-[status=partial]:text-[var(--figma-background-base)]/90 ' +
    'data-[status=active]:bg-white/20 data-[status=active]:text-[var(--figma-background-base)] data-[status=active]:font-semibold shadow-sm';

  const totalWidth = useMemo(() => {
    return isChildSidebarVisible
      ? `calc(${parentWidth}px + ${CHILD_SIDEBAR_WIDTH})`
      : `${parentWidth}px`;
  }, [parentWidth, isChildSidebarVisible]);

  return (
    <Sidebar collapsible="none" style={{ width: totalWidth } as React.CSSProperties}>
      <div className="flex min-h-0 w-full flex-1 flex-row">
        {/* Left column: level1 items */}
        <div
          className="flex flex-shrink-0 flex-col overflow-hidden bg-[var(--figma-background-base-invert)] transition-[width] duration-150 ease-out will-change-[width]"
          style={{ width: parentWidth }}
        >
          <SidebarHeader className="flex flex-col gap-2 p-2 px-3">{header}</SidebarHeader>
          <nav className="flex flex-1 flex-col gap-1 overflow-hidden p-2 px-3">
            {level1Items.map((node) => {
              const status =
                node.id === activeRootSelected
                  ? 'active'
                  : node.id === activeLevel1Id
                    ? 'partial'
                    : undefined;

              return (
                <Tooltip key={node.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    {node.hasChildren ? (
                      <button
                        type="button"
                        onClick={() => onLevel1Select(node.id)}
                        className={cn(
                          navItemClass,
                          'w-full',
                          parentExpanded ? 'min-h-10 px-3 py-2' : 'size-10 justify-center px-0',
                        )}
                        data-status={status}
                      >
                        {node.icon && <node.icon className="size-5 shrink-0" />}
                        {parentExpanded && (
                          <span className="truncate text-sm font-medium">{node.name}</span>
                        )}
                      </button>
                    ) : (
                      <Link
                        to={node.href ?? '#'}
                        onClick={() => onLevel1Select(node.id)}
                        className={cn(
                          navItemClass,
                          parentExpanded ? 'min-h-10 px-3 py-2' : 'size-10 justify-center px-0',
                        )}
                        data-status={status}
                      >
                        {node.icon && <node.icon className="size-5 shrink-0" />}
                        {parentExpanded && (
                          <span className="truncate text-sm font-medium">{node.name}</span>
                        )}
                      </Link>
                    )}
                  </TooltipTrigger>
                  {!parentExpanded && (
                    <TooltipContent side="right" sideOffset={8}>
                      {node.name}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
          <div className="flex w-full max-w-full flex-col gap-1 p-2">
            <button
              type="button"
              onClick={() => onParentExpandedChange(!parentExpanded)}
              className="flex min-h-10 w-full max-w-full cursor-pointer items-center justify-center rounded-md text-[var(--figma-background-base)]/80 transition-colors hover:bg-white/10 hover:text-[var(--figma-background-base)]"
              title={parentExpanded ? 'Thu gọn' : 'Mở rộng'}
              aria-label={parentExpanded ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
            >
              {parentExpanded ? (
                <ChevronLeft className="size-5 shrink-0" />
              ) : (
                <ChevronRight className="size-5 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Right column: children of active level1 */}
        {isChildSidebarVisible && (
          <div
            className="grid flex-shrink-0 bg-sidebar text-sidebar-foreground transition-[width,opacity] duration-150 ease-out will-change-[width,opacity] h-full"
            style={{ width: CHILD_SIDEBAR_WIDTH, gridTemplateRows: 'auto minmax(0, 1fr)' }}
          >
            <div className="flex flex-col pb-2">
              {activeParentName && (
                <div className="px-4 pt-5 pb-1 text-base font-semibold text-[var(--figma-foreground-base)]">
                  {activeParentName}
                </div>
              )}
              {searchEnabled && (
                <div className="px-3">
                  <SidebarInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder || 'Tìm chức năng...'}
                    icon={<Search className="h-4 w-4" />}
                    position="left"
                  />
                </div>
              )}
            </div>

            <SidebarContent className="pt-0">
              {hasSearchResults ? (
                filteredChildMenuGroups.map((group, idx) => (
                  <SidebarGroup key={group.label || idx}>
                    {group.label && (
                      <SidebarGroupLabel className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-primary">
                        {group.label}
                      </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                      <SidebarNav items={group.items} expandAll={!!debouncedQuery} />
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))
              ) : searchQuery ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Không tìm thấy chức năng nào
                </div>
              ) : null}
            </SidebarContent>
          </div>
        )}
      </div>
    </Sidebar>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function AppSidebar(props: AppSidebarProps) {
  if (props.mode === 'single-column') {
    return <SingleColumnSidebar {...props} />;
  }
  return <TwoColumnSidebar {...props} />;
}
