/**
 * Normalize + 2-column view-model builder for level-driven sidebar.
 *
 * Key guarantees:
 *  - Duplicate id detection (first entry wins, rest are warned and dropped)
 *  - Orphan parent detection (node with missing parent becomes root)
 *  - Invalid level recomputation (level <= 0 or NaN → computed by tree depth)
 *  - Cycle detection via DFS color-map (cycle-causing edge is cut, warning emitted)
 *  - URL sanitization that avoids breaking TanStack Router paths
 *  - Stable sort by level → displayOrder → code
 */

import { icons, FileText, type LucideIcon } from 'lucide-react';
import { createElement, forwardRef } from 'react';
import type { IAuthSidebarResource } from '../../types';
import type { SidebarLevelNode, SidebarTwoColumnModel } from './sidebar-level-tree.types';
import { isCGIcon, resolveCGIcon } from '../cg-icons';

// ---------------------------------------------------------------------------
// Icon resolution
// ---------------------------------------------------------------------------

const _iconCache = new Map<string, LucideIcon>();

/** Default props applied to CG icons when resolved for the sidebar. */
const CG_ICON_DEFAULTS = (secondColor?: string) => ({
  mainColor: 'var(--primary)',
  secondColor: secondColor,
  style: { width: 24, height: 24 },
});

/**
 * Wrap a CG icon component with default sidebar color props.
 */
function withCGDefaults(Component: LucideIcon, secondColor?: string): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, Record<string, unknown>>((props, ref) =>
    createElement(Component, { ...CG_ICON_DEFAULTS(secondColor), ...props, ref }),
  );
  Wrapped.displayName = `CG(${(Component as { displayName?: string }).displayName ?? 'Icon'})`;
  return Wrapped as unknown as LucideIcon;
}

/**
 * Resolve a dynamic icon by name.
 *
 * Resolution order:
 *  1. If iconName starts with "CG" → look up in CG custom icon registry
 *  2. Otherwise → resolve from lucide-react icons (PascalCase, strip "Icon" suffix)
 *  3. Falls back to FileText when icon is absent or unknown.
 */
export const resolveSidebarIcon = (iconName?: string | null, secondColor?: string): LucideIcon => {
  if (!iconName) return FileText;

  if (_iconCache.has(iconName)) {
    return _iconCache.get(iconName)!;
  }

  const clean = iconName.trim();

  // --- CG custom icon resolution ---
  if (isCGIcon(clean)) {
    const cgIcon = resolveCGIcon(clean);
    if (cgIcon) {
      const wrapped = withCGDefaults(cgIcon, secondColor);
      _iconCache.set(iconName, wrapped);
      return wrapped;
    }
    console.warn(
      `[Sidebar] CG icon "${iconName}" not found in registry. Falling back to FileText.`,
    );
    _iconCache.set(iconName, FileText);
    return FileText;
  }

  // --- Lucide icon resolution ---
  let lucideName = clean;
  if (lucideName.toLowerCase().endsWith('icon')) {
    lucideName = lucideName.slice(0, -4).trim();
  }
  const pascal = lucideName.charAt(0).toUpperCase() + lucideName.slice(1);

  const resolved = (icons as Record<string, LucideIcon | undefined>)[pascal];
  if (resolved) {
    _iconCache.set(iconName, resolved);
    return resolved;
  }

  console.warn(
    `[Sidebar] Icon "${iconName}" (resolved as "${pascal}") not found in lucide-react. Falling back to FileText.`,
  );
  _iconCache.set(iconName, FileText);
  return FileText;
};

// ---------------------------------------------------------------------------
// URL sanitization
// ---------------------------------------------------------------------------

function sanitizeHref(url: string | undefined): { href: string | undefined; warning?: string } {
  if (!url || url.trim() === '') {
    return { href: undefined };
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('/')) {
    return { href: trimmed };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname;
      if (!pathname || pathname === '/') {
        return {
          href: pathname || '/',
          warning: `[Sidebar][Normalize] Resolved absolute URL to pathname: ${trimmed} -> ${pathname || '/'}`,
        };
      }
      return { href: pathname };
    } catch {
      return {
        href: undefined,
        warning: `[Sidebar][Normalize] Invalid URL, href skipped: ${trimmed}`,
      };
    }
  }

  // Non-empty, doesn't start with '/' and isn't http/https → prepend '/'
  return { href: `/${trimmed}` };
}

