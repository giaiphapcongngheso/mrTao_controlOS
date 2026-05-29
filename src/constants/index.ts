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
  ROLE_CODE,
  PRESET_VAI_TRO,
  MODULE_CODE,
  PRESET_MODULES,
  MODULE_METADATA,
  getModuleMeta,
  getRoleFriendlyName,
  FILTER_ALL,
  DEFAULT_STAFF_ACCOUNT,
  ROLE_DEPARTMENT_MAP,
  DEFAULT_DEPARTMENT,
  ROLE_POSITION_MAP,
  DEFAULT_POSITION,
  getDepartmentForRole,
  getPositionForRole,
  AVATAR_PRESETS,
  DEFAULT_AVATAR,
  DEFAULT_STAFF_FORM,
} from './staff-permissions.constants';
export type { RoleCode, ModuleCode, ModuleMetadata } from './staff-permissions.constants';
