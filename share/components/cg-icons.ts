/**
 * Registry for custom CG (CoGain) icon components.
 *
 * All custom SVG icons created for the project should be registered here.
 * Icon names must start with "CG" prefix (e.g. "CGFactory", "CGWarehouse").
 *
 * Usage:
 *   - In the resource/menu config, set icon name with CG prefix: "CGFactory"
 *   - The `resolveSidebarIcon` function will automatically pick up the
 *     correct component from this registry.
 *
 * To add a new CG icon:
 *   1. Create the icon component (e.g. `cg-my-icon.tsx`)
 *   2. Import it here
 *   3. Add to the `cgIconRegistry` map below
 */

import type { ComponentType, SVGProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CGFactoryIcon } from './icons/cg-factory-icon';
import { CGLogisticsIcon } from './icons/cg-logistics-icon';
import { CGMaintenanceIcon } from './icons/cg-maintenance-icon';
import { CGInstallationIcon } from './icons/cg-installation-icon';
import { CGWarehouseIcon } from './icons/cg-warehouse-icon';
import { CGPurchaseIcon } from './icons/cg-purchase-icon';
import { CGSaleIcon } from './icons/cg-sale-icon';
import { CGTimesheetIcon } from './icons/cg-timesheet-icon';
import { CGReportIcon } from './icons/cg-report-icon';
import { CGDashboardIcon } from './icons/cg-dashboard-icon';
import { CGRequestIcon } from './icons/cg-request-icon';
import { CGQaQcIcon } from './icons/cg-qa-qc-icon';
import { CGMasterDataIcon } from './icons/cg-master-data-icon';

// Type for CG icon components — compatible with LucideIcon signature
export type CGIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// ---------------------------------------------------------------------------
// Registry: map CG icon name (case-insensitive key) → component
// ---------------------------------------------------------------------------

/**
 * Add your custom CG icons here.
 *
 * Key: the icon name WITHOUT the "CG" prefix, lowercased.
 *       e.g. for "CGFactory" → key is "factory"
 *            for "CGWarehouse" → key is "warehouse"
 *
 * Value: the React component that renders the SVG icon.
 */
const cgIconRegistry = new Map<string, CGIconComponent>([
  ['factory', CGFactoryIcon],
  ['logistics', CGLogisticsIcon],
  ['maintenance', CGMaintenanceIcon],
  ['installation', CGInstallationIcon],
  ['warehouse', CGWarehouseIcon],
  ['purchase', CGPurchaseIcon],
  ['sale', CGSaleIcon],
  ['timesheet', CGTimesheetIcon],
  ['report', CGReportIcon],
  ['dashboard', CGDashboardIcon],
  ['request', CGRequestIcon],
  ['qaqc', CGQaQcIcon],
  ['masterdata', CGMasterDataIcon],
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if an icon name is a CG custom icon (starts with "CG" prefix).
 */
export function isCGIcon(iconName: string): boolean {
  return iconName.toUpperCase().startsWith('CG');
}

/**
 * Resolve a CG icon by name. Returns the component if found, undefined otherwise.
 *
 * @param iconName - Full icon name including "CG" prefix (e.g. "CGFactory")
 */
export function resolveCGIcon(iconName: string): LucideIcon | undefined {
  // Strip "CG" prefix, strip trailing "Icon" suffix, then lowercase for registry lookup
  let key = iconName.slice(2);
  if (key.toLowerCase().endsWith('icon')) {
    key = key.slice(0, -4);
  }
  return cgIconRegistry.get(key.toLowerCase()) as unknown as LucideIcon | undefined;
}

/**
 * Register a CG icon at runtime.
 * Useful for app-specific icons that shouldn't live in shared.
 *
 * @param name - Icon name WITHOUT "CG" prefix (e.g. "Factory")
 * @param component - The React SVG component
 */
export function registerCGIcon(name: string, component: CGIconComponent): void {
  cgIconRegistry.set(name.toLowerCase(), component);
}
