import type {
  ApiPagingResponse,
  ApiResponse,
  IBaseAPIParams,
  IFlatItem,
  IGenerationCodeInfo,
  IPagedAPIParams,
} from '../types';
import { MasterDataStatus } from '../enums';

/**
 * Axios-like API instance interface
 */
export interface IApiInstance {
  get: <T>(url: string, config?: Record<string, unknown>) => Promise<{ data: T }>;
  post: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<{ data: T }>;
  put: <T>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<{ data: T }>;
  delete: <T>(url: string, config?: Record<string, unknown>) => Promise<{ data: T }>;
}

/** API getter type - can be either the api instance directly or a getter function */
export type ApiGetter = IApiInstance | (() => IApiInstance);

/** Helper to resolve api from getter */
function resolveApi(apiOrGetter: ApiGetter): IApiInstance {
  return typeof apiOrGetter === 'function' ? apiOrGetter() : apiOrGetter;
}

/** Default base filters - status = Active - chỉ áp dụng cho getPaged, getAll, getDropdown */
const DEFAULT_BASE_FILTERS: Record<string, string | number | boolean> = {
  status: MasterDataStatus.Active,
};

/**
 * Configuration for creating a base service
 */
export interface IBaseServiceConfig {
  /** API instance or getter function (use getter to avoid initialization timing issues) */
  api: ApiGetter;
  controller: string;
  /** Base filters áp dụng cho getPaged, getAll, getDropdown. Mặc định: { status: 1 } */
  baseFilters?: Record<string, string | number | boolean>;
  /** Set false để không áp dụng baseFilters mặc định (status = 1) */
  useDefaultFilters?: boolean;
}

/**
 * Base service interface with common CRUD operations
 */
