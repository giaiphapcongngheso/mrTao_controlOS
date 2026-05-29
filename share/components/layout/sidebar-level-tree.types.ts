/**
 * Types for the level-driven 2-column sidebar model.
 *
 * SidebarLevelNode: normalized node from IAuthSidebarResource.
 * SidebarTwoColumnModel: 2-column view-model for AppSidebar rendering.
 */

export type SidebarLevelNode = {
  id: string;
  code: string;
  name: string;
  type: number;
  icon?: string;
  /** Sanitized URL from resource.url — undefined if url absent or invalid */
  href?: string;
  level: number;
  parentId?: string;
  children: SidebarLevelNode[];
};

export type SidebarTwoColumnModel = {
  /** Level 1 roots — rendered as icon column on the left */
  level1: SidebarLevelNode[];
  /** Full child tree of the selected level1 root — rendered via SidebarNav on the right */
  rightTree: SidebarLevelNode[];
  /** ID of the currently selected level1 root (active or first) */
  selectedLevel1Id: string | null;
  /**
   * true  = selected because pathname is active inside this root's subtree (real selection)
   * false = fallback selection (preferredLevel1Id or first root) — right column should be hidden
   */
  isActiveSelection: boolean;
  /** Accumulated normalization warnings */
  warnings: string[];
};
