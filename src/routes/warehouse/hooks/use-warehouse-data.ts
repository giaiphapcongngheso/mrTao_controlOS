import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [tempSyncedData, setTempSyncedData] = useState<{
    branches: Branch[];
    products: WarehouseProduct[];
  } | null>(null);
  const [filters, setFilters] = useState<WarehouseFilters>(DEFAULT_FILTERS);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 1. Fetch branches from React Query
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['warehouse-branches'],
    queryFn: () => warehouseBranchesService.getAll(),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // 2. Fetch products from React Query
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['warehouse-products'],
    queryFn: () => warehouseProductsService.getAll(),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // 3. Fetch sync logs from React Query
  const { data: syncLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['warehouse-sync-logs'],
    queryFn: async () => {
      const result = await warehouseSyncLogsService.getPaged({
        pageSize: 20,
        orderByField: 'timestamp',
        orderDirection: 'desc',
      });
      return result.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingBranches || isLoadingProducts || isSyncing;
  const error = syncError || (productsError instanceof Error ? productsError.message : null);

  const loadSyncLogs = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['warehouse-sync-logs'] });
  }, [queryClient]);

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

  const totalCostValue = useMemo(
    () =>
      filteredProducts.reduce((sum, product) => {
        const onHand = (product.inventories ?? []).reduce((inner, item) => inner + item.onHand, 0);
        const costPrice = typeof product.cost === 'number' ? product.cost : 0;
        return sum + onHand * costPrice;
      }, 0),
    [filteredProducts],
  );

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await syncWarehouseData(true);
      setTempSyncedData({
        branches: data.branches,
        products: data.products,
      });
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (syncError) {
      setSyncError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu kho.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const saveTempDataToSystem = useCallback(async (): Promise<WarehouseSyncLog | null> => {
    if (!tempSyncedData) {
      return null;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      let log: WarehouseSyncLog;
      const hasGas = !!(import.meta.env.VITE_GAS_WEBAPP_URL ?? '').trim();
      
      if (hasGas) {
        const result = await syncWarehouseData(false);
        log = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          summary: result.summary || 'Đồng bộ qua GAS thành công.',
          productsAdded: 0,
          productsUpdated: result.products.length,
          branchesAdded: 0,
          branchesUpdated: result.branches.length,
        };
      } else {
        log = await saveWarehouseDataWithStats(tempSyncedData.branches, tempSyncedData.products);
      }

      warehouseBranchesService.invalidateCache();
      warehouseProductsService.invalidateCache();
      warehouseSyncLogsService.invalidateCache();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['warehouse-branches'] }),
        queryClient.invalidateQueries({ queryKey: ['warehouse-products'] }),
        queryClient.invalidateQueries({ queryKey: ['warehouse-sync-logs'] }),
      ]);

      setTempSyncedData(null);
      return log;
    } catch (saveError) {
      setSyncError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu vào hệ thống.');
      throw saveError;
    } finally {
      setIsSyncing(false);
    }
  }, [tempSyncedData, queryClient]);

  const discardTempData = useCallback(() => {
    setTempSyncedData(null);
    setSyncError(null);
  }, []);

  const createProduct = useCallback(
    async (input: WarehouseProductCreateInput) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const existingBranch = branches.find((branch) => branch.id === input.branchId);
        let targetBranch = existingBranch;

        if (!targetBranch) {
          const newBranch = createWarehouseBranch(input.branchName.trim());
          targetBranch = await warehouseBranchesService.create(newBranch);
        }

        const nextProduct = createWarehouseProduct(input, targetBranch);
        await warehouseProductsService.create(nextProduct);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['warehouse-branches'] }),
          queryClient.invalidateQueries({ queryKey: ['warehouse-products'] }),
        ]);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Không thể tạo sản phẩm.');
      } finally {
        setIsSyncing(false);
      }
    },
    [branches, queryClient],
  );

  const updateProduct = useCallback(
    async (productId: number, input: WarehouseProductCreateInput) => {
      setIsSyncing(true);
      setSyncError(null);
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
          cost: input.cost,
          inventories: [
            {
              branchId: targetBranch.id,
              branchName: targetBranch.branchName,
              onHand: input.onHand,
            },
          ],
        };

        await warehouseProductsService.update(String(productId), updatedProduct);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['warehouse-branches'] }),
          queryClient.invalidateQueries({ queryKey: ['warehouse-products'] }),
        ]);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Không thể cập nhật sản phẩm.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [branches, products, queryClient],
  );

  const deleteProduct = useCallback(
    async (productId: number) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const product = products.find((p) => p.id === productId);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm cần xóa.');
        }
        if (product.source !== 'manual') {
          throw new Error('Không thể xóa sản phẩm đồng bộ từ KiotViet.');
        }

        await warehouseProductsService.delete(String(productId));
        await queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Không thể xóa sản phẩm.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [products, queryClient],
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
    totalCostValue,
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