export interface IBaseService<TEntity, TRequest = TEntity> {
  getPaged: (params?: IPagedAPIParams) => Promise<ApiPagingResponse<TEntity>>;
  getAll: (params?: IBaseAPIParams) => Promise<ApiResponse<TEntity[]>>;
  getDropdown: (params?: IBaseAPIParams) => Promise<ApiResponse<IFlatItem[]>>;
  getById: (args: { id: string; includes?: string }) => Promise<ApiResponse<TEntity>>;
  create: (data: TRequest) => Promise<ApiResponse<TEntity>>;
  update: (id: string, data: TRequest) => Promise<ApiResponse<TEntity>>;
  delete: (id: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  checkExistGenerationCode: () => Promise<ApiResponse<IGenerationCodeInfo>>;
  exportTemplate: () => Promise<string>;
  import: (file: File) => Promise<ApiResponse<void>>;
  exportData: (params?: IPagedAPIParams) => Promise<string>;
}

/**
 * Merge base filters with existing filter string
 * User's filters will override base filters if same key is present
 * @param baseFilters - Object of default filters, e.g. { status: 1, isDeleted: false }
 * @param existingFilter - Existing filter string from params
 * @returns Combined filter string
 */
function mergeFilters(
  baseFilters?: Record<string, string | number | boolean>,
  existingFilter?: string,
): string | undefined {
  if (!baseFilters || Object.keys(baseFilters).length === 0) {
    return existingFilter;
  }

  // Parse existing filter to find which keys are already set by user
  const existingKeys = new Set<string>();
  if (existingFilter) {
    // Parse filter string like "status==2,name@=test" to extract keys
    const filterParts = existingFilter.split('&&');
    for (const part of filterParts) {
      // Match key before any operator (==, !=, @=, >=, <=, etc.)
      const match = part.match(/^([a-zA-Z0-9_]+)/);
      if (match) {
        existingKeys.add(match[1].toLowerCase());
      }
    }
  }

  // Only add base filters that are NOT already set by user
  const baseFilterStrings: string[] = [];
  for (const [key, value] of Object.entries(baseFilters)) {
    if (!existingKeys.has(key.toLowerCase())) {
      baseFilterStrings.push(`${key}==${value}`);
    }
  }

  if (baseFilterStrings.length === 0) {
    return existingFilter || undefined;
  }

  if (!existingFilter) {
    return baseFilterStrings.join('&&');
  }

  // Combine: base filters first, then user filters
  return [...baseFilterStrings, existingFilter].join('&&');
}

export function createBaseService<TEntity, TRequest = TEntity>(
  config: IBaseServiceConfig,
): IBaseService<TEntity, TRequest> {
  const { api: apiOrGetter, controller, baseFilters, useDefaultFilters = true } = config;

  // Merge default filters với custom baseFilters
  // Custom baseFilters sẽ override default filters nếu trùng key
  const effectiveFilters = useDefaultFilters
    ? { ...DEFAULT_BASE_FILTERS, ...baseFilters }
    : baseFilters;

  const applyBaseFilters = <T extends { filters?: string; ignoreStatusFilter?: boolean }>(
    params?: T,
  ) => {
    if (!params) {
      return effectiveFilters ? { filters: mergeFilters(effectiveFilters) } : undefined;
    }

    const { ignoreStatusFilter, ...rest } = params;

    // Nếu ignoreStatusFilter = true => bỏ status khỏi baseFilters
    const filtersToApply =
      ignoreStatusFilter && effectiveFilters
        ? Object.fromEntries(Object.entries(effectiveFilters).filter(([key]) => key !== 'status'))
        : effectiveFilters;

    return {
      ...rest,
      filters: mergeFilters(filtersToApply, params.filters),
    };
  };

  return {
    getPaged: async (params?: IPagedAPIParams) => {
      const api = resolveApi(apiOrGetter);
      const extendedParams = params as IPagedAPIParams & { filters?: string };
      const mergedParams = applyBaseFilters(extendedParams);
      const res = await api.get<ApiPagingResponse<TEntity>>(`${controller}/paged`, {
        params: mergedParams,
        skipErrorToast: true,
      });
      return res.data;
    },

    getAll: async (params?: IBaseAPIParams) => {
      const api = resolveApi(apiOrGetter);
      const extendedParams = params as IBaseAPIParams & { filters?: string };
      const mergedParams = applyBaseFilters(extendedParams);
      const res = await api.get<ApiResponse<TEntity[]>>(controller, {
        params: mergedParams,
        skipErrorToast: true,
      });
      return res.data;
    },

    getDropdown: async (params?: IBaseAPIParams) => {
      const api = resolveApi(apiOrGetter);
      const extendedParams = params as IBaseAPIParams & { filters?: string };
      const mergedParams = applyBaseFilters(extendedParams);
      const res = await api.get<ApiResponse<IFlatItem[]>>(`${controller}/dropdown`, {
        params: mergedParams,
        skipErrorToast: true,
      });
      return res.data;
    },

    getById: async ({ id, includes }: { id: string; includes?: string }) => {
      const api = resolveApi(apiOrGetter);
      const res = await api.get<ApiResponse<TEntity>>(`${controller}/${id}`, {
        params: { includes },
        skipErrorToast: true,
      });
      return res.data;
    },

    create: async (data: TRequest) => {
      const api = resolveApi(apiOrGetter);
      const res = await api.post<ApiResponse<TEntity>>(controller, data);
      return res.data;
    },

    update: async (id: string, data: TRequest) => {
      const api = resolveApi(apiOrGetter);
      const res = await api.put<ApiResponse<TEntity>>(`${controller}/${id}`, data);
      return res.data;
    },

    delete: async (id: string) => {
      const api = resolveApi(apiOrGetter);
      await api.delete(`${controller}/${id}`);
    },

    deleteItems: async (ids: string[]) => {
      const api = resolveApi(apiOrGetter);
      await api.delete(`${controller}`, {
        data: ids,
      });
    },

    /**
     * Check if generation code rule exists for this entity
     * - If pattern exists → generation rule is configured
     * - If pattern is null/empty → no generation rule, show dialog to create one
     */
    checkExistGenerationCode: async () => {
      const api = resolveApi(apiOrGetter);
      const res = await api.get<ApiResponse<IGenerationCodeInfo>>(
        `${controller}/check-exist-generation-code`,
        {
          skipErrorToast: true,
        },
      );
      return res.data;
    },

    exportTemplate: async () => {
      const api = resolveApi(apiOrGetter);
      const res = await api.get<ApiResponse<string>>(`${controller}/export-template`, {
        skipErrorToast: true,
      });
      return res.data.data!;
    },

    import: async (file: File) => {
      const api = resolveApi(apiOrGetter);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ApiResponse<void>>(`${controller}/import/excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        skipErrorToast: true,
      });
      return res.data;
    },

    exportData: async (params?: IPagedAPIParams) => {
      const api = resolveApi(apiOrGetter);
      const extendedParams = params as IPagedAPIParams & { filters?: string };
      const mergedParams = applyBaseFilters(extendedParams);
      const res = await api.get<ApiResponse<string>>(`${controller}/export-data`, {
        params: mergedParams,
        skipErrorToast: true,
      });
      return res.data.data!;
    },
  };
}
