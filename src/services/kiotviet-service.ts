import type { KiotProduct } from '../types/kiotviet.types';
import { getCurrentFirebaseIdToken } from './firebase-auth-service';

const DEFAULT_KIOT_TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const DEFAULT_KIOT_API_BASE_URL = 'https://public.kiotapi.com';
const DEFAULT_KIOT_SCOPE = 'PublicApi.Access';
const DEFAULT_KIOT_PAGE_SIZE = 100;
const TOKEN_EXPIRY_SKEW_SECONDS = 300;
const KIOT_SYNC_FUNCTION_URL = import.meta.env.VITE_KIOT_SYNC_FUNCTION_URL ?? '';
const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL ?? '';
const GAS_SYNC_TOKEN = import.meta.env.VITE_GAS_SYNC_TOKEN ?? '';

export type KiotEntityName = 'branches' | 'categories' | 'products' | 'customers' | 'invoices';

type KiotPrimitive = string | number | boolean | Date;
type KiotQueryParams = Record<string, KiotPrimitive | null | undefined>;
type KiotRemovedId = string | number;

interface KiotAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface KiotEntityResponse<TItem> {
  data?: TItem[];
  removeIds?: KiotRemovedId[];
  removedIds?: KiotRemovedId[];
  removeId?: KiotRemovedId[];
  removedId?: KiotRemovedId[];
}

export interface KiotEntitySyncOptions {
  full?: boolean;
  lastModifiedFrom?: string;
  pageSize?: number;
  extraParams?: KiotQueryParams;
}

export interface KiotEntitySyncResult<TItem> {
  entity: KiotEntityName;
  endpoint: string;
  items: TItem[];
  removedIds: string[];
}

interface TokenCache {
  value: string;
  expiresAtMs: number;
}

interface KiotEntityConfig {
  endpoint: string;
  defaultParams?: KiotQueryParams;
}

const ENTITY_CONFIG: Record<KiotEntityName, KiotEntityConfig> = {
  branches: {
    endpoint: '/branches',
  },
  categories: {
    endpoint: '/categories',
  },
  products: {
    endpoint: '/products',
    defaultParams: {
      includeInventory: true,
      includePricebook: true,
      includeRemoveIds: true,
    },
  },
  customers: {
    endpoint: '/customers',
    defaultParams: {
      includeRemoveIds: true,
      includeTotal: true,
      includeCustomerGroup: true,
    },
  },
  invoices: {
    endpoint: '/invoices',
    defaultParams: {
      includePayment: true,
      includeInvoiceDelivery: true,
      includeInvoiceDelivey: true,
    },
  },
};

let tokenCache: TokenCache | null = null;

function toStringValue(value: KiotPrimitive): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function buildQueryString(params: KiotQueryParams = {}): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, toStringValue(value));
  });

  return searchParams.toString();
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/g, '');
}

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv];
  if (!value) {
    throw new Error(`Missing ${name}. Please set it in .env.`);
  }
  return String(value);
}

function getKiotConfig() {
  return {
    clientId: getRequiredEnv('VITE_KIOT_CLIENT_ID'),
    clientSecret: getRequiredEnv('VITE_KIOT_CLIENT_SECRET'),
    retailer: getRequiredEnv('VITE_KIOT_RETAILER'),
    tokenUrl: normalizeBaseUrl(import.meta.env.VITE_KIOT_TOKEN_URL || DEFAULT_KIOT_TOKEN_URL),
    apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_KIOT_API_BASE_URL || DEFAULT_KIOT_API_BASE_URL),
    scope: String(import.meta.env.VITE_KIOT_SCOPE || DEFAULT_KIOT_SCOPE),
    defaultPageSize: Number(import.meta.env.VITE_KIOT_PAGE_SIZE || DEFAULT_KIOT_PAGE_SIZE),
  };
}

