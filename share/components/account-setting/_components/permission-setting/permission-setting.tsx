import { Checkbox } from '@shared/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui';
import { usePermissions } from '../../_hooks/use-permissions';
import { IPermission } from '../../../../types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ModulePermission {
  moduleKey: string;
  moduleName: string;
  permissions: IPermission[];
  hasView: boolean;
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  otherPermissions: Array<{ permission: IPermission; label: string }>;
  totalPermissions: number;
  grantedPermissions: number;
}

export function PermissionSettingContent() {
  const { t } = useTranslation('accountSetting');
  const { getMyPermissionsQuery } = usePermissions();

  const modulePermissions = useMemo(() => {
    const myPermissions = (getMyPermissionsQuery.data?.data ?? []) as IPermission[];

    // Group permissions by module
    const groupedByModule = new Map<string, IPermission[]>();
    myPermissions.forEach((perm) => {
      const moduleKey = perm.moduleKey || perm.module || 'unknown';
      if (!groupedByModule.has(moduleKey)) {
        groupedByModule.set(moduleKey, []);
      }
      groupedByModule.get(moduleKey)!.push(perm);
    });

    // Process each module
    const result: ModulePermission[] = [];
    groupedByModule.forEach((permissions, moduleKey) => {
      const modulePermission: ModulePermission = {
        moduleKey,
        moduleName: permissions[0]?.module || moduleKey,
        permissions,
        hasView: false,
        hasCreate: false,
        hasUpdate: false,
        hasDelete: false,
        otherPermissions: [],
        totalPermissions: permissions.length,
        grantedPermissions: permissions.length,
      };

      permissions.forEach((perm) => {
        const displayNameKey = perm.displayNameKey.toLowerCase();
        if (displayNameKey === 'view') {
          modulePermission.hasView = true;
        } else if (displayNameKey === 'create') {
          modulePermission.hasCreate = true;
        } else if (displayNameKey === 'update') {
          modulePermission.hasUpdate = true;
        } else if (displayNameKey === 'delete') {
          modulePermission.hasDelete = true;
        } else {
          // Other permissions (Lock, Extend, Approve, etc.)
          const label = perm.displayName || perm.displayNameKey;
          modulePermission.otherPermissions.push({ permission: perm, label });
        }
      });

      result.push(modulePermission);
    });

    // Sort by module name
    result.sort((a, b) => a.moduleName.localeCompare(b.moduleName));

    return result;
  }, [getMyPermissionsQuery.data]);

  const getOtherPermissionLabel = (displayName: string, displayNameKey: string): string => {
    const key = displayNameKey.toLowerCase();
    if (key === 'lock') return t('permissions.otherPermissions.lock');
    if (key === 'extend') return t('permissions.otherPermissions.extend');
    if (key === 'approve') return t('permissions.otherPermissions.approve');
    if (key === 'export' || displayName.toLowerCase().includes('export')) {
      return t('permissions.otherPermissions.export');
    }
    if (key === 'manage' || displayName.toLowerCase().includes('manage')) {
      return t('permissions.otherPermissions.manage');
    }
    if (key === 'view' && displayName.toLowerCase().includes('detail')) {
      return t('permissions.otherPermissions.viewDetails');
    }
    return displayName || displayNameKey;
  };

  if (getMyPermissionsQuery.isFetching) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('permissions.title')}</h2>
        <p className="text-muted-foreground mb-6">{t('permissions.description')}</p>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t('message:loading')}</div>
        </div>
      </div>
    );
  }

  if (getMyPermissionsQuery.isError) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('permissions.title')}</h2>
        <p className="text-muted-foreground mb-6">{t('permissions.description')}</p>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-destructive">{t('message:error')}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{t('permissions.title')}</h2>
      <p className="text-muted-foreground mb-6">{t('permissions.description')}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">{t('permissions.table.module')}</TableHead>
            <TableHead className="w-[100px] text-center">{t('permissions.table.view')}</TableHead>
            <TableHead className="w-[100px] text-center">{t('permissions.table.add')}</TableHead>
            <TableHead className="w-[100px] text-center">{t('permissions.table.edit')}</TableHead>
            <TableHead className="w-[100px] text-center">{t('permissions.table.delete')}</TableHead>
            <TableHead className="w-[200px] text-center">{t('permissions.table.other')}</TableHead>
            <TableHead className="w-[100px] text-center">{t('permissions.table.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modulePermissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('message:noData')}
              </TableCell>
            </TableRow>
          ) : (
            modulePermissions.map((modulePerm) => (
              <TableRow key={modulePerm.moduleKey}>
                <TableCell className="font-medium">{modulePerm.moduleName}</TableCell>
                <TableCell className="text-center">
                  <Checkbox checked={modulePerm.hasView} disabled />
                </TableCell>
                <TableCell className="text-center">
                  {modulePerm.hasCreate ? (
                    <Checkbox checked={modulePerm.hasCreate} disabled />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {modulePerm.hasUpdate ? (
                    <Checkbox checked={modulePerm.hasUpdate} disabled />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {modulePerm.hasDelete ? (
                    <Checkbox checked={modulePerm.hasDelete} disabled />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {modulePerm.otherPermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-center items-center">
                      {modulePerm.otherPermissions.map((other, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border"
                        >
                          <Checkbox checked disabled className="h-3 w-3" />
                          <span className="text-xs font-medium text-foreground whitespace-nowrap">
                            {getOtherPermissionLabel(
                              other.permission.displayName ?? other.permission.displayNameKey,
                              other.permission.displayNameKey,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {modulePerm.grantedPermissions}/{modulePerm.totalPermissions}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
