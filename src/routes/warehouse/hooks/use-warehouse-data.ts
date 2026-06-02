import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_BRANCHES,
  DEMO_PRODUCTS,
  filterWarehouseProducts,
  loadStoredCredentials,
  saveCredentials,
  syncWarehouseData,
} from '../services/warehouse.service';
import type {
  Branch,
  WarehouseCredentials,
  WarehouseFilters,
  WarehouseProduct,
} from '../types/warehouse.types';

const DEFAULT_FILTERS: WarehouseFilters = {
  query: '',
  branchId: null,
  category: 'all',
  lowStockOnly: false,
};

export function useWarehouseData() {
  const [credentials, setCredentials] = useState<WarehouseCredentials>(() => loadStoredCredentials());
  const [branches, setBranches] = useState<Branch[]>(DEMO_BRANCHES);
  const [products, setProducts] = useState<WarehouseProduct[]>(DEMO_PRODUCTS);
  const [filters, setFilters] = useState<WarehouseFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const credentialsRef = useRef(credentials);

  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);

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

  const syncData = useCallback(
    async (nextCredentials?: WarehouseCredentials) => {
      const targetCredentials = nextCredentials ?? credentialsRef.current;
      setIsLoading(true);
      setError(null);

      try {
        saveCredentials(targetCredentials);
        setCredentials(targetCredentials);

        const data = await syncWarehouseData(targetCredentials);
        setBranches(data.branches.length > 0 ? data.branches : DEMO_BRANCHES);
        setProducts(data.products.length > 0 ? data.products : DEMO_PRODUCTS);
        setSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu kho');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void syncData();
  }, [syncData]);

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
    syncData,
  };
}
