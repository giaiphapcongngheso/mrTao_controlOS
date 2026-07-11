import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [tempSyncedData, setTempSyncedData] = useState<Customer[] | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const [syncTime, setSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 1. Fetch customers from React Query (staleTime: 10 minutes)
  const { data: customers = [], isLoading: isLoadingCustomers, error: customersError } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const allCustomers = await customersService.getAll();
      return [...allCustomers].sort((a, b) => {
        if (a.source === 'manual' && b.source !== 'manual') return -1;
        if (a.source !== 'manual' && b.source === 'manual') return 1;
        return a.name.localeCompare(b.name, 'vi');
      });
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // 2. Fetch sync logs from React Query
  const { data: syncLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['customer-sync-logs'],
    queryFn: async () => {
      const result = await customerSyncLogsService.getPaged({
        pageSize: 15,
        orderByField: 'timestamp',
        orderDirection: 'desc',
      });
      return result.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingCustomers || isSyncing;
  const error = syncError || (customersError instanceof Error ? customersError.message : null);

  const loadSyncLogs = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['customer-sync-logs'] });
  }, [queryClient]);

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
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await syncCustomerData(true);
      if (result.customers) {
        const mapped = result.customers.map((c: any) => ({
          id: String(c.id),
          code: c.code || '',
          name: c.name,
          phone: c.phone || c.contactNumber || '',
          email: c.email || '',
          address: c.address || '',
          gender: c.gender === 'male' || c.gender === true ? ('male' as const) : c.gender === 'female' || c.gender === false ? ('female' as const) : ('other' as const),
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
      setSyncError(syncError instanceof Error ? syncError.message : 'Không thể đồng bộ dữ liệu khách hàng.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Save the temporary sync data to Firestore via GAS real write
  const saveSyncData = useCallback(async (): Promise<CustomerSyncLog | null> => {
    if (!tempSyncedData) return null;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncCustomerData(false);
      
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

      customersService.invalidateCache();
      customerSyncLogsService.invalidateCache();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-sync-logs'] }),
      ]);

      setTempSyncedData(null);
      return log;
    } catch (saveError) {
      setSyncError(saveError instanceof Error ? saveError.message : 'Không thể lưu dữ liệu khách hàng vào hệ thống.');
      throw saveError;
    } finally {
      setIsSyncing(false);
    }
  }, [tempSyncedData, queryClient]);

  const discardTempData = useCallback(() => {
    setTempSyncedData(null);
    setSyncError(null);
  }, []);

  const createCustomer = useCallback(async (input: Partial<Customer>) => {
    setIsSyncing(true);
    setSyncError(null);
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
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Không thể tạo khách hàng.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  const updateCustomer = useCallback(async (id: string, input: Partial<Customer>) => {
    setIsSyncing(true);
    setSyncError(null);
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
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Không thể cập nhật khách hàng.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [customers, queryClient]);

  const deleteCustomer = useCallback(async (id: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const existing = customers.find((c) => c.id === id);
      if (!existing) {
        throw new Error('Không tìm thấy khách hàng.');
      }
      if (existing.source !== 'manual') {
        throw new Error('Không thể xóa khách hàng đồng bộ từ KiotViet.');
      }

      await customersService.delete(id);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Không thể xóa khách hàng.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [customers, queryClient]);

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
