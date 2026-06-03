import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createWarehouseBranch,
  createWarehouseProduct,
  filterWarehouseProducts,
  saveWarehouseDataWithStats,
  syncWarehouseData,
  warehouseBranchesService,
  warehouseProductsService,
  warehouseSyncLogsService,
} from '../../../services/warehouse-service';
import type {
  Branch,
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

  const loadFromFirestore = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allBranches, allProducts] = await Promise.all([
        warehouseBranchesService.getAll(),
        warehouseProductsService.getAll(),
      ]);
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
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
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

  const displayedBranches = useMemo(
    () => tempSyncedData?.branches ?? branches,
    [tempSyncedData, branches],
  );

  const displayedProducts = useMemo(
    () => tempSyncedData?.products ?? products,
    [tempSyncedData, products],
  );

  const filteredProducts = useMemo(
    () => filterWarehouseProducts(displayedProducts, filters),
    [displayedProducts, filters],
  );

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

  const syncData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await syncWarehouseData();
      setTempSyncedData({
        branches: data.branches,
        products: data.products,
      });
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu kho.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTempDataToSystem = useCallback(async (): Promise<WarehouseSyncLog | null> => {
    if (!tempSyncedData) {
      return null;
    }

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

  const discardTempData = useCallback(() => {
    setTempSyncedData(null);
    setError(null);
  }, []);

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
        setError(err instanceof Error ? err.message : 'Không thể tạo sản phẩm.');
      } finally {
        setIsLoading(false);
      }
    },
    [branches, loadFromFirestore],
  );

  const updateProduct = useCallback(
    async (productId: number, input: WarehouseProductCreateInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const existingBranch = branches.find((branch) => branch.id === input.branchId);
        let targetBranch = existingBranch;

        if (!targetBranch) {
          const newBranch = createWarehouseBranch(input.branchName.trim());
          targetBranch = await warehouseBranchesService.create(newBranch);
        }

        const existingProduct = products.find((p) => p.id === productId);
        if (!existingProduct) {
          throw new Error('Không tìm thấy sản phẩm cần cập nhật.');
        }

        const updatedProduct: WarehouseProduct = {
          ...existingProduct,
          code: input.code,
          name: input.name,
          categoryName: input.categoryName,
          basePrice: input.basePrice,
          inventories: [
            {
              branchId: targetBranch.id,
              branchName: targetBranch.branchName,
              onHand: input.onHand,
            },
          ],
        };

        await warehouseProductsService.update(String(productId), updatedProduct);
        await loadFromFirestore();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể cập nhật sản phẩm.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [branches, products, loadFromFirestore],
  );

  const deleteProduct = useCallback(
    async (productId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const product = products.find((p) => p.id === productId);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm cần xóa.');
        }
        if (product.source !== 'manual') {
          throw new Error('Không thể xóa sản phẩm đồng bộ từ KiotViet.');
        }

        await warehouseProductsService.delete(String(productId));
        await loadFromFirestore();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể xóa sản phẩm.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [products, loadFromFirestore],
  );

  return {
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
    updateProduct,
    deleteProduct,
    syncData,
    tempSyncedData,
    saveTempDataToSystem,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  };
}
