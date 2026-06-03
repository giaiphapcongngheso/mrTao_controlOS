import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createWarehouseBranch,
  createWarehouseProduct,
  filterWarehouseProducts,
  hasWarehouseCredentials,
  loadStoredCredentials,
  syncWarehouseData,
} from '../services/warehouse.service';
import type {
  Branch,
  WarehouseCredentials,
  WarehouseFilters,
  WarehouseProduct,
  WarehouseProductCreateInput,
} from '../types/warehouse.types';

const DEFAULT_FILTERS: WarehouseFilters = {
  query: '',
  branchId: null,
  category: 'all',
  lowStockOnly: false,
};

export function useWarehouseData() {
  const [credentials, setCredentials] = useState<WarehouseCredentials>(() => loadStoredCredentials());
  const [syncedBranches, setSyncedBranches] = useState<Branch[]>([]);
  const [manualBranches, setManualBranches] = useState<Branch[]>([]);
  const [syncedProducts, setSyncedProducts] = useState<WarehouseProduct[]>([]);
  const [manualProducts, setManualProducts] = useState<WarehouseProduct[]>([]);
  const [filters, setFilters] = useState<WarehouseFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const credentialsRef = useRef(credentials);

  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);

  const branches = useMemo(() => [...manualBranches, ...syncedBranches], [manualBranches, syncedBranches]);
  const products = useMemo(() => [...manualProducts, ...syncedProducts], [manualProducts, syncedProducts]);
  const filteredProducts = useMemo(() => filterWarehouseProducts(products, filters), [products, filters]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.categoryName ?? 'Khác'))),
    [products],
  );

  const totalOnHand = useMemo(
    () =>
      filteredProducts.reduce(
        (sum, product) => sum + (product.inventories ?? []).reduce((inner, item) => inner + item.onHand, 0),
        0,
      ),
    [filteredProducts],
  );

  const totalValue = useMemo(
    () =>
      filteredProducts.reduce((sum, product) => {
        const onHand = (product.inventories ?? []).reduce((inner, item) => inner + item.onHand, 0);
        return sum + onHand * product.basePrice;
      }, 0),
    [filteredProducts],
  );

  const syncData = useCallback(async (nextCredentials?: WarehouseCredentials) => {
    const targetCredentials = nextCredentials ?? credentialsRef.current;
    setIsLoading(true);
    setError(null);

    try {
      setCredentials(targetCredentials);

      if (!hasWarehouseCredentials(targetCredentials)) {
        throw new Error('Vui lòng nhập đầy đủ cấu hình KiotViet để đồng bộ kho.');
      }

      const data = await syncWarehouseData(targetCredentials);
      setSyncedBranches(data.branches);
      setSyncedProducts(data.products);
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu kho');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = useCallback(
    (input: WarehouseProductCreateInput) => {
      const existingBranch = branches.find((branch) => branch.id === input.branchId);
      const targetBranch = existingBranch ?? createWarehouseBranch(input.branchName.trim());

      if (!existingBranch) {
        setManualBranches((prev) => [targetBranch, ...prev]);
      }

      const nextProduct = createWarehouseProduct(input, targetBranch);
      setManualProducts((prev) => [nextProduct, ...prev]);
    },
    [branches],
  );

  return {
    credentials,
    branches,
    categories,
    filteredProducts,
    filters,
    isLoading,
    error,
    syncTime,
    totalOnHand,
    totalValue,
    setFilters,
    createProduct,
    syncData,
  };
}
