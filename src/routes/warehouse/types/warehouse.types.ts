export interface Branch {
  id: number;
  branchName: string;
  address?: string;
  contactNumber?: string;
  isActive?: boolean;
}

export interface InventoryDetail {
  branchId: number;
  branchName: string;
  onHand: number;
  reserved?: number;
}

export interface WarehouseProduct {
  id: number;
  code: string;
  name: string;
  categoryName?: string;
  basePrice: number;
  inventories?: InventoryDetail[];
}

export interface WarehouseCredentials {
  clientId: string;
  clientSecret: string;
  retailer: string;
}

export interface WarehouseSyncResponse {
  branches: Branch[];
  products: WarehouseProduct[];
}

export interface WarehouseFilters {
  query: string;
  branchId: number | null;
  category: string;
  lowStockOnly: boolean;
}
