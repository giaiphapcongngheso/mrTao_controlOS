import type {
  Branch,
  WarehouseCredentials,
  WarehouseFilters,
  WarehouseProduct,
  WarehouseSyncResponse,
} from '../types/warehouse.types';

const CLIENT_ID_KEY = 'kv_client_id';
const CLIENT_SECRET_KEY = 'kv_client_secret';
const RETAILER_KEY = 'kv_retailer';

export const DEMO_BRANCHES: Branch[] = [
  {
    id: 10001,
    branchName: 'Mr.Táo - Chi nhánh Trung tâm',
    address: '79 Đường Láng, Ngã Tư Sở, Đống Đa, Hà Nội',
    contactNumber: '0968.123.456',
    isActive: true,
  },
  {
    id: 10002,
    branchName: 'Mr.Táo - Kho Tổng miền Bắc',
    address: '22 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    contactNumber: '0968.999.888',
    isActive: true,
  },
  {
    id: 10003,
    branchName: 'Mr.Táo - Chi nhánh Cầu Giấy',
    address: '155 Cầu Giấy, Quan Hoa, Hà Nội',
    contactNumber: '0977.123.789',
    isActive: true,
  },
];

export const DEMO_PRODUCTS: WarehouseProduct[] = [
  {
    id: 9001,
    code: 'IP15PM256',
    name: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên (Zin 99%)',
    categoryName: 'Điện thoại iPhone',
    basePrice: 28900000,
    inventories: [
      { branchId: 10001, branchName: 'Mr.Táo - Chi nhánh Trung tâm', onHand: 14 },
      { branchId: 10002, branchName: 'Mr.Táo - Kho Tổng miền Bắc', onHand: 45 },
      { branchId: 10003, branchName: 'Mr.Táo - Chi nhánh Cầu Giấy', onHand: 2 },
    ],
  },
  {
    id: 9002,
    code: 'IP14P128',
    name: 'iPhone 14 Pro 128GB - Tím Deep Purple (Zin 99%)',
    categoryName: 'Điện thoại iPhone',
    basePrice: 19800000,
    inventories: [
      { branchId: 10001, branchName: 'Mr.Táo - Chi nhánh Trung tâm', onHand: 3 },
      { branchId: 10002, branchName: 'Mr.Táo - Kho Tổng miền Bắc', onHand: 15 },
      { branchId: 10003, branchName: 'Mr.Táo - Chi nhánh Cầu Giấy', onHand: 8 },
    ],
  },
  {
    id: 9003,
    code: 'IP11_128',
    name: 'iPhone 11 128GB - Đen Quốc Tế (Kính thay)',
    categoryName: 'Điện thoại iPhone',
    basePrice: 7200000,
    inventories: [
      { branchId: 10001, branchName: 'Mr.Táo - Chi nhánh Trung tâm', onHand: 1 },
      { branchId: 10002, branchName: 'Mr.Táo - Kho Tổng miền Bắc', onHand: 24 },
      { branchId: 10003, branchName: 'Mr.Táo - Chi nhánh Cầu Giấy', onHand: 0 },
    ],
  },
];

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
    clientSecret: window.localStorage.getItem(CLIENT_SECRET_KEY) ?? '',
    retailer: window.localStorage.getItem(RETAILER_KEY) ?? '',
  };
}

export function saveCredentials(credentials: WarehouseCredentials) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CLIENT_ID_KEY, credentials.clientId);
  window.localStorage.setItem(CLIENT_SECRET_KEY, credentials.clientSecret);
  window.localStorage.setItem(RETAILER_KEY, credentials.retailer);
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
  if (!credentials.clientId || !credentials.clientSecret || !credentials.retailer) {
    return {
      branches: DEMO_BRANCHES,
      products: DEMO_PRODUCTS,
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
      branches: (branchesData.data as Branch[]) ?? DEMO_BRANCHES,
      products: (productsData.data as WarehouseProduct[]) ?? DEMO_PRODUCTS,
    };
  } catch (error) {
    throw new Error(normalizeSyncError(error));
  }
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
