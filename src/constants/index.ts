/**
 * Barrel export for all application constants.
 */

export { RESOURCE_PATH, KNOWN_RESOURCE_PATHS } from './resource-paths';
export type { ResourcePath } from './resource-paths';

export { DATA_PROVIDER } from './data-provider';
export type { DataProvider } from './data-provider';

export { LOCAL_STORAGE_KEYS } from './local-storage-keys';
export type { LocalStorageKey } from './local-storage-keys';

export {
  MODULE_CODE,
  PRESET_MODULES,
  MODULE_METADATA,
  getModuleMeta,
  getRoleFriendlyName,
  FILTER_ALL,
  getDepartmentForRole,
  getPositionForRole,
  AVATAR_PRESETS,
  DEFAULT_AVATAR,
  DEFAULT_STAFF_FORM,
} from './staff-permissions.constants';
export type { ModuleCode, ModuleMetadata } from './staff-permissions.constants';