// ---------------------------------------------------------------------------
// Internal tree-node builder
// ---------------------------------------------------------------------------

type RawNode = {
  resource: IAuthSidebarResource;
  children: RawNode[];
};

// ---------------------------------------------------------------------------
// DFS cycle detection
// ---------------------------------------------------------------------------

type Color = 'white' | 'gray' | 'black';

function detectAndCutCycles(
  nodeMap: Map<string, RawNode>,
  roots: RawNode[],
  warnings: string[],
): void {
  const color = new Map<string, Color>();
  for (const id of nodeMap.keys()) {
    color.set(id, 'white');
  }

  const visit = (node: RawNode): void => {
    const id = node.resource.id;
    color.set(id, 'gray');

    node.children = node.children.filter((child) => {
      const childId = child.resource.id;
      const childColor = color.get(childId) ?? 'white';
      if (childColor === 'gray') {
        warnings.push(`[Sidebar][Normalize] Cycle detected: cutting edge ${id} -> ${childId}`);
        return false;
      }
      if (childColor === 'white') {
        visit(child);
      }
      return true;
    });

    color.set(id, 'black');
  };

  for (const root of roots) {
    if ((color.get(root.resource.id) ?? 'white') === 'white') {
      visit(root);
    }
  }
}

// ---------------------------------------------------------------------------
// Recompute level by depth (for nodes with invalid level)
// ---------------------------------------------------------------------------

function recomputeInvalidLevels(roots: RawNode[], warnings: string[]): void {
  const fix = (nodes: RawNode[], depth: number): void => {
    for (const node of nodes) {
      const raw = node.resource.level;
      if (raw == null || !Number.isFinite(raw) || raw <= 0) {
        warnings.push(
          `[Sidebar][Normalize] Invalid level for resource ${node.resource.id} (level=${raw}), recomputed to ${depth}`,
        );
        (node.resource as IAuthSidebarResource & { level: number }).level = depth;
      }
      fix(node.children, depth + 1);
    }
  };
  fix(roots, 1);
}

// ---------------------------------------------------------------------------
// Stable sort: by level → displayOrder → code
// ---------------------------------------------------------------------------

function stableSortRecursive(nodes: RawNode[]): void {
  nodes.sort((a, b) => {
    const la = a.resource.level ?? 0;
    const lb = b.resource.level ?? 0;
    if (la !== lb) return la - lb;

    const oa = a.resource.displayOrder ?? 9999;
    const ob = b.resource.displayOrder ?? 9999;
    if (oa !== ob) return oa - ob;

    return (a.resource.code ?? '').localeCompare(b.resource.code ?? '');
  });
  for (const node of nodes) {
    stableSortRecursive(node.children);
  }
}

// ---------------------------------------------------------------------------
// Conversion: RawNode tree → SidebarLevelNode tree
// ---------------------------------------------------------------------------

function toSidebarLevelNode(node: RawNode, warnings: string[]): SidebarLevelNode {
  const { href, warning } = sanitizeHref(node.resource.url);
  if (warning) {
    warnings.push(warning);
  }

  return {
    id: node.resource.id,
    code: node.resource.code,
    name: node.resource.name,
    type: node.resource.type,
    icon: node.resource.icon,
    href,
    level: node.resource.level ?? 1,
    parentId: node.resource.parentId ?? node.resource.parent?.id,
    children: node.children.map((c) => toSidebarLevelNode(c, warnings)),
  };
}

// ---------------------------------------------------------------------------
// Public API: normalizeLevelTreeResources
// ---------------------------------------------------------------------------

/**
 * Normalize an array of IAuthSidebarResource into a tree of SidebarLevelNode.
 *
 * Handles:
 *  - Duplicate ids (first entry wins; subsequent entries are warned and dropped)
 *  - Orphan parents (node with unknown parentId becomes a root)
 *  - Invalid levels (level <= 0 or NaN → recomputed from tree depth)
 *  - Cycles (DFS gray-coloring; cycle-causing edges are cut with warning)
 *
 * @returns Roots of the normalized tree plus accumulated warnings.
 */
