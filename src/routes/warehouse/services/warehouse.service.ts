import type {
  Branch,
  WarehouseCredentials,
  WarehouseFilters,
  WarehouseProduct,
  WarehouseProductCreateInput,
  WarehouseSyncResponse,
} from '../types/warehouse.types';

const CLIENT_ID_KEY = 'kv_client_id';
const RETAILER_KEY = 'kv_retailer';

function generateLocalId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function loadStoredCredentials(): WarehouseCredentials {
  if (typeof window === 'undefined') {
    return {
      clientId: '',
      clientSecret: '',
      retailer: '',
    };
  }

  return {
    clientId: window.localStorage.getItem(CLIENT_ID_KEY) ?? '',
    clientSecret: '',
    retailer: window.localStorage.getItem(RETAILER_KEY) ?? '',
  };
}

export function saveCredentials(credentials: WarehouseCredentials) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CLIENT_ID_KEY, credentials.clientId);
  window.localStorage.removeItem('kv_client_secret');
  window.localStorage.setItem(RETAILER_KEY, credentials.retailer);
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

    const [branchesData, productsData] = await Promise.all([
      fetchJson(`/api/kiotviet/branches?${params.toString()}`),
      fetchJson(`/api/kiotviet/products?${params.toString()}`),
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
