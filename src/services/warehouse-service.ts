import type {
  Branch,
  WarehouseFilters,
  WarehouseProduct,
  WarehouseProductCreateInput,
  WarehouseSyncResponse,
  WarehouseSyncLog,
} from '../types/warehouse.types';
import { doc, writeBatch } from 'firebase/firestore';
import { getFirestoreDb } from './firebase-config';
import { createBaseService } from '../shared/services/create-base-service';
import { dataClient } from './data-client';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { getCurrentFirebaseIdToken } from './firebase-auth-service';

const KIOT_SYNC_FUNCTION_URL = import.meta.env.VITE_KIOT_SYNC_FUNCTION_URL ?? '';
const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL ?? '';
const GAS_SYNC_TOKEN = import.meta.env.VITE_GAS_SYNC_TOKEN ?? '';

class WarehouseSyncRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'WarehouseSyncRequestError';
  }
}

function generateLocalId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function normalizeSyncError(error: unknown): string {
  if (error instanceof WarehouseSyncRequestError) {
    if (error.status === 401) {
      return 'Phiên đăng nhập Firebase đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại trước khi đồng bộ kho.';
    }

    if (error.status === 404) {
      return 'Không tìm thấy endpoint đồng bộ KiotViet. Vui lòng kiểm tra VITE_KIOT_SYNC_FUNCTION_URL.';
    }

    if (error.status === 502) {
      return `KiotViet trả về lỗi khi đồng bộ kho: ${error.message}`;
    }

    if (error.status === 503) {
      return 'KiotViet đang tạm thời không khả dụng hoặc đang chặn kết nối từ máy chủ Firebase Functions. Vui lòng kiểm tra whitelist IP hoặc trạng thái public API của KiotViet.';
    }

    return error.message;
  }

  return error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu kho.';
}

function getRequiredFunctionUrl(): string {
  const trimmed = KIOT_SYNC_FUNCTION_URL.trim();
  if (!trimmed) {
    throw new Error(
      'Thiếu cấu hình VITE_KIOT_SYNC_FUNCTION_URL. Vui lòng cấu hình URL Firebase Function cho đồng bộ KiotViet.',
    );
  }

  return trimmed;
}

async function parseResponseBody(response: Response): Promise<{
  contentType: string;
  body: Record<string, unknown> | string | null;
}> {
  const contentType = response.headers.get('content-type') ?? '';
  const rawText = await response.text();

  if (!rawText) {
    return { contentType, body: null };
  }

  if (contentType.includes('application/json')) {
    try {
      return {
        contentType,
        body: JSON.parse(rawText) as Record<string, unknown>,
      };
    } catch {
      throw new Error(`Firebase Function trả về JSON không hợp lệ: ${rawText.slice(0, 120)}`);
    }
  }

  return { contentType, body: rawText };
}