export function normalizeLevelTreeResources(resources: IAuthSidebarResource[]): {
  roots: SidebarLevelNode[];
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!resources || resources.length === 0) {
    return { roots: [], warnings };
  }

  // Step 1: Deduplicate by id (keep first, warn on subsequent)
  const seen = new Set<string>();
  const deduped: IAuthSidebarResource[] = [];
  for (const r of resources) {
    if (seen.has(r.id)) {
      warnings.push(
        `[Sidebar][Normalize] Duplicate resource id "${r.id}" (code="${r.code}") — skipped`,
      );
      continue;
    }
    seen.add(r.id);
    deduped.push(r);
  }

  // Step 2: Build id → RawNode map
  const nodeMap = new Map<string, RawNode>();
  for (const r of deduped) {
    nodeMap.set(r.id, { resource: r, children: [] });
  }

  // Step 3: Wire parent-child relationships; orphans become roots
  const roots: RawNode[] = [];
  for (const node of nodeMap.values()) {
    const parentId = node.resource.parentId ?? node.resource.parent?.id;
    if (!parentId || !nodeMap.has(parentId)) {
      if (parentId && !nodeMap.has(parentId)) {
        warnings.push(
          `[Sidebar][Normalize] Orphan parent: resource "${node.resource.id}" references missing parentId "${parentId}" — promoted to root`,
        );
      }
      roots.push(node);
    } else {
      nodeMap.get(parentId)!.children.push(node);
    }
  }

  // Step 4: Cycle detection (DFS color-map); cut cycle-causing edges
  detectAndCutCycles(nodeMap, roots, warnings);

  // Step 5: Recompute invalid levels from tree depth
  recomputeInvalidLevels(roots, warnings);

  // Step 6: Stable sort by level → displayOrder → code
  stableSortRecursive(roots);

  // Step 7: Convert to SidebarLevelNode
  const result = roots.map((r) => toSidebarLevelNode(r, warnings));

  return { roots: result, warnings };
}

// ---------------------------------------------------------------------------
// Helper: check if any descendant has an active href
// ---------------------------------------------------------------------------

function hasActiveDescendant(node: SidebarLevelNode, pathname: string): boolean {
  if (node.href) {
    if (pathname === node.href) return true;
    if (pathname.startsWith(node.href + '/')) return true;
  }
  return node.children.some((c) => hasActiveDescendant(c, pathname));
}

// ---------------------------------------------------------------------------
// Public API: buildTwoColumnSidebarModel
// ---------------------------------------------------------------------------

/**
 * Build the 2-column view-model for AppSidebar from raw resources.
 *
 * Left column  → level1 (roots after normalization)
 * Right column → rightTree (full child tree of the selected level1 node)
 *
 * selectedLevel1Id preference:
 *  1. Root whose subtree contains an active path matching `pathname`
 *  2. preferredLevel1Id (if still valid after normalization)
 *  3. First root
 */
export function buildTwoColumnSidebarModel(args: {
  resources: IAuthSidebarResource[];
  pathname: string;
  preferredLevel1Id?: string | null;
}): SidebarTwoColumnModel {
  const { resources, pathname, preferredLevel1Id } = args;

  const { roots, warnings } = normalizeLevelTreeResources(resources);

  if (roots.length === 0) {
    return {
      level1: [],
      rightTree: [],
      selectedLevel1Id: null,
      isActiveSelection: false,
      warnings,
    };
  }

  // Determine selected level1 root
  let selected: SidebarLevelNode | null = null;
  let isActiveSelection = false;

  // Priority 1: root with active descendant → real selection
  for (const root of roots) {
    if (hasActiveDescendant(root, pathname)) {
      selected = root;
      isActiveSelection = true;
      break;
    }
  }

  // Priority 2: preferredLevel1Id (user preference — not path-driven)
  if (!selected && preferredLevel1Id) {
    selected = roots.find((r) => r.id === preferredLevel1Id) ?? null;
  }

  // Priority 3: first root (fallback — right column should stay hidden)
  if (!selected) {
    selected = roots[0];
  }

  return {
    level1: roots,
    rightTree: selected?.children ?? [],
    selectedLevel1Id: selected?.id ?? null,
    isActiveSelection,
    warnings,
  };
}
