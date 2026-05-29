/**
 * ERP AppSidebar — resource-driven two-column sidebar.
 * Data source: resources from auth store → normalizeLevelTreeResources → AppSidebar.
 */

import { Link, useRouterState } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  AppSidebar,
  type ChildMenuGroup,
  type TwoColumnLevel1Item,
} from '@shared/components/layout/app-sidebar';
import {
  normalizeLevelTreeResources,
  resolveSidebarIcon,
} from '@shared/components/layout/sidebar-level-tree';
import type { SidebarLevelNode } from '@shared/components/layout/sidebar-level-tree.types';
import type { MenuItemType } from '@shared/ui/sidebar';
import { useAuthStore } from '@/stores/auth-store';

function getResourceDefaultHref(node: SidebarLevelNode): string | undefined {
  if (node.children.length > 0) {
    for (const child of node.children) {
      const childHref = getResourceDefaultHref(child);
      if (childHref) return childHref;
    }
  }
  return node.href;
}

function resourceToMenuItems(nodes: SidebarLevelNode[], rootId: string): MenuItemType[] {
  return nodes.map((node) => {
    const hasExplicitIcon = !!node.icon?.trim();
    const isTextNode = node.type === 1;
    const Icon =
      isTextNode && !hasExplicitIcon
        ? undefined
        : resolveSidebarIcon(node.icon, 'var(--figma-teal-100)');

    return {
      title: node.name,
      href: getResourceDefaultHref(node),
      icon: Icon,
      collapsible: isTextNode ? false : undefined,
      isText: isTextNode,
      rootSelected: rootId,
      items: node.children.length > 0 ? resourceToMenuItems(node.children, rootId) : undefined,
      hrefIncludes: node.children
        .map((c) => getResourceDefaultHref(c))
        .filter((h): h is string => !!h),
    };
  });
}

function nodeToLevel1Item(node: SidebarLevelNode): TwoColumnLevel1Item {
  const hasExplicitIcon = !!node.icon?.trim();
  const isTextNode = node.type === 1;
  const Icon =
    isTextNode && !hasExplicitIcon
      ? undefined
      : resolveSidebarIcon(node.icon, 'var(--figma-teal-100)');

  return {
    id: node.id,
    name: node.name,
    icon: Icon,
    href: getResourceDefaultHref(node),
    hasChildren: node.children.length > 0,
  };
}

type ErpAppSidebarProps = {
  parentExpanded: boolean;
  onParentExpandedChange: (expanded: boolean) => void;
};

export function ErpAppSidebar({ parentExpanded, onParentExpandedChange }: ErpAppSidebarProps) {
  const resources = useAuthStore((state) => state.resources);
  const { location } = useRouterState();
  const pathname = location.pathname;

  const [selectedLevel1Id, setSelectedLevel1Id] = useState<string | null>(null);

  const level1Nodes = useMemo(() => {
    if (!resources || resources.length === 0) return [];
    const { roots } = normalizeLevelTreeResources(resources);
    return roots;
  }, [resources]);

  const allResourceMenuItems = useMemo(
    () =>
      level1Nodes.map(
        (root) =>
          ({
            title: root.name,
            rootSelected: root.id,
            items: resourceToMenuItems(root.children, root.id),
            href: getResourceDefaultHref(root),
          }) as MenuItemType,
      ),
    [level1Nodes],
  );

  useEffect(() => {
    if (level1Nodes.length === 0) {
      setSelectedLevel1Id(null);
      return;
    }

    const hasCurrentSelection =
      !!selectedLevel1Id && level1Nodes.some((node) => node.id === selectedLevel1Id);
    if (hasCurrentSelection) return;

    const activeRoot = allResourceMenuItems.find((item) =>
      item.href ? pathname.startsWith(item.href) : false,
    );
    setSelectedLevel1Id(activeRoot?.rootSelected ?? level1Nodes[0].id);
  }, [allResourceMenuItems, pathname, selectedLevel1Id, level1Nodes]);

  const activeResourceParentNode = useMemo(() => {
    if (!level1Nodes.length) return null;
    if (selectedLevel1Id) {
      const selectedNode = level1Nodes.find((node) => node.id === selectedLevel1Id);
      if (selectedNode) return selectedNode;
    }

    const activeRoot = allResourceMenuItems.find((item) =>
      item.href ? pathname.startsWith(item.href) : false,
    );
    return level1Nodes.find((node) => node.id === activeRoot?.rootSelected) ?? level1Nodes[0];
  }, [allResourceMenuItems, level1Nodes, pathname, selectedLevel1Id]);

  const resourceLevel1Items: TwoColumnLevel1Item[] = useMemo(
    () => level1Nodes.map(nodeToLevel1Item),
    [level1Nodes],
  );

  const resourceChildMenuGroups: ChildMenuGroup[] = useMemo(() => {
    if (!activeResourceParentNode || activeResourceParentNode.children.length === 0) return [];
    return [
      {
        items: resourceToMenuItems(activeResourceParentNode.children, activeResourceParentNode.id),
      },
    ];
  }, [activeResourceParentNode]);

  const headerContent = (
    <Link
      to="/dashboard"
      className={`flex size-10 items-center transition-opacity hover:opacity-80 ${parentExpanded ? 'w-full justify-start gap-2 px-3' : 'justify-center'}`}
    >
      <Building2 className="h-7 w-7 shrink-0 text-[var(--figma-background-base)]" />
      {parentExpanded && (
        <span className="truncate text-sm font-semibold text-[var(--figma-background-base)]">
          ERP
        </span>
      )}
    </Link>
  );

  return (
    <AppSidebar
      mode="two-column"
      header={headerContent}
      level1Items={resourceLevel1Items}
      activeLevel1Id={activeResourceParentNode?.id ?? null}
      onLevel1Select={setSelectedLevel1Id}
      childMenuGroups={resourceChildMenuGroups}
      activeParentName={activeResourceParentNode?.name}
      parentExpanded={parentExpanded}
      onParentExpandedChange={onParentExpandedChange}
      searchEnabled={true}
      searchPlaceholder="Tìm kiếm chức năng..."
    />
  );
}

export { ErpAppSidebar as AppSidebar };