async function fetchWarehouseSyncPayload(): Promise<WarehouseSyncResponse> {
  const gasUrl = GAS_WEBAPP_URL.trim();
  if (gasUrl) {
    const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(GAS_SYNC_TOKEN)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new WarehouseSyncRequestError(response.status, `Không thể kết nối với GAS Web App (${response.status})`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    if (body.success === false) {
      throw new WarehouseSyncRequestError(502, String(body.error || 'Lỗi không xác định từ Google Apps Script.'));
    }

    return {
      branches: Array.isArray(body.branches)
        ? body.branches.map((branch) => ({
            ...(branch as Branch),
            source: 'synced',
          }))
        : [],
      products: Array.isArray(body.products)
        ? body.products.map((product) => ({
            ...(product as WarehouseProduct),
            source: 'synced',
          }))
        : [],
    };
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new WarehouseSyncRequestError(
      401,
      'Bạn cần đăng nhập Firebase trước khi đồng bộ dữ liệu kho.',
    );
  }

  const response = await fetch(getRequiredFunctionUrl(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const { contentType, body } = await parseResponseBody(response);
  if (!response.ok) {
    const errorMessage =
      body && typeof body === 'object' && 'error' in body
        ? String(body.error || `Yêu cầu thất bại (${response.status})`)
        : typeof body === 'string'
          ? body.slice(0, 160)
          : `Yêu cầu thất bại (${response.status})`;

    throw new WarehouseSyncRequestError(response.status, errorMessage);
  }

  if (!contentType.includes('application/json')) {
    throw new WarehouseSyncRequestError(
      502,
      `Firebase Function trả về nội dung không hợp lệ: ${String(body || '').slice(0, 120)}`,
    );
  }

  const payload = body as Partial<WarehouseSyncResponse> | null;

  return {
    branches: Array.isArray(payload?.branches)
      ? payload.branches.map((branch) => ({
          ...(branch as Branch),
          source: 'synced',
        }))
      : [],
    products: Array.isArray(payload?.products)
      ? payload.products.map((product) => ({
          ...(product as WarehouseProduct),
          source: 'synced',
        }))
      : [],
  };
}

export async function syncWarehouseData(): Promise<WarehouseSyncResponse> {
  try {
    return await fetchWarehouseSyncPayload();
  } catch (error) {
    throw new Error(normalizeSyncError(error));
  }
}

export function createWarehouseBranch(branchName: string): Branch {
  return {
    id: generateLocalId(),
    branchName,
    isActive: true,
    source: 'manual',
  };
}

export function createWarehouseProduct(
  input: WarehouseProductCreateInput,
  branch: Branch,
): WarehouseProduct {
  return {
    id: generateLocalId(),
    code: input.code,
    name: input.name,
    categoryName: input.categoryName,
    basePrice: input.basePrice,
    inventories: [
      {
        branchId: branch.id,
        branchName: branch.branchName,
        onHand: input.onHand,
      },
    ],
    source: 'manual',
  };
}

export function filterWarehouseProducts(
  products: WarehouseProduct[],
  filters: WarehouseFilters,
): WarehouseProduct[] {
  return products.filter((product) => {
    const totalOnHand = (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);

    if (filters.lowStockOnly && totalOnHand > 5) {
      return false;
    }

    if (filters.query) {
      const keyword = filters.query.toLowerCase();
      if (!product.name.toLowerCase().includes(keyword) && !product.code.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    if (filters.branchId !== null) {
      const hasBranch = (product.inventories ?? []).some((inventory) => inventory.branchId === filters.branchId);
      if (!hasBranch) {
        return false;
      }
    }

    if (filters.category !== 'all') {
      const category = product.categoryName ?? 'Khác';
      if (category !== filters.category) {
        return false;
      }
    }

    return true;
  });
}

export const warehouseBranchesService = createBaseService<Branch, Partial<Branch>>({
  client: dataClient,
  resource: RESOURCE_PATH.WAREHOUSE_BRANCHES,
});

export const warehouseProductsService = createBaseService<WarehouseProduct, Partial<WarehouseProduct>>({
  client: dataClient,
  resource: RESOURCE_PATH.WAREHOUSE_PRODUCTS,
});

export const warehouseSyncLogsService = createBaseService<WarehouseSyncLog, Partial<WarehouseSyncLog>>({
  client: dataClient,
  resource: RESOURCE_PATH.WAREHOUSE_SYNC_LOGS,
});

export async function saveWarehouseDataWithStats(
  branches: Branch[],
  products: WarehouseProduct[],
): Promise<WarehouseSyncLog> {
  const db = getFirestoreDb();

  const existingBranches = await warehouseBranchesService.getAll();
  const existingProducts = await warehouseProductsService.getAll();

  const existingBranchIds = new Set(existingBranches.map((branch) => String(branch.id)));
  const existingProductIds = new Set(existingProducts.map((product) => String(product.id)));

  let branchesAdded = 0;
  let branchesUpdated = 0;
  let productsAdded = 0;
  let productsUpdated = 0;

  const operations: Array<{ ref: ReturnType<typeof doc>; data: Branch | WarehouseProduct }> = [];

  branches.forEach((branch) => {
    const branchIdStr = String(branch.id);
    if (existingBranchIds.has(branchIdStr)) {
      branchesUpdated++;
    } else {
      branchesAdded++;
    }

    operations.push({
      ref: doc(db, 'warehouse_branches', branchIdStr),
      data: branch,
    });
  });

  products.forEach((product) => {
    const productIdStr = String(product.id);
    if (existingProductIds.has(productIdStr)) {
      productsUpdated++;
    } else {
      productsAdded++;
    }

    operations.push({
      ref: doc(db, 'warehouse_products', productIdStr),
      data: product,
    });
  });

  const CHUNK_SIZE = 500;
  for (let index = 0; index < operations.length; index += CHUNK_SIZE) {
    const chunk = operations.slice(index, index + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((operation) => {
      batch.set(operation.ref, operation.data, { merge: true });
    });
    await batch.commit();
  }

  const logId = `log_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const summary = `Đồng bộ KiotViet: Thêm mới ${branchesAdded} & Cập nhật ${branchesUpdated} chi nhánh. Thêm mới ${productsAdded} & Cập nhật ${productsUpdated} sản phẩm.`;

  const syncLog: WarehouseSyncLog = {
    id: logId,
    timestamp,
    summary,
    productsAdded,
    productsUpdated,
    branchesAdded,
    branchesUpdated,
  };

  await warehouseSyncLogsService.create(syncLog);

  warehouseBranchesService.invalidateCache();
  warehouseProductsService.invalidateCache();
  warehouseSyncLogsService.invalidateCache();

  return syncLog;
}
