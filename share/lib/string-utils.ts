/**
 * String utilities for working with PascalCase entity codes.
 */

/**
 * Convert PascalCase/camelCase string to kebab-case and pluralize.
 *
 * @example
 * toKebabCasePlural('SupplyRequest')     // → 'supply-requests'
 * toKebabCasePlural('SalesQuotation')    // → 'sales-quotations'
 * toKebabCasePlural('FinishedGood')      // → 'finished-goods'
 * toKebabCasePlural('Currency')          // → 'currencies'
 * toKebabCasePlural('MaintenanceOrder')  // → 'maintenance-orders'
 */
export function toKebabCasePlural(str: string): string {
  if (!str) return '';

  // PascalCase → kebab-case
  const kebab = str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

  // Simple pluralize
  if (
    kebab.endsWith('y') &&
    !kebab.endsWith('ay') &&
    !kebab.endsWith('ey') &&
    !kebab.endsWith('oy') &&
    !kebab.endsWith('uy')
  ) {
    return kebab.slice(0, -1) + 'ies';
  }

  if (kebab.endsWith('s') || kebab.endsWith('x') || kebab.endsWith('ch') || kebab.endsWith('sh')) {
    return kebab + 'es';
  }

  return kebab + 's';
}

/**
 * Build API controller path from WorkItemCategory data.
 *
 * @param category - Object with `code` and optional `application.code`
 * @returns Controller path, e.g. `/servicedesk/supply-requests`
 *
 * @example
 * buildControllerPath({ code: 'SupplyRequest', application: { code: 'servicedesk' } })
 * // → '/servicedesk/supply-requests'
 *
 * buildControllerPath({ code: 'SalesQuotation', application: { code: 'servicedesk' } })
 * // → '/servicedesk/sales-quotations'
 */
export function buildControllerPath(category: {
  code: string;
  application?: { code?: string } | null;
}): string {
  // const modulePrefix = category.application?.code?.toLowerCase() ?? 'servicedesk';
  const entityPath = toKebabCasePlural(category.code);
  return `/servicedesk/${entityPath}`;
}
