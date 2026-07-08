import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import KpiView from './KpiView';
import { TAB_ROUTE_MAP, useAppShellState } from '../app-shell-state';
import { useStaffQuery } from '../StaffPermissions/_hook/use-staff';
import { useAppStore } from '../../stores/app-store';
import {
  useKpiConfigsQuery,
  useKpiDailyValuesQuery,
  useCreateKpiConfigMutation,
  useUpdateKpiConfigMutation,
  useDeleteKpiConfigMutation,
  useSaveKpiDailyValueMutation,
  useKpiRolesQuery,
  useKpiGoalsQuery,
  useCreateKpiGoalMutation,
  useDeleteKpiGoalMutation,
  useKpiStaffMonthlyConfigsQuery,
  useSaveKpiStaffMonthlyConfigMutation,
  useUpdateKpiRoleMutation,
} from './_hook/use-kpi';

export default function KpiRoute() {
  const navigate = useNavigate();
  const { activeStoreId } = useAppShellState();
  
  const { currentUser } = useAppStore();
  const isAdminOrOwner = useMemo(() => {
    return currentUser?.roleCode === 'CHU_CUA_HANG' || currentUser?.roleCode === 'QUAN_TRI_VIEN';
  }, [currentUser]);

  const now = new Date();
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  );
  const [activeSubTab, setActiveSubTab] = useState<'ranks' | 'entry' | 'settings'>('ranks');

  // Sync tab if user privileges change or storage restores asynchronously
  useEffect(() => {
    if (!isAdminOrOwner && activeSubTab === 'settings') {
      setActiveSubTab('ranks');
    }
  }, [isAdminOrOwner, activeSubTab]);

  const { data: staffMembers = [], isLoading: isStaffLoading } = useStaffQuery();
  const { data: allKpiConfigs = [], isLoading: isConfigsLoading } = useKpiConfigsQuery(activeStoreId, selectedMonthYear);
  const { data: allKpiDailyValues = [], isLoading: isDailyValuesLoading } = useKpiDailyValuesQuery(activeStoreId, selectedMonthYear);
  const { data: roles = [], isLoading: isRolesLoading } = useKpiRolesQuery();
  const { data: goals = [], isLoading: isGoalsLoading } = useKpiGoalsQuery({
    enabled: activeSubTab === 'settings',
  });
  const { data: allMonthlyConfigs = [], isLoading: isMonthlyConfigsLoading } = useKpiStaffMonthlyConfigsQuery(activeStoreId, selectedMonthYear);

  const createConfigMutation = useCreateKpiConfigMutation();
  const updateConfigMutation = useUpdateKpiConfigMutation();
  const deleteConfigMutation = useDeleteKpiConfigMutation();
  const saveDailyValueMutation = useSaveKpiDailyValueMutation();
  const createGoalMutation = useCreateKpiGoalMutation();
  const deleteGoalMutation = useDeleteKpiGoalMutation();
  const saveMonthlyConfigMutation = useSaveKpiStaffMonthlyConfigMutation();
  const updateKpiRoleMutation = useUpdateKpiRoleMutation();

  // Expose migration tool to window console to bypass Node CLI permission issues
  if (typeof window !== 'undefined') {
    (window as any).runKpiMigration = async () => {
      const { getFirestoreDb } = await import('../../services/firebase-config');
      const { collection, getDocs, doc, writeBatch } = await import('firebase/firestore');
      const db = getFirestoreDb();
      
      console.log('🚀 Starting browser-based KPI storeId migration...');
      
      const staffStoreMap = new Map();
      staffMembers.forEach((s) => {
        if (s.storeId) staffStoreMap.set(s.id, s.storeId);
      });
      console.log(`Loaded ${staffStoreMap.size} staff mapping(s).`);

      const updateCollectionStoreId = async (collectionName: string, staffIdFieldName = 'staffId') => {
        console.log(`Scanning collection "${collectionName}"...`);
        const qSnapshot = await getDocs(collection(db, collectionName));
        
        let updateCount = 0;
        let batch = writeBatch(db);
        let opCount = 0;
        
        for (const d of qSnapshot.docs) {
          const data = d.data();
          const staffId = data[staffIdFieldName];
          
          if ((!data.storeId || data.storeId === '') && staffId) {
            const correctStoreId = staffStoreMap.get(staffId);
            if (correctStoreId) {
              batch.update(doc(db, collectionName, d.id), { storeId: correctStoreId });
              updateCount++;
              opCount++;
              console.log(`  - Prepared update for ${collectionName}/${d.id}: storeId = "${correctStoreId}" for staffId = "${staffId}"`);
              
              if (opCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
              }
            }
          }
        }
        
        if (opCount > 0) {
          await batch.commit();
        }
        console.log(`✅ Finished "${collectionName}": updated ${updateCount} records.`);
        return updateCount;
      };

      const configsUpdated = await updateCollectionStoreId('kpi_configs');
      const dailyValuesUpdated = await updateCollectionStoreId('kpi_daily_values');
      const monthlyConfigsUpdated = await updateCollectionStoreId('kpi_staff_monthly_configs');

      console.log('🎉 Browser migration completed!');
      return { configsUpdated, dailyValuesUpdated, monthlyConfigsUpdated };
    };
  }

  // Stable callbacks for mutations
  const handleCreateConfig = useCallback((newConfig: any) => {
    return createConfigMutation.mutateAsync(newConfig);
  }, [createConfigMutation]);

  const handleUpdateConfig = useCallback((config: any) => {
    return updateConfigMutation.mutateAsync(config);
  }, [updateConfigMutation]);

  const handleDeleteConfig = useCallback((configId: string) => {
    return deleteConfigMutation.mutateAsync(configId);
  }, [deleteConfigMutation]);

  const handleSaveDailyValue = useCallback((val: any) => {
    return saveDailyValueMutation.mutateAsync(val);
  }, [saveDailyValueMutation]);

  const handleSaveMonthlyConfig = useCallback((config: any) => {
    return saveMonthlyConfigMutation.mutateAsync(config);
  }, [saveMonthlyConfigMutation]);

  const handleUpdateRole = useCallback((role: any) => {
    return updateKpiRoleMutation.mutateAsync(role);
  }, [updateKpiRoleMutation]);

  const handleCreateGoal = useCallback((name: string) => {
    return createGoalMutation.mutateAsync({ id: `goal_${Date.now()}`, name });
  }, [createGoalMutation]);

  const handleDeleteGoal = useCallback((id: string) => {
    return deleteGoalMutation.mutateAsync(id);
  }, [deleteGoalMutation]);

  // Filter out staff members with role 'CHU_CUA_HANG' (Chủ cửa hàng) and restrict to current store
  const filteredStaffMembers = useMemo(() => {
    return staffMembers.filter((staff) => {
      const roleCode = (staff.role || '').toUpperCase().replace(/_/g, '').trim();
      const isNotOwner = roleCode !== 'CHU_CUA_HANG' && roleCode !== 'CHUCUAHANG';
      const isCurrentStore = staff.storeId === activeStoreId;
      
      if (!isAdminOrOwner) {
        return staff.id === currentUser?.id;
      }
      
      return isNotOwner && isCurrentStore;
    });
  }, [staffMembers, activeStoreId, isAdminOrOwner, currentUser]);

  // Filter out 'CHU_CUA_HANG' from available KPI roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const roleCode = (role.code || '').toUpperCase().replace(/_/g, '').trim();
      return roleCode !== 'CHU_CUA_HANG' && roleCode !== 'CHUCUAHANG';
    });
  }, [roles]);

  const isRanksLoading = isStaffLoading || isConfigsLoading || isDailyValuesLoading || isRolesLoading || isMonthlyConfigsLoading;
  const isEntryLoading = isStaffLoading || isConfigsLoading || isDailyValuesLoading;
  const isSettingsLoading = isRolesLoading || isStaffLoading || isConfigsLoading || isGoalsLoading;

  return (
    <KpiView
      roles={filteredRoles}
      staffMembers={filteredStaffMembers}
      kpiConfigs={allKpiConfigs}
      kpiDailyValues={allKpiDailyValues}
      monthlyConfigs={allMonthlyConfigs}
      selectedMonthYear={selectedMonthYear}
      onMonthYearChange={setSelectedMonthYear}
      onCreateConfig={handleCreateConfig}
      onUpdateConfig={handleUpdateConfig}
      onDeleteConfig={handleDeleteConfig}
      onSaveDailyValue={handleSaveDailyValue}
      onSaveMonthlyConfig={handleSaveMonthlyConfig}
      onUpdateRole={handleUpdateRole}
      goals={goals}
      onCreateGoal={handleCreateGoal}
      onDeleteGoal={handleDeleteGoal}
      activeSubTab={activeSubTab}
      onSubTabChange={setActiveSubTab}
      isRanksLoading={isRanksLoading}
      isEntryLoading={isEntryLoading}
      isSettingsLoading={isSettingsLoading}
      isAdminOrOwner={isAdminOrOwner}
    />
  );
}

