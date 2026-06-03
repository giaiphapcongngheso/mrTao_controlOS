import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

const KIOT_CLIENT_ID = defineSecret('KIOT_CLIENT_ID');
const KIOT_CLIENT_SECRET = defineSecret('KIOT_CLIENT_SECRET');
const KIOT_RETAILER = defineSecret('KIOT_RETAILER');

const DEFAULT_KIOT_TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const DEFAULT_KIOT_API_BASE_URL = 'https://public.kiotapi.com';
const DEFAULT_KIOT_SCOPE = 'PublicApi.Access';
const DEFAULT_KIOT_PAGE_SIZE = 100;

type KiotPrimitive = string | number | boolean;
type KiotQueryParams = Record<string, KiotPrimitive | null | undefined>;

type Branch = {
  id: number;
  branchName: string;
  address?: string;
  contactNumber?: string;
  isActive?: boolean;
  source: 'synced';
  [key: string]: unknown;
};

type InventoryDetail = {
  branchId: number;
  branchName: string;
  onHand: number;
  reserved?: number;
  [key: string]: unknown;
};

type WarehouseProduct = {
  id: number;
  code: string;
  name: string;
  categoryName?: string;
  basePrice: number;
  inventories?: InventoryDetail[];
  source: 'synced';
  [key: string]: unknown;
};

type WarehouseSyncResponse = {
  branches: Branch[];
  products: WarehouseProduct[];
};

type KiotAuthTokenResponse = {
  access_token?: string;
};

type KiotEntityResponse<TItem> = {
  data?: TItem[];
};

class HttpResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpResponseError';
  }
}

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp();
  }
}

function getBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function verifyFirebaseSession(authorizationHeader?: string) {
  const bearerToken = getBearerToken(authorizationHeader);
  if (!bearerToken) {
    throw new HttpResponseError(401, 'Missing Firebase Authorization header.');
  }

  ensureAdminApp();

  try {
    await getAuth().verifyIdToken(bearerToken);
  } catch {
    throw new HttpResponseError(401, 'Invalid or expired Firebase session.');
  }
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/g, '');
}

function buildQueryString(params: KiotQueryParams = {}): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

async function parseJsonFromResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function stringifyKiotPayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'raw' in payload) {
    return String((payload as { raw: unknown }).raw);
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return 'Unknown KiotViet error payload';
  }
}

function createKiotHttpError(status: number, context: string, payload: unknown): HttpResponseError {
  if (status === 503) {
    return new HttpResponseError(
      503,
      `KiotViet ${context} is unavailable or rejecting the current server IP.`,
    );
  }

  return new HttpResponseError(
    502,
    `KiotViet ${context} request failed (${status}): ${stringifyKiotPayload(payload)}`,
  );
}

async function requestKiotAccessToken(): Promise<string> {
  const response = await fetch(normalizeBaseUrl(DEFAULT_KIOT_TOKEN_URL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      scopes: DEFAULT_KIOT_SCOPE,
      grant_type: 'client_credentials',
      client_id: KIOT_CLIENT_ID.value(),
      client_secret: KIOT_CLIENT_SECRET.value(),
    }).toString(),
  });

  const payload = (await parseJsonFromResponse(response)) as KiotAuthTokenResponse | unknown;
  if (!response.ok) {
    throw createKiotHttpError(response.status, 'token', payload);
  }

  const accessToken =
    payload && typeof payload === 'object' && 'access_token' in payload
      ? String((payload as KiotAuthTokenResponse).access_token || '')
      : '';

  if (!accessToken) {
    throw new HttpResponseError(502, 'KiotViet token response is missing access_token.');
  }

  return accessToken;
}

async function fetchKiotPage<TItem>(
  accessToken: string,
  path: string,
  params: KiotQueryParams,
): Promise<KiotEntityResponse<TItem>> {
  const query = buildQueryString(params);
  const url = `${normalizeBaseUrl(DEFAULT_KIOT_API_BASE_URL)}${path}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Retailer: KIOT_RETAILER.value(),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonFromResponse(response);
  if (!response.ok) {
    throw createKiotHttpError(response.status, path, payload);
  }

  return payload && typeof payload === 'object' ? (payload as KiotEntityResponse<TItem>) : {};
}

async function fetchAllKiotItems<TItem>(
  accessToken: string,
  path: string,
  baseParams: KiotQueryParams = {},
): Promise<TItem[]> {
  const items: TItem[] = [];
  let currentItem = 0;

  while (true) {
    const payload = await fetchKiotPage<TItem>(accessToken, path, {
      ...baseParams,
      pageSize: DEFAULT_KIOT_PAGE_SIZE,
      currentItem,
    });

    const chunk = Array.isArray(payload.data) ? payload.data : [];
    items.push(...chunk);

    if (chunk.length < DEFAULT_KIOT_PAGE_SIZE) {
      break;
    }

    currentItem += chunk.length;
  }

  return items;
}

function mapBranch(item: Record<string, unknown>): Branch {
  return {
    ...item,
    id: Number(item.id),
    branchName: String(item.branchName || ''),
    source: 'synced',
  } as Branch;
}

function mapProduct(item: Record<string, unknown>): WarehouseProduct {
  return {
    ...item,
    id: Number(item.id),
    code: String(item.code || ''),
    name: String(item.name || ''),
    basePrice: Number(item.basePrice || 0),
    source: 'synced',
  } as WarehouseProduct;
}

export const kiotvietWarehouseSync = onRequest(
  {
    region: 'asia-southeast1',
    cors: true,
    secrets: [KIOT_CLIENT_ID, KIOT_CLIENT_SECRET, KIOT_RETAILER],
  },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed. Use GET.' });
      return;
    }

    try {
      await verifyFirebaseSession(req.headers.authorization);

      const accessToken = await requestKiotAccessToken();
      const [branches, products] = await Promise.all([
        fetchAllKiotItems<Record<string, unknown>>(accessToken, '/branches'),
        fetchAllKiotItems<Record<string, unknown>>(accessToken, '/products', {
          includeInventory: true,
          includePricebook: true,
        }),
      ]);

      const payload: WarehouseSyncResponse = {
        branches: branches.map(mapBranch),
        products: products.map(mapProduct),
      };

      res.status(200).json(payload);
    } catch (error) {
      if (error instanceof HttpResponseError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unexpected sync error.',
      });
    }
  },
);
