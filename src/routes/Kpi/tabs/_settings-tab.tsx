import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { Button } from '../../../shared/components/button';
import { Alert, AlertTitle, AlertDescription } from '../../../../share/ui/alert';
import { ConfigDialog, type ConfigDialogMode } from '../components/_config-dialog';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import { normalizeRole, formatValue, getDaysInMonthCount, getPreviousMonthYear } from '../kpi-utils';
import type { StaffRole } from '../../../types/staff.types';
import type { KPIConfig, KPIGoal } from '../../../types/kpi.types';

interface SettingsTabProps {
  roles: StaffRole[];
  kpiConfigs: KPIConfig[];
  selectedMonthYear: string;
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  goals: KPIGoal[];
  onCreateGoal: (name: string) => Promise<any>;
  onDeleteGoal: (id: string) => Promise<any>;
}

export const SettingsTab = React.memo(function SettingsTab({
  roles,
  kpiConfigs,
  selectedMonthYear,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  goals,
  onCreateGoal,
  onDeleteGoal,
}: SettingsTabProps) {
  // Role selection
  const [selectedSettingRole, setSelectedSettingRole] = useState<string>(roles[0]?.code || '');

  // Dialog states
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configDialogMode, setConfigDialogMode] = useState<ConfigDialogMode>('create');
  const [editingConfig, setEditingConfig] = useState<KPIConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Goal category states
  const [deletingGoal, setDeletingGoal] = useState<KPIGoal | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Derived
  const daysInMonthCount = getDaysInMonthCount(selectedMonthYear);
  const selectedRoleName = useMemo(() => {
    const roleObj = roles.find(r => r.code === selectedSettingRole);
    return roleObj ? roleObj.name : selectedSettingRole;
  }, [roles, selectedSettingRole]);

  const filteredConfigs = useMemo(
    () => kpiConfigs.filter(
      c => normalizeRole(c.role) === normalizeRole(selectedSettingRole) &&
           (c.month || '2026-06') === selectedMonthYear
    ),
    [kpiConfigs, selectedSettingRole, selectedMonthYear]
  );

  const totalWeight = useMemo(
    () => filteredConfigs.reduce((sum, c) => sum + c.weight, 0),
    [filteredConfigs]
  );

  // Check if copy from previous month is needed
  const prevMonthConfigs = useMemo(() => {
    const prevMonth = getPreviousMonthYear(selectedMonthYear);
    return kpiConfigs.filter(
      c => normalizeRole(c.role) === normalizeRole(selectedSettingRole) &&
           (c.month || '2026-06') === prevMonth
    );
  }, [kpiConfigs, selectedSettingRole, selectedMonthYear]);

  const showCopyBanner = filteredConfigs.length === 0 && prevMonthConfigs.length > 0;

  // Handlers
  const handleOpenAddDialog = useCallback(() => {
    setConfigDialogMode('create');
    setEditingConfig(null);
    setIsConfigDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((config: KPIConfig) => {
    setConfigDialogMode('edit');
    setEditingConfig(config);
    setIsConfigDialogOpen(true);
  }, []);

  const handleOpenViewDialog = useCallback((config: KPIConfig) => {
    setConfigDialogMode('view');
    setEditingConfig(config);
    setIsConfigDialogOpen(true);
  }, []);

  const handleDeleteConfig = useCallback((config: KPIConfig) => {
    setDeleteTarget({ id: config.id, name: config.kpiName });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget) {
      await onDeleteConfig(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDeleteConfig]);

  const handleAddNewGoal = useCallback(async (name: string) => {
    await onCreateGoal(name);
  }, [onCreateGoal]);

  const handleDeleteGoalRequest = useCallback((name: string) => {
    const goalObj = goals.find(g => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (goalObj) {
      setDeletingGoal(goalObj);
    }
  }, [goals]);

  const handleConfirmDeleteGoal = useCallback(async () => {
    if (deletingGoal) {
      await onDeleteGoal(deletingGoal.id);
      setDeletingGoal(null);
    }
  }, [deletingGoal, onDeleteGoal]);

  const roleOptions = useMemo(() => {
    return roles.map(role => ({
      label: role.name,
      value: role.code
    }));
  }, [roles]);

  const handleRoleChangeValue = useCallback((val: string | number) => {
    setSelectedSettingRole(String(val));
  }, []);

  const handleConfigSubmit = useCallback(async (data: {
    goalName: string;
    kpiName: string;
    unit: string;
    monthlyTarget: number;
    weight: number;
    proofSource: string;
  }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (configDialogMode === 'edit' && editingConfig) {
        const updatedConfig: KPIConfig = {
          ...editingConfig,
          ...data,
          dailyTarget: Math.round(data.monthlyTarget / daysInMonthCount),
        };
        await onUpdateConfig(updatedConfig);
      } else {
        const newConfig: KPIConfig = {
          id: `${selectedSettingRole}_${Date.now()}`,
          storeId: '',
          role: selectedSettingRole,
          ...data,
          dailyTarget: Math.round(data.monthlyTarget / daysInMonthCount),
          month: selectedMonthYear,
        };
        await onCreateConfig(newConfig);
      }
      setIsConfigDialogOpen(false);
    } catch (err) {
      console.error('Failed to submit KPI config:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, configDialogMode, editingConfig, selectedSettingRole, selectedMonthYear, daysInMonthCount, onCreateConfig, onUpdateConfig]);

  const handleCopyFromPrevMonth = useCallback(async () => {
    if (isCopying || prevMonthConfigs.length === 0) return;
    setIsCopying(true);
    try {
      await Promise.all(
        prevMonthConfigs.map(async (prev) => {
          const newConfig: KPIConfig = {
            ...prev,
            id: `${prev.role}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            month: selectedMonthYear,
            dailyTarget: Math.round(prev.monthlyTarget / daysInMonthCount),
          };
          await onCreateConfig(newConfig);
        })
      );
    } catch (err) {
      console.error('Failed to copy KPI configs:', err);
    } finally {
      setIsCopying(false);
    }
  }, [isCopying, prevMonthConfigs, selectedMonthYear, daysInMonthCount, onCreateConfig]);

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left">
              <CardTitle className="text-base font-bold text-slate-800 tracking-wider">CẤU HÌNH KPI THEO VAI TRÒ</CardTitle>
              <CardDescription className="text-sm font-semibold text-slate-500 mt-1">
                Thiết lập các chỉ số, target tháng and trọng số áp dụng chung cho toàn bộ nhân sự theo vai trò.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              {/* Role selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-500 uppercase shrink-0">Vai trò:</span>
                <CustomSelect
                  options={roleOptions}
                  value={selectedSettingRole}
                  onChangeValue={handleRoleChangeValue}
                  clearable={false}
                  className="w-[220px] text-slate-700 font-bold text-sm bg-slate-50"
                />
              </div>

              <Button onClick={handleOpenAddDialog} className="font-bold cursor-pointer h-[38px] rounded-xl text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Thêm chỉ số KPI
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Copy from previous month banner */}
          {showCopyBanner && (
            <Alert className="bg-gradient-to-r from-red-50 to-amber-50 border-red-200/60">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <AlertTitle className="font-bold text-red-700">
                Chưa có cấu hình KPI tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between mt-1">
                <span className="text-sm text-red-600 font-semibold">
                  Đã tìm thấy {prevMonthConfigs.length} chỉ số từ tháng trước. Sao chép để bắt đầu nhanh?
                </span>
                <Button
                  onClick={handleCopyFromPrevMonth}
                  disabled={isCopying}
                  className="font-bold cursor-pointer h-8 px-4 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isCopying ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang sao chép...
                    </>
                  ) : (
                    `Sao chép ${prevMonthConfigs.length} chỉ số`
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Config table */}
          <div className="space-y-3.5">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-left">DANH SÁCH CHỈ SỐ ÁP DỤNG</h4>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <Table className="text-left text-sm">
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-sm font-bold text-slate-700">Mục tiêu chung</TableHead>
                    <TableHead className="text-sm font-bold text-slate-700">Chỉ số KPI</TableHead>
                    <TableHead className="text-sm font-bold text-slate-700">Đơn vị</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Target tháng</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Target ngày (ước tính)</TableHead>
                    <TableHead className="text-right text-sm font-bold text-slate-700">Trọng số (%)</TableHead>
                    <TableHead className="text-sm font-bold text-slate-700">Nguồn đối chứng</TableHead>
                    <TableHead className="w-32 text-right text-sm font-bold text-slate-700">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-500 font-bold text-sm">
                        Vị trí này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConfigs.map(config => (
                      <ConfigTableRow
                        key={config.id}
                        config={config}
                        onView={handleOpenViewDialog}
                        onEdit={handleOpenEditDialog}
                        onDelete={handleDeleteConfig}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Weight summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-sm font-bold text-slate-600">
              <span>Tổng số chỉ số: {filteredConfigs.length}</span>
              <span className={`flex items-center gap-1 ${totalWeight === 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Sparkles className="w-4 h-4 shrink-0" />
                Tổng trọng số vị trí: {(totalWeight * 100).toFixed(0)}%
                {totalWeight !== 1 && ' (Khuyên dùng: Đảm bảo tổng trọng số đạt 100%)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config dialog */}
      <ConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        mode={configDialogMode}
        selectedRole={selectedRoleName}
        selectedMonthYear={selectedMonthYear}
        daysInMonthCount={daysInMonthCount}
        config={editingConfig}
        onSubmit={handleConfigSubmit}
        isSubmitting={isSubmitting}
        goalOptions={goals.map(g => g.name)}
        onAddGoal={handleAddNewGoal}
        onDeleteGoal={handleDeleteGoalRequest}
      />

      {/* Delete confirmation */}
      <ActionConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Xóa chỉ số KPI"
        description={`Bạn có chắc chắn muốn xóa chỉ số "${deleteTarget?.name || ''}"? Thao tác này sẽ ảnh hưởng tới tính toán điểm KPI.`}
        onConfirm={handleConfirmDelete}
        variant="confirm"
      />

      {/* Goal delete confirmation */}
      <ActionConfirmDialog
        open={deletingGoal !== null}
        onOpenChange={(open) => { if (!open) setDeletingGoal(null); }}
        title="Xóa nhóm mục tiêu"
        description={`Bạn có chắc chắn muốn xóa nhóm mục tiêu "${deletingGoal?.name || ''}"? Thao tác này chỉ xóa danh mục gợi ý, không ảnh hưởng tới các chỉ số KPI hiện tại đang dùng nhóm mục tiêu này.`}
        onConfirm={handleConfirmDeleteGoal}
        variant="confirm"
      />
    </section>
  );
});

// ─── Config Table Row ──────────────────────────────────────────
const ConfigTableRow = React.memo(function ConfigTableRow({
  config,
  onView,
  onEdit,
  onDelete,
}: {
  config: KPIConfig;
  onView: (config: KPIConfig) => void;
  onEdit: (config: KPIConfig) => void;
  onDelete: (config: KPIConfig) => void;
}) {
  const handleView = useCallback(() => onView(config), [config, onView]);
  const handleEdit = useCallback(() => onEdit(config), [config, onEdit]);
  const handleDelete = useCallback(() => onDelete(config), [config, onDelete]);

  return (
    <TableRow>
      <TableCell className="font-semibold text-slate-500 text-sm">{config.goalName}</TableCell>
      <TableCell className="font-bold text-slate-800 text-sm">{config.kpiName}</TableCell>
      <TableCell className="text-sm">{config.unit}</TableCell>
      <TableCell className="text-right font-sans font-bold text-sm">
        {formatValue(config.monthlyTarget, config.unit)}
      </TableCell>
      <TableCell className="text-right font-sans text-slate-400 font-semibold text-sm">
        {formatValue(config.dailyTarget, config.unit)}
      </TableCell>
      <TableCell className="text-right text-sm">
        <div className="flex items-center justify-end gap-3">
          <span className="font-sans font-bold text-slate-700 w-10 text-right">
            {`${(config.weight * 100).toFixed(0)}%`}
          </span>
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
            <div 
              className="h-full bg-[#C21A1A] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(config.weight * 100, 100)}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="text-slate-650 text-sm">{config.proofSource}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="icon-xs" onClick={handleView} className="cursor-pointer" title="Xem chi tiết">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleEdit} className="cursor-pointer" title="Chỉnh sửa">
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </Button>
          <Button variant="destructive" size="icon-xs" onClick={handleDelete} className="cursor-pointer" title="Xóa">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
