import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '../../shared/components/skeleton';
import { toastError, toastSuccess } from '../../shared/lib/toast';
import { roleService, staffPermissionService, staffService } from '../../services/admin';
import {
  ensureFirebasePasswordUser,
  FirebaseIdentityToolkitError,
} from '../../services/firebase-auth-service';
import {
  isStaffAuthGasConfigured,
  StaffAuthGasError,
  syncStaffAuthViaGas,
} from '../../services/staff-auth-gas-service';
import { systemLogService } from '../../services/system-log-service';
import type { RolePermissionRow, StaffMember, StaffRole } from '../../types/staff.types';
import { DEFAULT_AVATAR } from '../../constants';
import { DEFAULT_STORE_ID } from '../../data';
import {
  LogsTabContent,
  PermissionsTabContent,
  StaffPermissionsHeader,
  StaffTabContent,
} from './components';
import {
  DEFAULT_STAFF_FORM,
} from './StaffPermissionsView.constants';
import type {
  ActiveTab,
  PermissionField,
  StaffFormState,
  StaffPermissionsViewProps,
  SystemLog,
  SystemLogActionType,
} from './StaffPermissionsView.types';
import {
  nextStaffId,
  normalizeUsername,
  toRoleCode,
  toRoleId,
  toSortedPermissions,
  toSortedRoles,
  toSortedStaff,
} from './StaffPermissionsView.utils';
import type { PermissionRowFormValues } from './role-permission-form-schema';


