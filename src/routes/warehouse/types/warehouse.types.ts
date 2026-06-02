export type WarehouseDataSource = 'synced' | 'manual';

export interface Branch {
  id: number;
  branchName: string;
  address?: string;
  contactNumber?: string;
  isActive?: boolean;
  source: WarehouseDataSource;
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
  source: WarehouseDataSource;
}

export interface WarehouseProductCreateInput {
  code: string;
  name: string;
  categoryName?: string;
  basePrice: number;
  onHand: number;
  branchId: number | null;
  branchName: string;
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