async function parseJsonOrThrow(response: Response, context: string) {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(`KiotViet API error (${context}): ${response.status} ${response.statusText}`);
    }
    return {};
  }

  try {
    const payload = JSON.parse(text);
    if (!response.ok) {
      throw new Error(`KiotViet API error (${context}): ${response.status} ${JSON.stringify(payload)}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('KiotViet API error')) {
      throw error;
    }
    throw new Error(`KiotViet returned invalid JSON for ${context}`);
  }
}

async function requestAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAtMs > now) {
    return tokenCache.value;
  }

  const config = getKiotConfig();
  const form = new URLSearchParams({
    scopes: config.scope,
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = (await parseJsonOrThrow(response, 'token')) as KiotAuthTokenResponse;
  const accessToken = payload.access_token;
  if (!accessToken) {
    throw new Error('KiotViet token response is missing access_token');
  }

  const expiresIn = Math.max(60, Number(payload.expires_in || 3600) - TOKEN_EXPIRY_SKEW_SECONDS);
  tokenCache = {
    value: accessToken,
    expiresAtMs: now + expiresIn * 1000,
  };

  return accessToken;
}

export function clearKiotTokenCache() {
  tokenCache = null;
}

async function fetchKiotApi<TPayload>(path: string, params: KiotQueryParams = {}): Promise<TPayload> {
  // In development, call KiotViet API directly (CORS bypassed by Vite proxy)
  if (import.meta.env.DEV) {
    return fetchKiotApiDirect<TPayload>(path, params);
  }
  // In production, route through Firebase Function proxy to avoid CORS and hide credentials
  return fetchKiotApiViaProxy<TPayload>(path, params);
}

/** DEV-only: direct KiotViet API call using client credentials from .env */
async function fetchKiotApiDirect<TPayload>(path: string, params: KiotQueryParams = {}): Promise<TPayload> {
  const config = getKiotConfig();
  const query = buildQueryString(params);
  const url = `${config.apiBaseUrl}${path}${query ? `?${query}` : ''}`;

  const requestWithToken = async (token: string) =>
    fetch(url, {
      method: 'GET',
      headers: {
        Retailer: config.retailer,
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await requestWithToken(await requestAccessToken(false));
  if (response.status === 401) {
    clearKiotTokenCache();
    response = await requestWithToken(await requestAccessToken(true));
  }

  return parseJsonOrThrow(response, path) as Promise<TPayload>;
}

/** PROD: proxy KiotViet requests through Google Apps Script or Firebase Function (secrets stay server-side) */
async function fetchKiotApiViaProxy<TPayload>(path: string, params: KiotQueryParams = {}): Promise<TPayload> {
  const gasUrl = GAS_WEBAPP_URL.trim();
  const gasToken = GAS_SYNC_TOKEN.trim();

  // If Google Apps Script Web App is configured, use it as the proxy
  if (gasUrl) {
    const entity = path.replace(/^\//, '');
    const searchParams = new URLSearchParams({
      token: gasToken,
      action: entity,
    });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, toStringValue(value as KiotPrimitive));
      }
    });

    const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}${searchParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GAS Web App proxy error (${path}): HTTP ${response.status}`);
    }

    return response.json() as Promise<TPayload>;
  }

  const functionUrl = KIOT_SYNC_FUNCTION_URL.trim();
  if (!functionUrl) {
    throw new Error(
      'Thiếu cấu hình VITE_KIOT_SYNC_FUNCTION_URL hoặc VITE_GAS_WEBAPP_URL. Vui lòng cấu hình URL proxy để lấy dữ liệu KiotViet.',
    );
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('Bạn cần đăng nhập Firebase trước khi truy vấn dữ liệu KiotViet.');
  }

  const entity = path.replace(/^\//, '');
  const searchParams = new URLSearchParams({ action: entity });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, toStringValue(value as KiotPrimitive));
    }
  });

  const url = `${functionUrl}?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg: string;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || text;
    } catch {
      errorMsg = text || `HTTP ${response.status}`;
    }
    throw new Error(`KiotViet proxy error (${path}): ${response.status} ${errorMsg}`);
  }

  return response.json() as Promise<TPayload>;
}

function getRemovedIds<TItem>(payload: KiotEntityResponse<TItem>): string[] {
  const rawRemovedIds =
    payload.removeIds || payload.removedIds || payload.removeId || payload.removedId || [];

  return rawRemovedIds.map((item) => String(item));
}

async function fetchEntityData<TItem>(
  entity: KiotEntityName,
  options: KiotEntitySyncOptions = {},
): Promise<KiotEntitySyncResult<TItem>> {
  const config = getKiotConfig();
  const entityConfig = ENTITY_CONFIG[entity];
  const pageSize = options.pageSize || config.defaultPageSize || DEFAULT_KIOT_PAGE_SIZE;
  const items: TItem[] = [];
  const removedIds = new Set<string>();
  let currentItem = 0;

  while (true) {
    const params: KiotQueryParams = {
      ...entityConfig.defaultParams,
      ...options.extraParams,
      pageSize,
      currentItem,
      includeRemoveIds: true,
      orderDirection: 'Asc',
    };

    if (!options.full && options.lastModifiedFrom) {
      params.lastModifiedFrom = options.lastModifiedFrom;
    }

    const payload = await fetchKiotApi<KiotEntityResponse<TItem>>(entityConfig.endpoint, params);
    const chunk = payload.data || [];
    items.push(...chunk);
    getRemovedIds(payload).forEach((id) => removedIds.add(id));

    if (chunk.length < pageSize) {
      break;
    }
    currentItem += chunk.length;
  }

  return {
    entity,
    endpoint: entityConfig.endpoint,
    items,
    removedIds: Array.from(removedIds),
  };
}

export const kiotVietService = {
  getAccessToken: requestAccessToken,
  fetchApi: fetchKiotApi,
  fetchEntity: fetchEntityData,
  syncBranches: <TItem = unknown>(options?: KiotEntitySyncOptions) => fetchEntityData<TItem>('branches', options),
  syncCategories: <TItem = unknown>(options?: KiotEntitySyncOptions) =>
    fetchEntityData<TItem>('categories', options),
  syncProducts: <TItem = KiotProduct>(options?: KiotEntitySyncOptions) => fetchEntityData<TItem>('products', options),
  syncCustomers: <TItem = unknown>(options?: KiotEntitySyncOptions) => fetchEntityData<TItem>('customers', options),
  syncInvoices: <TItem = unknown>(options?: KiotEntitySyncOptions) => fetchEntityData<TItem>('invoices', options),
};
