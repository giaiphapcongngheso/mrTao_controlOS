import { useCallback, useEffect, useMemo, useState } from 'react';
import { customersService } from '../../../services/customers-service';
import { customerSyncLogsService } from '../../../services/customer-sync-logs-service';
import { syncCustomerData } from '../../../services/customer-sync-service';
import type { Customer, CustomerSyncLog, CustomerFilters } from '../../../types/customer.types';

const DEFAULT_FILTERS: CustomerFilters = {
  query: '',
  groupId: null,
  hasDebtOnly: false,
};

function generateLocalCustomerCode() {
  return 'KH_M' + String(Date.now()).slice(-8);
}

export function useCustomerData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tempSyncedData, setTempSyncedData] = useState<Customer[] | null>(null);
  const [syncLogs, setSyncLogs] = useState<CustomerSyncLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTime, setSyncTime] = useState<string | null>(null);

  const loadFromFirestore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allCustomers = await customersService.getAll();
      // Sort: manual first, then alphabetical by name
      const sorted = [...allCustomers].sort((a, b) => {
        if (a.source === 'manual' && b.source !== 'manual') return -1;
        if (a.source !== 'manual' && b.source === 'manual') return 1;
        return a.name.localeCompare(b.name, 'vi');
      });
      setCustomers(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu khách hàng từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSyncLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const result = await customerSyncLogsService.getPaged({
        pageSize: 15,
        orderByField: 'timestamp',
        orderDirection: 'desc',
      });
      setSyncLogs(result.items);
    } catch (err) {
      console.error('Không thể tải lịch sử đồng bộ khách hàng:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    void loadFromFirestore();
    void loadSyncLogs();
  }, [loadFromFirestore, loadSyncLogs]);

  // Display preview data if available, otherwise display current firestore data
  const displayedCustomers = useMemo(
    () => tempSyncedData ?? customers,
    [tempSyncedData, customers]
  );

  // Client-side filtering for CustomTable display
  const filteredCustomers = useMemo(() => {
    return displayedCustomers.filter((customer) => {
      // Query filter (Name, Phone, Code)
      if (filters.query) {
        const keyword = filters.query.toLowerCase();
        const code = (customer.code || '').toLowerCase();
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        if (!code.includes(keyword) && !name.includes(keyword) && !phone.includes(keyword)) {
          return false;
        }
      }

      // Debt filter
      if (filters.hasDebtOnly && (customer.debt ?? 0) <= 0) {
        return false;
      }

      // Group ID filter
      if (filters.groupId !== null && customer.groupId !== filters.groupId) {
        return false;
      }

      return true;
    });
  }, [displayedCustomers, filters]);

  // Extracted unique customer groups
  const groups = useMemo(() => {
    const map = new Map<number, string>();
    displayedCustomers.forEach((c) => {
      if (c.groupId && c.groupName) {
        map.set(c.groupId, c.groupName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [displayedCustomers]);

  // KPI calculations
  const totalCount = useMemo(() => filteredCustomers.length, [filteredCustomers]);
  
  const totalDebt = useMemo(
    () => filteredCustomers.reduce((sum, c) => sum + (c.debt ?? 0), 0),
    [filteredCustomers]
  );

  const topPointsCustomer = useMemo(() => {
    if (filteredCustomers.length === 0) return null;
    return filteredCustomers.reduce((top, c) => ((c.points ?? 0) > (top.points ?? 0) ? c : top), filteredCustomers[0]);
  }, [filteredCustomers]);

  // Trigger preview fetch from GAS
  const syncDataPreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // preview = true: Only fetch data from KiotViet via GAS proxy
      const result = await syncCustomerData(true);
      if (result.customers) {
        // Map KiotViet customer structure to local Customer structure temporarily for preview
        const mapped = result.customers.map((c: any) => ({
          id: String(c.id),
          code: c.code || '',
          name: c.name,
          phone: c.phone || c.contactNumber || '',
          email: c.email || '',
          address: c.address || '',
          gender: c.gender === 'male' || c.gender === true ? 'male' as const : c.gender === 'female' || c.gender === false ? 'female' as const : 'other' as const,
          birthDate: c.birthDate || '',
          debt: Number(c.debt || 0),
          totalSpent: Number(c.totalSpent || c.totalInvoiced || 0),
          points: Number(c.points || c.totalPoint || 0),
          groupId: c.groupId || (c.customerGroup ? Number(c.customerGroup.id) : undefined),
          groupName: c.groupName || (c.customerGroup ? c.customerGroup.name : 'Khác'),
          isActive: c.isActive !== false,
          source: 'synced' as const,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setTempSyncedData(mapped);
      }
      setSyncTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu khách hàng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save the temporary sync data to Firestore via GAS real write
  const saveSyncData = useCallback(async (): Promise<CustomerSyncLog | null> => {
    if (!tempSyncedData) return null;
    setIsLoading(true);
    setError(null);
    try {
      // preview = false: Instruct GAS to write directly to Firestore
      const result = await syncCustomerData(false);
      
      const log: CustomerSyncLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        summary: `Đồng bộ thành công ${tempSyncedData.length} khách hàng.`,
        totalSynced: tempSyncedData.length,
        addedCount: tempSyncedData.length,
        updatedCount: 0,
        deletedCount: 0,
        triggeredBy: 'manual',
      };

      // Update local state directly (Optimistic update)
      setCustomers(tempSyncedData);
      setSyncLogs((prev) => [log, ...prev]);

      // Invalidate cache
      customersService.invalidateCache();
      customerSyncLogsService.invalidateCache();

      setTempSyncedData(null);
      return log;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu khách hàng vào hệ thống.');
      throw saveError;
    } finally {
      setIsLoading(false);
    }
  }, [tempSyncedData]);

  const discardTempData = useCallback(() => {
    setTempSyncedData(null);
    setError(null);
  }, []);

  // CRUD operations
  const createCustomer = useCallback(async (input: Partial<Customer>) => {
    setIsLoading(true);
    setError(null);
    try {
      const code = input.code?.trim() || generateLocalCustomerCode();
      const newCustomer: Customer = {
        id: 'cust_' + String(Date.now()),
        code,
        name: input.name?.trim() || '',
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        address: input.address?.trim() || undefined,
        gender: input.gender || 'other',
        birthDate: input.birthDate || undefined,
        debt: input.debt ?? 0,
        totalSpent: input.totalSpent ?? 0,
        points: input.points ?? 0,
        groupName: input.groupName || 'Khác',
        isActive: input.isActive !== false,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      };

      await customersService.create(newCustomer);
      await loadFromFirestore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo khách hàng.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFromFirestore]);

  const updateCustomer = useCallback(async (id: string, input: Partial<Customer>) => {
    setIsLoading(true);
    setError(null);
    try {
      const existing = customers.find((c) => c.id === id);
      if (!existing) {
        throw new Error('Không tìm thấy khách hàng cần cập nhật.');
      }

      const updated: Customer = {
        ...existing,
        name: input.name?.trim() || existing.name,
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        address: input.address?.trim() || undefined,
        gender: input.gender || existing.gender,
        birthDate: input.birthDate || undefined,
        debt: input.debt ?? existing.debt,
        totalSpent: input.totalSpent ?? existing.totalSpent,
        points: input.points ?? existing.points,
        groupName: input.groupName || existing.groupName,
        isActive: input.isActive !== false,
        updatedAt: new Date().toISOString(),
      };

      await customersService.update(id, updated);
      await loadFromFirestore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật khách hàng.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [customers, loadFromFirestore]);

  const deleteCustomer = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const existing = customers.find((c) => c.id === id);
      if (!existing) {
        throw new Error('Không tìm thấy khách hàng.');
      }
      if (existing.source !== 'manual') {
        throw new Error('Không thể xóa khách hàng đồng bộ từ KiotViet.');
      }

      await customersService.delete(id);
      await loadFromFirestore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa khách hàng.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [customers, loadFromFirestore]);

  return {
    customers: displayedCustomers,
    groups,
    filteredCustomers,
    filters,
    isLoading,
    error,
    syncTime,
    totalCount,
    totalDebt,
    topPointsCustomer,
    setFilters,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    syncDataPreview,
    tempSyncedData,
    saveSyncData,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  };
}
