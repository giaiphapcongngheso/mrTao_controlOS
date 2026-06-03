import type {
  Branch,
  WarehouseCredentials,
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


function generateLocalId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function loadStoredCredentials(): WarehouseCredentials {
  return {
    clientId: import.meta.env.VITE_KIOT_CLIENT_ID ?? '',
    clientSecret: import.meta.env.VITE_KIOT_CLIENT_SECRET ?? '',
    retailer: import.meta.env.VITE_KIOT_RETAILER ?? '',
  };
}

export function hasWarehouseCredentials(credentials: WarehouseCredentials) {
  return Boolean(credentials.clientId && credentials.clientSecret && credentials.retailer);
}

function normalizeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu kho.';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('503') ||
    normalized.includes('service unavailable') ||
    normalized.includes('unexpected token') ||
    normalized.includes('doctype')
  ) {
    return 'KiotViet từ chối kết nối từ IP hiện tại (503). Vui lòng kiểm tra cấu hình API whitelist trong KiotViet.';
  }

  return message;
}

async function fetchJson(path: string) {
  const response = await fetch(path);
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`API trả về định dạng không hợp lệ: ${text.slice(0, 120)}`);
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `Yêu cầu thất bại (${response.status})`);
  }

  return json;
}

export async function syncWarehouseData(credentials: WarehouseCredentials): Promise<WarehouseSyncResponse> {
  if (!hasWarehouseCredentials(credentials)) {
    return {
      branches: [],
      products: [],
    };
  }

  try {
    const params = new URLSearchParams({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      retailer: credentials.retailer,
      pageSize: '100',
    });

    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    const [branchesData, productsData] = await Promise.all([
      fetchJson(`${baseUrl}/api/kiotviet/branches?${params.toString()}`),
      fetchJson(`${baseUrl}/api/kiotviet/products?${params.toString()}`),
    ]);

    return {
      branches: ((branchesData.data as Branch[] | undefined) ?? []).map((branch) => ({
        ...branch,
        source: 'synced',
      })),
      products: ((productsData.data as WarehouseProduct[] | undefined) ?? []).map((product) => ({
        ...product,
        source: 'synced',
      })),
    };
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

// ─── Firestore Services ──────────────────────────────────────────────────────

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

// ─── Batch Save to Firestore with Logs ───────────────────────────────────────

export async function saveWarehouseDataWithStats(
  branches: Branch[],
  products: WarehouseProduct[]
): Promise<WarehouseSyncLog> {
  const db = getFirestoreDb();

  // 1. Fetch current data to count additions vs updates
  const existingBranches = await warehouseBranchesService.getAll();
  const existingProducts = await warehouseProductsService.getAll();

  const existingBranchIds = new Set(existingBranches.map((b) => String(b.id)));
  const existingProductIds = new Set(existingProducts.map((p) => String(p.id)));

  let branchesAdded = 0;
  let branchesUpdated = 0;
  let productsAdded = 0;
  let productsUpdated = 0;

  const operations: { ref: any; data: any }[] = [];

  branches.forEach((branch) => {
    const branchIdStr = String(branch.id);
    if (existingBranchIds.has(branchIdStr)) {
      branchesUpdated++;
    } else {
      branchesAdded++;
    }
    const docRef = doc(db, 'warehouse_branches', branchIdStr);
    operations.push({ ref: docRef, data: branch });
  });

  products.forEach((product) => {
    const productIdStr = String(product.id);
    if (existingProductIds.has(productIdStr)) {
      productsUpdated++;
    } else {
      productsAdded++;
    }
    const docRef = doc(db, 'warehouse_products', productIdStr);
    operations.push({ ref: docRef, data: product });
  });

  // 2. Perform Batch Write in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      batch.set(op.ref, op.data, { merge: true });
    });
    await batch.commit();
  }

  // 3. Create Sync Log Document
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

  // Invalidate Caches
  warehouseBranchesService.invalidateCache();
  warehouseProductsService.invalidateCache();
  warehouseSyncLogsService.invalidateCache();

  return syncLog;
}

