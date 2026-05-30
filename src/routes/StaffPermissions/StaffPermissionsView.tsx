import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '../../shared/components/skeleton';
import { roleService, staffPermissionService, staffService } from '../../services/admin';
import {
  ensureFirebasePasswordUser,
  FirebaseIdentityToolkitError,
} from '../../services/firebase-auth-service';
import { systemLogService } from '../../services/system-log-service';
import type { RolePermissionRow, StaffMember, StaffRole } from '../../types/staff.types';
import { DEFAULT_AVATAR } from '../../constants';
import { DEFAULT_STORE_ID } from '../../data';
import {
  LogsTabContent,
  PermissionsTabContent,
  StaffPermissionsHeader,
  StaffPermissionsMessage,
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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

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

  useEffect(() => {
    if (!successToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessToast('');
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successToast]);

  const showSuccessToast = (message: string) => {
    setSuccessToast(message);
  };

  const addLog = async (actionType: SystemLogActionType, target: string, details: string) => {
    const newLog: SystemLog = {
      id: `LOG-${Date.now()}`,
      storeId: staffList[0]?.storeId ?? DEFAULT_STORE_ID,
      timestamp: new Date().toISOString(),
      actor: currentUser?.fullName || 'Hệ thống',
      role: currentUser?.role || 'Không xác định',
      actionType,
      target,
      details,
    };

    setLogs((prev: SystemLog[]) => [newLog, ...prev]);

    try {
      await systemLogService.update(newLog.id, newLog);
    } catch (error) {
      console.error('Failed to persist system log:', error);
    }
  };

  const loadAuthorityData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage('');

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

      void addLog(
        'SYNC',
        'Đồng bộ',
        refresh ? 'Đã tải lại danh sách nhân sự, vai trò, phân quyền và log hệ thống.' : 'Đã tải dữ liệu hệ thống từ Firestore.',
      );
    } catch (error) {
      console.error('Failed to load staff permissions data:', error);
      setErrorMessage('Không thể tải dữ liệu phân quyền từ Firestore. Vui lòng kiểm tra cấu hình và quyền truy cập.');
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
    return roles.map((role) => role.code).sort((a, b) => a.localeCompare(b, 'vi'));
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
        setErrorMessage('Bạn không có quyền thao tác.');
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
          setErrorMessage('Mã vai trò đã tồn tại.');
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
        role = editingRole;
      }

      try {
        // 1. Save role (create or update)
        await roleService.update(role.id, role);

        // 2. Batch save permissions
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

          return staffPermissionService.update(permRow.id, permRow).then(() => permRow);
        });

        const savedPermissions = await Promise.all(permissionTasks);

        // 3. Update local state
        if (isCreating) {
          setRoles((prev) => toSortedRoles([...prev, role]));
        }

        setPermissionRows((prev) => {
          // Replace existing or add new
          const existingIds = new Set(savedPermissions.map((p) => p.id));
          const remaining = prev.filter((row) => !existingIds.has(row.id));
          return toSortedPermissions([...remaining, ...savedPermissions]);
        });

        showSuccessToast(isCreating ? 'Đã tạo vai trò và phân quyền.' : 'Đã cập nhật phân quyền.');
        void addLog(
          isCreating ? 'CREATE' : 'UPDATE',
          'Vai trò & Phân quyền',
          isCreating
            ? `Đã tạo vai trò ${role.name} (${role.code}) với ${savedPermissions.length} module.`
            : `Đã cập nhật phân quyền vai trò ${role.name} (${role.code}).`,
        );
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to save role with permissions:', error);
        setErrorMessage('Không thể lưu vai trò và phân quyền. Vui lòng kiểm tra quyền ghi Firestore.');
      }
    },
    [isOwner, roles, permissionRows, defaultStoreId],
  );

  const handleCreateStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner) {
      setErrorMessage('Bạn không có quyền thao tác với tài khoản nhân sự.');
      return;
    }

    const fullName = staffForm.fullName.trim();
    const username = staffForm.username.trim();
    const password = staffForm.password;
    const selectedRoleCode = toRoleCode(staffForm.role);
    const selectedRole = roleByCode.get(selectedRoleCode);

    if (!fullName || !username || !password) {
      setErrorMessage('Vui lòng nhập đủ họ tên, tên đăng nhập và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (!selectedRole) {
      setErrorMessage('Vai trò chưa tồn tại. Vui lòng tạo vai trò trước trong tab Phân quyền.');
      return;
    }

    const usernameExists = staffList.some(
      (item: StaffMember) => normalizeUsername(item.username) === normalizeUsername(username),
    );
    if (usernameExists) {
      setErrorMessage('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
      return;
    }

    const id = nextStaffId(staffList);
    const storeId = staffList[0]?.storeId ?? DEFAULT_STORE_ID;
    const usernameNormalized = normalizeUsername(username);
    const authEmail = (staffForm.email.trim() || `${usernameNormalized}@mrtaocoop.com`).toLowerCase();
    const payload: StaffMember = {
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
      joinedDate: new Date().toISOString().slice(0, 10),
      email: authEmail,
      password,
      pin: '1234',
      employeeCode: `MNS-${id.replace('NV-', '')}`,
      avatar: DEFAULT_AVATAR,
    };

    try {
      const authUser = await ensureFirebasePasswordUser(authEmail, password);
      const staffPayload: StaffMember = {
        ...payload,
        firebaseUid: authUser.uid,
      };
      await staffService.update(staffPayload.id, staffPayload);
      setStaffList((prev: StaffMember[]) => toSortedStaff([...prev, staffPayload]));
      setStaffForm(DEFAULT_STAFF_FORM);
      setShowAddStaffForm(false);
      showSuccessToast(`Đã thêm nhân sự mới (${authUser.status}).`);
      void addLog('CREATE', 'Nhân sự', `Đã tạo nhân sự ${staffPayload.fullName} (${staffPayload.id}) với vai trò ${staffPayload.role}.`);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to create staff:', error);

      if (error instanceof FirebaseIdentityToolkitError) {
        if (error.code.includes('WEAK_PASSWORD')) {
          setErrorMessage('Mật khẩu yếu. Vui lòng nhập mật khẩu mạnh hơn (tối thiểu 6 ký tự).');
          return;
        }

        if (error.code === 'INVALID_PASSWORD' || error.code === 'INVALID_LOGIN_CREDENTIALS') {
          setErrorMessage(
            'Email đã tồn tại trên Firebase Auth với mật khẩu khác. Hãy đặt lại mật khẩu tại Firebase Console.',
          );
          return;
        }

        setErrorMessage(
          `Không thể tạo tài khoản Firebase Auth (${error.code}). Hãy kiểm tra Authentication > Email/Password.`,
        );
        return;
      }

      setErrorMessage('Không thể thêm nhân sự. Vui lòng kiểm tra quyền ghi Firestore.');
    }
  };

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (!isOwner) {
      setErrorMessage('Bạn không có quyền đổi trạng thái nhân sự.');
      return;
    }

    const next: StaffMember = {
      ...staff,
      status: staff.status === 'active' ? 'inactive' : 'active',
    };

    try {
      await staffService.update(next.id, next);
      setStaffList((prev: StaffMember[]) => prev.map((item: StaffMember) => (item.id === next.id ? next : item)));
      showSuccessToast('Đã cập nhật trạng thái nhân sự.');
      void addLog('UPDATE', 'Nhân sự', `Đã đổi trạng thái nhân sự ${staff.fullName} (${staff.id}) sang ${next.status}.`);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update staff status:', error);
      setErrorMessage('Không thể cập nhật trạng thái nhân sự.');
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!isOwner) {
      setErrorMessage('Bạn không có quyền xóa nhân sự.');
      return;
    }

    const confirmed = window.confirm(`Xóa nhân sự ${staff.fullName} (${staff.id})?`);
    if (!confirmed) {
      return;
    }

    try {
      await staffService.delete(staff.id);
      setStaffList((prev: StaffMember[]) => prev.filter((item: StaffMember) => item.id !== staff.id));
      showSuccessToast('Đã xóa nhân sự.');
      void addLog('DELETE', 'Nhân sự', `Đã xóa nhân sự ${staff.fullName} (${staff.id}).`);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to delete staff:', error);
      setErrorMessage('Không thể xóa nhân sự.');
    }
  };

  const handleToggleModulePermission = async (
    role: StaffRole,
    moduleCode: string,
    field: PermissionField,
  ) => {
    if (!isOwner) {
      setErrorMessage('Bạn không có quyền chỉnh sửa phân quyền.');
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
      await staffPermissionService.update(next.id, next);
      setPermissionRows((prev: RolePermissionRow[]) => {
        if (!existed) {
          return toSortedPermissions([...prev, next]);
        }

        return prev.map((item: RolePermissionRow) => (item.id === next.id ? next : item));
      });
      showSuccessToast('Đã cập nhật phân quyền.');
      void addLog(
        existed ? 'UPDATE' : 'CREATE',
        'Phân quyền',
        `${existed ? 'Đã cập nhật' : 'Đã tạo'} quyền ${field} cho vai trò ${role.code} trên module ${moduleCode}.`,
      );
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update permission row:', error);
      setErrorMessage('Không thể cập nhật phân quyền.');
    }
  };

  const handleClearLogs = async () => {
    if (!isOwner) {
      setErrorMessage('Bạn không có quyền xóa nhật ký hệ thống.');
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
      showSuccessToast('Đã xóa toàn bộ nhật ký hệ thống.');
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to clear system logs:', error);
      setErrorMessage('Không thể xóa log hệ thống.');
    }
  };

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

      <StaffPermissionsMessage errorMessage={errorMessage} />

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
        />
      ) : activeTab === 'permissions' ? (
        <PermissionsTabContent
          roles={roles}
          permissionRows={permissionRows}
          isOwner={isOwner}
          storeId={defaultStoreId}
          onSaveRoleWithPermissions={handleSaveRoleWithPermissions}
          externalCreateOpen={showRoleDialog}
          onExternalCreateOpenChange={setShowRoleDialog}
        />
      ) : (
        <LogsTabContent logs={logs} isOwner={isOwner} />
      )}

      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-[0_18px_34px_-20px_rgba(16,124,65,0.7)]">
          {successToast}
        </div>
      )}
    </div>
  );
}
