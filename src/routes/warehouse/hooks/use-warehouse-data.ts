import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createWarehouseBranch,
  createWarehouseProduct,
  filterWarehouseProducts,
  hasWarehouseCredentials,
  loadStoredCredentials,
  syncWarehouseData,
  warehouseBranchesService,
  warehouseProductsService,
  saveWarehouseDataWithStats,
  warehouseSyncLogsService,
} from '../../../services/warehouse-service';
import type {
  Branch,
  WarehouseCredentials,
  WarehouseFilters,
  WarehouseProduct,
  WarehouseProductCreateInput,
  WarehouseSyncLog,
} from '../../../types/warehouse.types';

const DEFAULT_FILTERS: WarehouseFilters = {
  query: '',
  branchId: null,
  category: 'all',
  lowStockOnly: false,
};

export function useWarehouseData() {
  const [credentials, setCredentials] = useState<WarehouseCredentials>(() => loadStoredCredentials());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [tempSyncedData, setTempSyncedData] = useState<{
    branches: Branch[];
    products: WarehouseProduct[];
  } | null>(null);
  const [syncLogs, setSyncLogs] = useState<WarehouseSyncLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [filters, setFilters] = useState<WarehouseFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const credentialsRef = useRef(credentials);

  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);

  // 1. Load from Firestore
  const loadFromFirestore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allBranches = await warehouseBranchesService.getAll();
      const allProducts = await warehouseProductsService.getAll();
      setBranches(allBranches);
      setProducts(allProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu kho từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSyncLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const allLogs = await warehouseSyncLogsService.getAll();
      const sortedLogs = [...allLogs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSyncLogs(sortedLogs);
    } catch (err) {
      console.error('Không thể tải lịch sử đồng bộ:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    void loadFromFirestore();
    void loadSyncLogs();
  }, [loadFromFirestore, loadSyncLogs]);

  // 2. Compute displayed data (use tempSyncedData if in preview mode)
  const displayedBranches = useMemo(() => {
    if (tempSyncedData) {
      return tempSyncedData.branches;
    }
    return branches;
  }, [tempSyncedData, branches]);

  const displayedProducts = useMemo(() => {
    if (tempSyncedData) {
      return tempSyncedData.products;
    }
    return products;
  }, [tempSyncedData, products]);

  const filteredProducts = useMemo(() => filterWarehouseProducts(displayedProducts, filters), [displayedProducts, filters]);

  const categories = useMemo(
    () => Array.from(new Set(displayedProducts.map((product) => product.categoryName ?? 'Khác'))),
    [displayedProducts],
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

  // 3. Sync from KiotViet to memory
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
      setTempSyncedData({
        branches: data.branches,
        products: data.products,
      });
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu kho');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Save memory data to Firestore
  const saveTempDataToSystem = useCallback(async (): Promise<WarehouseSyncLog | null> => {
    if (!tempSyncedData) return null;
    setIsLoading(true);
    setError(null);
    try {
      const log = await saveWarehouseDataWithStats(tempSyncedData.branches, tempSyncedData.products);
      await loadFromFirestore();
      await loadSyncLogs();
      setTempSyncedData(null);
      return log;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu vào hệ thống.');
      throw saveError;
    } finally {
      setIsLoading(false);
    }
  }, [tempSyncedData, loadFromFirestore, loadSyncLogs]);

  // 5. Discard memory data
  const discardTempData = useCallback(() => {
    setTempSyncedData(null);
    setError(null);
  }, []);

  // 6. Create product manual directly to Firestore
  const createProduct = useCallback(
    async (input: WarehouseProductCreateInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const existingBranch = branches.find((branch) => branch.id === input.branchId);
        let targetBranch = existingBranch;
        if (!targetBranch) {
          const newBranch = createWarehouseBranch(input.branchName.trim());
          targetBranch = await warehouseBranchesService.create(newBranch);
        }

        const nextProduct = createWarehouseProduct(input, targetBranch);
        await warehouseProductsService.create(nextProduct);
        await loadFromFirestore();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tạo sản phẩm');
      } finally {
        setIsLoading(false);
      }
    },
    [branches, loadFromFirestore],
  );

  return {
    credentials,
    branches: displayedBranches,
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
    tempSyncedData,
    saveTempDataToSystem,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  };
}
