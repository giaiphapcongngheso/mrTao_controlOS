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
      // Sửa lỗi P7: Chỉ lấy 20 log mới nhất thay vì tải toàn bộ và sort client
      const result = await warehouseSyncLogsService.getPaged({
        pageSize: 20,
        orderByField: 'timestamp',
        orderDirection: 'desc',
      });
      setSyncLogs(result.items);
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
    setIsLoading(true);
    setError(null);

    try {
      // Chỉ tải Preview (previewOnly = true), không ghi Firestore
      const data = await syncWarehouseData(true);
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
      let log: WarehouseSyncLog;
      const hasGas = !!(import.meta.env.VITE_GAS_WEBAPP_URL ?? '').trim();
      
      if (hasGas) {
        // Giao thức tối ưu hóa: Yêu cầu GAS ghi trực tiếp lên Firestore từ máy chủ của Google
        // previewOnly = false để thực hiện đồng bộ thật
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
        // Luồng cũ dành cho Firebase Functions
        log = await saveWarehouseDataWithStats(tempSyncedData.branches, tempSyncedData.products);
      }

      // Sửa lỗi P3 (Optimistic update): Cập nhật trực tiếp state từ dữ liệu preview đã có
      setBranches(tempSyncedData.branches);
      setProducts(tempSyncedData.products);
      setSyncLogs((prev) => [log, ...prev]);

      // Xóa cache in-memory để các lần gọi sau đọc DB mới
      warehouseBranchesService.invalidateCache();
      warehouseProductsService.invalidateCache();
      warehouseSyncLogsService.invalidateCache();

      setTempSyncedData(null);
      return log;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu vào hệ thống.');
      throw saveError;
    } finally {
      setIsLoading(false);
    }
  }, [tempSyncedData]);

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