export default function StaffPermissionsView({ currentUser }: StaffPermissionsViewProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('staff');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permissionRows, setPermissionRows] = useState<RolePermissionRow[]>([]);

  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');

  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState<StaffFormState>(DEFAULT_STAFF_FORM);

  // Dialog state for role creation (triggered from header button)
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const isOwner = Boolean(
    currentUser?.user === 'admin' ||
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('quan ly') ||
    currentUser?.role?.toLowerCase().includes('quản lý'),
  );

  const activeStaffCount = useMemo(
    () => staffList.filter((staff: StaffMember) => staff.status === 'active').length,
    [staffList],
  );

  const refreshLogs = async () => {
    try {
      const systemLogs = await systemLogService.getAll();
      const sortedLogs = (systemLogs || [])
        .filter((log: SystemLog) => Boolean(log?.timestamp))
        .sort((a: SystemLog, b: SystemLog) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      setLogs(sortedLogs);
    } catch (error) {
      console.error('Failed to refresh system logs:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      void refreshLogs();
    }
  }, [activeTab]);

  const loadAuthorityData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [staff, permissions, roleDocs, systemLogs] = await Promise.all([
        staffService.getAll(),
        staffPermissionService.getAll(),
        roleService.getAll(),
        systemLogService.getAll(),
      ]);

      const safeStaff = Array.isArray(staff) ? staff : [];
      const safePermissions = Array.isArray(permissions) ? permissions : [];
      const safeRoles = Array.isArray(roleDocs) ? roleDocs : [];
      const safeLogs = Array.isArray(systemLogs) ? systemLogs : [];

      const roleMapByCode = new Map<string, StaffRole>(
        safeRoles.map((role) => [toRoleCode(role.code), { ...role, code: toRoleCode(role.code) }]),
      );
      const inferredRoles: StaffRole[] = [];

      const ensureRole = (rawCode: string, storeId?: string): StaffRole => {
        const normalizedCode = toRoleCode(rawCode);
        const existed = roleMapByCode.get(normalizedCode);
        if (existed) {
          return existed;
        }

        const inferred: StaffRole = {
          id: toRoleId(normalizedCode),
          storeId: storeId ?? DEFAULT_STORE_ID,
          code: normalizedCode,
          name: normalizedCode.replace(/_/g, ' '),
          status: 'active',
        };
        roleMapByCode.set(normalizedCode, inferred);
        inferredRoles.push(inferred);
        return inferred;
      };

      safeStaff.forEach((staffItem) => {
        if (staffItem.role) {
          ensureRole(staffItem.role, staffItem.storeId);
        }
      });
      safePermissions.forEach((permission) => {
        if (permission.roleCode) {
          ensureRole(permission.roleCode, permission.storeId);
        }
      });

      const normalizedPermissions = safePermissions.map((permission) => {
        if (permission.roleId) {
          return permission;
        }

        const resolvedRole = ensureRole(permission.roleCode, permission.storeId);
        return { ...permission, roleId: resolvedRole.id, roleCode: resolvedRole.code };
      });

      const normalizedStaff = safeStaff.map((staffItem) => {
        const resolvedRole = ensureRole(staffItem.role, staffItem.storeId);
        return {
          ...staffItem,
          roleId: staffItem.roleId || resolvedRole.id,
          role: resolvedRole.code,
        };
      });

      const mergedRoles = toSortedRoles(Array.from(new Map([...safeRoles, ...inferredRoles].map((role) => [role.id, role])).values()));

      setRoles(mergedRoles);
      setStaffList(toSortedStaff(normalizedStaff));
      setPermissionRows(toSortedPermissions(normalizedPermissions));
      const sortedLogs = safeLogs
        .filter((log: SystemLog) => Boolean(log?.timestamp))
        .sort((a: SystemLog, b: SystemLog) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      setLogs(sortedLogs);
    } catch (error) {
      console.error('Failed to load staff permissions data:', error);
      toastError('Không thể tải dữ liệu phân quyền từ Firestore. Vui lòng kiểm tra cấu hình và quyền truy cập.');
      setStaffList([]);
      setRoles([]);
      setPermissionRows([]);
      setLogs([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAuthorityData();
  }, []);

  const roleOptions = useMemo(() => {
    return roles
      .map((role) => ({ code: role.code, name: role.name }))
      .sort((a, b) => a.code.localeCompare(b.code, 'vi'));
  }, [roles]);

  const roleByCode = useMemo(() => {
    return new Map<string, StaffRole>(roles.map((role) => [toRoleCode(role.code), role]));
  }, [roles]);

  const filteredStaff = useMemo(() => {
    const keyword = staffSearch.trim().toLowerCase();
    return staffList.filter((staff: StaffMember) => {
      const matchedRole = staffRoleFilter === 'ALL' || staff.role === staffRoleFilter;
      const matchedKeyword =
        keyword.length === 0 ||
        staff.fullName.toLowerCase().includes(keyword) ||
        staff.username.toLowerCase().includes(keyword) ||
        staff.id.toLowerCase().includes(keyword) ||
        (staff.phone ?? '').toLowerCase().includes(keyword);

      return matchedRole && matchedKeyword;
    });
  }, [staffList, staffSearch, staffRoleFilter]);

  const defaultStoreId = useMemo(
    () => roles[0]?.storeId ?? staffList[0]?.storeId ?? DEFAULT_STORE_ID,
    [roles, staffList],
  );

  // ---- Save Role + Permissions (unified handler) ----
  const handleSaveRoleWithPermissions = useCallback(
    async (
      roleData: { name: string; code: string; status: 'active' | 'inactive' },
      permissions: PermissionRowFormValues[],
      editingRole: StaffRole | null,
    ) => {
      if (!isOwner) {
        toastError('Bạn không có quyền thao tác.');
        return;
      }

      const roleCode = toRoleCode(roleData.code.trim() || roleData.name);
      const roleName = roleData.name.trim();

      // Determine the role record
      let role: StaffRole;
      const isCreating = !editingRole;

      if (isCreating) {
        // Validate uniqueness
        if (roles.some((r) => toRoleCode(r.code) === roleCode)) {
          toastError('Mã vai trò đã tồn tại.');
          return;
        }

        role = {
          id: toRoleId(roleCode),
          storeId: defaultStoreId,
          code: roleCode,
          name: roleName,
          status: roleData.status,
        };
      } else {
        role = {
          ...editingRole,
          name: roleName,
        };
      }

      try {
        // 1. Save role (create or update) with custom log details
        await roleService.update(role.id, role, {
          logDetails: isCreating
            ? `Đã tạo vai trò ${role.name} (${role.code}) với ${permissions.length} module.`
            : `Đã cập nhật phân quyền vai trò ${role.name} (${role.code}).`,
        });

        // 2. Batch save permissions (bypass auto log to avoid spamming Firestore)
        const permissionTasks = permissions.map((perm) => {
          // Find existing row for this role + module
          const existing = permissionRows.find(
            (row) =>
              row.module === perm.module &&
              (row.roleId === role.id || (!row.roleId && row.roleCode === role.code)),
          );

          const permRow: RolePermissionRow = {
            id: existing?.id ?? `PQ-${Date.now()}-${perm.module}`,
            storeId: existing?.storeId ?? role.storeId,
            roleId: role.id,
            roleCode: role.code,
            module: perm.module,
            canView: perm.canView,
            canCreate: perm.canCreate,
            canUpdate: perm.canUpdate,
            canDelete: perm.canDelete,
            canApprove: perm.canApprove,
          };

          return staffPermissionService.update(permRow.id, permRow, { bypassAutoLog: true }).then(() => permRow);
        });

        const savedPermissions = await Promise.all(permissionTasks);

        // 3. Update local state
        if (isCreating) {
          setRoles((prev) => toSortedRoles([...prev, role]));
        } else {
          setRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
        }

        setPermissionRows((prev) => {
          // Replace existing or add new
          const existingIds = new Set(savedPermissions.map((p) => p.id));
          const remaining = prev.filter((row) => !existingIds.has(row.id));
          return toSortedPermissions([...remaining, ...savedPermissions]);
        });

        toastSuccess(isCreating ? 'Đã tạo vai trò và phân quyền.' : 'Đã cập nhật phân quyền.');
      } catch (error) {
        console.error('Failed to save role with permissions:', error);
        toastError('Không thể lưu vai trò và phân quyền. Vui lòng kiểm tra quyền ghi Firestore.');
      }
    },
    [isOwner, roles, permissionRows, defaultStoreId],
  );

  const handleDeleteRole = useCallback(
    async (role: StaffRole) => {
      if (!isOwner) {
        toastError('Bạn không có quyền xoá vai trò.');
        return;
      }

      // Check if any staff is using this role
      const staffUsingRole = staffList.filter(
        (s) => s.role === role.code || s.roleId === role.id,
      );
      if (staffUsingRole.length > 0) {
        toastError(
          `Không thể xoá vai trò "${role.name}" vì đang có ${staffUsingRole.length} nhân sự sử dụng.`,
        );
        return;
      }

      const confirmed = window.confirm(
        `Xoá vai trò "${role.name}" (${role.code})? Tất cả phân quyền liên quan sẽ bị xoá.`,
      );
      if (!confirmed) return;

      try {
        // 1. Delete all permission rows for this role (bypass auto log to avoid spamming)
        const relatedPermissions = permissionRows.filter(
          (row) => row.roleId === role.id || row.roleCode === role.code,
        );
        await Promise.all(
          relatedPermissions.map((perm) => staffPermissionService.delete(perm.id, { bypassAutoLog: true })),
        );

        // 2. Delete the role itself with custom log details
        await roleService.delete(role.id, {
          logDetails: `Đã xoá vai trò ${role.name} (${role.code}) cùng ${relatedPermissions.length} phân quyền.`,
        });

        // 3. Update local state
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        setPermissionRows((prev) =>
          prev.filter((row) => row.roleId !== role.id && row.roleCode !== role.code),
        );

        toastSuccess(`Đã xoá vai trò "${role.name}" và ${relatedPermissions.length} phân quyền liên quan.`);
      } catch (error) {
        console.error('Failed to delete role:', error);
        toastError('Không thể xoá vai trò. Vui lòng kiểm tra quyền ghi Firestore.');
      }
    },
    [isOwner, staffList, permissionRows],
  );

  const handleCreateStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner) {
      toastError('Bạn không có quyền thao tác với tài khoản nhân sự.');
      return;
    }

    const isEditMode = Boolean(staffForm.id);

    const fullName = staffForm.fullName.trim();
    const username = staffForm.username.trim();
    const password = staffForm.password;
    const selectedRoleCode = toRoleCode(staffForm.role);
    const selectedRole = roleByCode.get(selectedRoleCode);

    if (!fullName || !username || (!isEditMode && !password)) {
      toastError('Vui lòng nhập đủ họ tên, tên đăng nhập và mật khẩu.');
      return;
    }

    if (!isEditMode && password && password.length < 6) {
      toastError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (isEditMode && password && password.length > 0 && password.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (!selectedRole) {
      toastError('Vai trò chưa tồn tại. Vui lòng tạo vai trò trước trong tab Phân quyền.');
      return;
    }

    const usernameExists = staffList.some(
      (item: StaffMember) =>
        normalizeUsername(item.username) === normalizeUsername(username) &&
        (!isEditMode || item.id !== staffForm.id),
    );
    if (usernameExists) {
      toastError('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
      return;
    }

    try {
      const existingStaff = isEditMode ? staffList.find((s) => s.id === staffForm.id) : null;
      const id = staffForm.id || nextStaffId(staffList);
      const storeId = staffList[0]?.storeId ?? DEFAULT_STORE_ID;
      const usernameNormalized = normalizeUsername(username);
      const authEmail = (staffForm.email.trim() || `${usernameNormalized}@mrtaocoop.com`).toLowerCase();
      const currentAuthEmail = (
        existingStaff?.authEmail ||
        existingStaff?.email ||
        `${normalizeUsername(existingStaff?.username || username)}@mrtaocoop.com`
      ).toLowerCase();
      const shouldSyncExistingAuth =
        isEditMode &&
        Boolean(existingStaff) &&
        (Boolean(password) || authEmail !== currentAuthEmail);

      let firebaseUid = existingStaff?.firebaseUid || '';

      if (!isEditMode && password) {
        const authUser = await ensureFirebasePasswordUser(authEmail, password);
        firebaseUid = authUser.uid;
      }

      if (shouldSyncExistingAuth) {
        if (!isStaffAuthGasConfigured()) {
          toastError(
            'Chưa cấu hình Apps Script cho cập nhật email hoặc mật khẩu nhân sự. Vui lòng kiểm tra VITE_GAS_STAFF_AUTH_URL.',
          );
          return;
        }

        const authUser = await syncStaffAuthViaGas({
          authEmail,
          currentAuthEmail,
          firebaseUid: existingStaff?.firebaseUid,
          password: password || undefined,
          allowCreate: Boolean(password),
        });
        firebaseUid = authUser.uid;
      }

      const payload: StaffMember = {
        avatar: DEFAULT_AVATAR,
        pin: '1234',
        employeeCode: `MNS-${id.replace('NV-', '')}`,
        ...existingStaff,
        id,
        storeId,
        fullName,
        role: selectedRole.code,
        roleId: selectedRole.id,
        username: usernameNormalized,
        usernameNormalized,
        authEmail,
        phone: staffForm.phone.trim(),
        status: staffForm.status,
        joinedDate: existingStaff?.joinedDate || new Date().toISOString().slice(0, 10),
        email: authEmail,
        firebaseUid,
        internalNotes: staffForm.internalNotes?.trim() || '',
      };

      await staffService.update(payload.id, payload, {
        logDetails: isEditMode
          ? `Đã cập nhật nhân sự ${payload.fullName} (${payload.id}).`
          : `Đã tạo nhân sự ${payload.fullName} (${payload.id}) với vai trò ${payload.role}.`,
      });

      if (isEditMode) {
        setStaffList((prev: StaffMember[]) =>
          prev.map((item) => (item.id === payload.id ? payload : item)),
        );
        toastSuccess('Đã cập nhật thông tin nhân sự.');
      } else {
        setStaffList((prev: StaffMember[]) => toSortedStaff([...prev, payload]));
        toastSuccess('Đã thêm nhân sự mới.');
      }

      setStaffForm(DEFAULT_STAFF_FORM);
      setShowAddStaffForm(false);
    } catch (error) {
      console.error('Failed to create/edit staff:', error);

      if (error instanceof StaffAuthGasError) {
        toastError(error.message);
        return;
      }

      if (error instanceof FirebaseIdentityToolkitError) {
        if (error.code.includes('WEAK_PASSWORD')) {
          toastError('Mật khẩu yếu. Vui lòng nhập mật khẩu mạnh hơn (tối thiểu 6 ký tự).');
          return;
        }

        if (error.code === 'INVALID_PASSWORD' || error.code === 'INVALID_LOGIN_CREDENTIALS') {
          toastError(
            'Email đã tồn tại trên Firebase Auth với mật khẩu khác. Hãy đặt lại mật khẩu tại Firebase Console.',
          );
          return;
        }

        toastError(
          `Không thể tạo tài khoản Firebase Auth (${error.code}). Hãy kiểm tra Authentication > Email/Password.`,
        );
        return;
      }

      toastError('Không thể cập nhật nhân sự. Vui lòng kiểm tra quyền ghi Firestore.');
    }
  };

  const handleEditStaff = useCallback((staff: StaffMember) => {
    setStaffForm({
      id: staff.id,
      fullName: staff.fullName,
      username: staff.username,
      role: staff.role,
      phone: staff.phone || '',
      status: staff.status,
      email: staff.email || '',
      password: '',
      internalNotes: staff.internalNotes || '',
    });
    setShowAddStaffForm(true);
  }, []);

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (!isOwner) {
      toastError('Bạn không có quyền đổi trạng thái nhân sự.');
      return;
    }

    if (
      staff.username?.toLowerCase() === 'admin' ||
      staff.role?.toLowerCase() === 'admin'
    ) {
      toastError('Không thể thay đổi trạng thái tài khoản Admin hệ thống.');
      return;
    }

    const next: StaffMember = {
      ...staff,
      status: staff.status === 'active' ? 'inactive' : 'active',
    };

    try {
      await staffService.update(next.id, next, {
        logDetails: `Đã đổi trạng thái nhân sự ${staff.fullName} (${staff.id}) sang ${next.status}.`,
      });
      setStaffList((prev: StaffMember[]) => prev.map((item: StaffMember) => (item.id === next.id ? next : item)));
      toastSuccess('Đã cập nhật trạng thái nhân sự.');
    } catch (error) {
      console.error('Failed to update staff status:', error);
      toastError('Không thể cập nhật trạng thái nhân sự.');
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!isOwner) {
      toastError('Bạn không có quyền xóa nhân sự.');
      return;
    }

    if (
      staff.username?.toLowerCase() === 'admin' ||
      staff.role?.toLowerCase() === 'admin'
    ) {
      toastError('Không thể xóa tài khoản Admin hệ thống.');
      return;
    }

    const confirmed = window.confirm(`Xóa nhân sự ${staff.fullName} (${staff.id})?`);
    if (!confirmed) {
      return;
    }

    try {
      await staffService.delete(staff.id, {
        logDetails: `Đã xóa nhân sự ${staff.fullName} (${staff.id}).`,
      });
      setStaffList((prev: StaffMember[]) => prev.filter((item: StaffMember) => item.id !== staff.id));
      toastSuccess('Đã xóa nhân sự.');
    } catch (error) {
      console.error('Failed to delete staff:', error);
      toastError('Không thể xóa nhân sự.');
    }
  };

  const handleToggleModulePermission = async (
    role: StaffRole,
    moduleCode: string,
    field: PermissionField,
  ) => {
    if (!isOwner) {
      toastError('Bạn không có quyền chỉnh sửa phân quyền.');
      return;
    }

    const existed = permissionRows.find(
      (row: RolePermissionRow) =>
        row.module === moduleCode &&
        (row.roleId === role.id || (!row.roleId && row.roleCode === role.code)),
    );

    const storeId =
      existed?.storeId ?? permissionRows[0]?.storeId ?? staffList[0]?.storeId ?? role.storeId ?? DEFAULT_STORE_ID;

    const next: RolePermissionRow = {
      id: existed?.id ?? `PQ-${Date.now()}`,
      storeId,
      roleId: role.id,
      roleCode: role.code,
      module: moduleCode,
      canView: existed?.canView ?? false,
      canCreate: existed?.canCreate ?? false,
      canUpdate: existed?.canUpdate ?? false,
      canDelete: existed?.canDelete ?? false,
      canApprove: existed?.canApprove ?? false,
      [field]: existed ? !existed[field] : true,
    };

    try {
      await staffPermissionService.update(next.id, next, {
        logDetails: `${existed ? 'Đã cập nhật' : 'Đã tạo'} quyền ${field} cho vai trò ${role.code} trên module ${moduleCode}.`,
      });
      setPermissionRows((prev: RolePermissionRow[]) => {
        if (!existed) {
          return toSortedPermissions([...prev, next]);
        }

        return prev.map((item: RolePermissionRow) => (item.id === next.id ? next : item));
      });
      toastSuccess('Đã cập nhật phân quyền.');
    } catch (error) {
      console.error('Failed to update permission row:', error);
      toastError('Không thể cập nhật phân quyền.');
    }
  };

  const handleClearLogs = useCallback(async () => {
    if (!isOwner) {
      toastError('Bạn không có quyền xóa nhật ký hệ thống.');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử log hệ thống?')) {
      return;
    }

    try {
      const allLogs = await systemLogService.getAll();
      const deleteTasks = allLogs
        .filter((log) => Boolean(log?.id))
        .map((log) => systemLogService.delete(log.id));

      await Promise.all(deleteTasks);
      setLogs([]);
      toastSuccess('Đã xóa toàn bộ nhật ký hệ thống.');
    } catch (error) {
      console.error('Failed to clear system logs:', error);
      toastError('Không thể xóa log hệ thống.');
    }
  }, [isOwner]);

  const handleOpenAddStaffDialog = useCallback(() => {
    setStaffForm(DEFAULT_STAFF_FORM);
    setShowAddStaffForm(true);
  }, []);

  const handleOpenRoleDialog = useCallback(() => {
    setShowRoleDialog(true);
  }, []);

  return (
    <div className="space-y-4 bg-[radial-gradient(circle_at_top_right,_rgba(16,124,65,0.08),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(2,132,199,0.08),_transparent_28%)] pb-6 text-left">
      <StaffPermissionsHeader
        activeTab={activeTab}
        isRefreshing={isRefreshing}
        isOwner={isOwner}
        showAddStaffForm={showAddStaffForm}
        staffCount={staffList.length}
        permissionCount={permissionRows.length}
        logCount={logs.length}
        onReload={() => void loadAuthorityData(true)}
        onSetActiveTab={setActiveTab}
        onOpenAddStaffDialog={handleOpenAddStaffDialog}
        onOpenRoleDialog={handleOpenRoleDialog}
        onClearLogs={() => void handleClearLogs()}
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <Skeleton className="h-[520px] w-full rounded-[28px]" />
        </div>
      ) : activeTab === 'staff' ? (
        <StaffTabContent
          staffSearch={staffSearch}
          staffRoleFilter={staffRoleFilter}
          roleOptions={roleOptions}
          showAddStaffForm={showAddStaffForm}
          staffForm={staffForm}
          totalStaff={staffList.length}
          activeStaffCount={activeStaffCount}
          isOwner={isOwner}
          filteredStaff={filteredStaff}
          onStaffSearchChange={setStaffSearch}
          onStaffRoleFilterChange={setStaffRoleFilter}
          onSubmitCreateStaff={handleCreateStaff}
          onCancelAddStaffForm={() => setShowAddStaffForm(false)}
          onToggleStaffStatus={(staff) => void handleToggleStaffStatus(staff)}
          onDeleteStaff={(staff) => void handleDeleteStaff(staff)}
          setStaffForm={setStaffForm}
          onEditStaff={handleEditStaff}
        />
      ) : activeTab === 'permissions' ? (
        <PermissionsTabContent
          roles={roles}
          permissionRows={permissionRows}
          isOwner={isOwner}
          storeId={defaultStoreId}
          onSaveRoleWithPermissions={handleSaveRoleWithPermissions}
          onDeleteRole={handleDeleteRole}
          externalCreateOpen={showRoleDialog}
          onExternalCreateOpenChange={setShowRoleDialog}
        />
      ) : (
        <LogsTabContent logs={logs} isOwner={isOwner} onClearLogs={handleClearLogs} />
      )}
    </div>
  );
}
