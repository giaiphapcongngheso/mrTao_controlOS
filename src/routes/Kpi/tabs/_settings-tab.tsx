import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, Eye, Sparkles, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../shared/components/table';
import { MobileCard } from '@/src/components/custom/mobile-card';
import { Button } from '../../../shared/components/button';
import { Alert, AlertTitle, AlertDescription } from '../../../../share/ui/alert';
import { ConfigDialog, type ConfigDialogMode } from '../components/_config-dialog';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import { formatValue, getDaysInMonthCount, getPreviousMonthYear } from '../kpi-utils';
import { toastSuccess, toastError } from '../../../shared/lib/toast';
import type { StaffMember, StaffRole } from '../../../types/staff.types';
import type { KPIConfig, KPIGoal } from '../../../types/kpi.types';

interface SettingsTabProps {
  roles: StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  selectedMonthYear: string;
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  goals: KPIGoal[];
  onCreateGoal: (name: string) => Promise<any>;
  onDeleteGoal: (id: string) => Promise<any>;
  onUpdateRole: (role: StaffRole) => Promise<any>;
}

export const SettingsTab = React.memo(function SettingsTab({
  roles,
  staffMembers,
  kpiConfigs,
  selectedMonthYear,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  goals,
  onCreateGoal,
  onDeleteGoal,
  onUpdateRole,
}: SettingsTabProps) {
  // Staff selection (instead of role)
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffMembers[0]?.id || '');

  // Role Settings State
  const [roleEdits, setRoleEdits] = useState<Record<string, { kpiFund: number; defaultWorkdays: number }>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  React.useEffect(() => {
    const initial: Record<string, { kpiFund: number; defaultWorkdays: number }> = {};
    roles.forEach(r => {
      initial[r.id] = {
        kpiFund: r.kpiFund ?? 0,
        defaultWorkdays: r.defaultWorkdays ?? 30,
      };
    });
    setRoleEdits(initial);
  }, [roles]);

  const handleRoleEditChange = useCallback((roleId: string, field: 'kpiFund' | 'defaultWorkdays', val: number) => {
    setRoleEdits(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [field]: val,
      },
    }));
  }, []);

  const handleSaveRole = useCallback(async (role: StaffRole) => {
    const edits = roleEdits[role.id];
    if (!edits) return;
    setSavingRoleId(role.id);
    try {
      await onUpdateRole({
        ...role,
        kpiFund: edits.kpiFund,
        defaultWorkdays: edits.defaultWorkdays,
      });
      toastSuccess('Lưu thiết lập vai trò thành công', `Đã lưu cấu hình KPI cho vai trò ${role.name}`);
    } catch (err) {
      console.error('Lỗi khi lưu vai trò:', err);
      toastError('Lưu thất bại', 'Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setSavingRoleId(null);
    }
  }, [roleEdits, onUpdateRole]);

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
  const selectedStaffName = useMemo(() => {
    const staffObj = staffMembers.find(s => s.id === selectedStaffId);
    return staffObj ? staffObj.fullName : selectedStaffId;
  }, [staffMembers, selectedStaffId]);

  const filteredConfigs = useMemo(
    () => kpiConfigs.filter(
      c => c.staffId === selectedStaffId &&
           (c.month || '2026-06') === selectedMonthYear
    ),
    [kpiConfigs, selectedStaffId, selectedMonthYear]
  );

  const totalWeight = useMemo(
    () => filteredConfigs.reduce((sum, c) => sum + c.weight, 0),
    [filteredConfigs]
  );

  // Check if copy from previous month is needed
  const prevMonthConfigs = useMemo(() => {
    const prevMonth = getPreviousMonthYear(selectedMonthYear);
    return kpiConfigs.filter(
      c => c.staffId === selectedStaffId &&
           (c.month || '2026-06') === prevMonth
    );
  }, [kpiConfigs, selectedStaffId, selectedMonthYear]);

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

  const staffOptions = useMemo(() => {
    return staffMembers
      .filter(s => s.status === 'active')
      .map(staff => ({
        label: staff.fullName,
        value: staff.id
      }));
  }, [staffMembers]);

  const handleStaffChangeValue = useCallback((val: string | number) => {
    setSelectedStaffId(String(val));
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
          id: `${selectedStaffId}_${Date.now()}`,
          storeId: '',
          staffId: selectedStaffId,
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
  }, [isSubmitting, configDialogMode, editingConfig, selectedStaffId, selectedMonthYear, daysInMonthCount, onCreateConfig, onUpdateConfig]);

  const handleCopyFromPrevMonth = useCallback(async () => {
    if (isCopying || prevMonthConfigs.length === 0) return;
    setIsCopying(true);
    try {
      await Promise.all(
        prevMonthConfigs.map(async (prev) => {
          const newConfig: KPIConfig = {
            ...prev,
            id: `${prev.staffId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
              <CardTitle className="text-base font-bold text-slate-800 tracking-wider">CẤU HÌNH KPI THEO NHÂN VIÊN</CardTitle>
              <CardDescription className="text-sm font-semibold text-slate-500 mt-1">
                Thiết lập các chỉ số, target tháng và trọng số riêng cho từng nhân viên.
              </CardDescription>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
              {/* Staff selector */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm font-bold text-slate-500 uppercase shrink-0">Nhân viên:</span>
                <CustomSelect
                  options={staffOptions}
                  value={selectedStaffId}
                  onChangeValue={handleStaffChangeValue}
                  clearable={false}
                  containerClassName="w-full md:w-[220px]"
                  className="w-full text-slate-700 font-bold text-sm bg-slate-50"
                />
              </div>

              <Button onClick={handleOpenAddDialog} className="w-full md:w-auto font-bold cursor-pointer h-[38px] rounded-xl text-sm justify-center">
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
 
            {/* Desktop View */}
            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs overflow-x-auto">
              <Table className="text-left text-sm min-w-[800px]">
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
                        Nhân viên này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
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

            {/* Mobile View */}
            <div className="block md:hidden space-y-3">
              {filteredConfigs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-bold text-sm border border-dashed border-slate-200 rounded-xl">
                  Nhân viên này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
                </div>
              ) : (
                filteredConfigs.map((config, idx) => (
                  <MobileCard key={config.id} delayIndex={idx} variant="bordered">
                    <MobileCard.Header
                      title={config.kpiName}
                      badge={{
                        text: `Trọng số: ${(config.weight * 100).toFixed(0)}%`,
                        variant: 'info'
                      }}
                    />
                    <MobileCard.Body className="p-3 space-y-2">
                      <MobileCard.Grid
                        cols={2}
                        items={[
                          { label: 'Mục tiêu chung', value: config.goalName },
                          { label: 'Đơn vị tính', value: config.unit },
                          { label: 'Target tháng', value: formatValue(config.monthlyTarget, config.unit) },
                          { label: 'Target ngày', value: formatValue(config.dailyTarget, config.unit) },
                          { label: 'Nguồn đối chứng', value: config.proofSource, fullWidth: true },
                        ]}
                      />
                      {/* Action buttons footer */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                        <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-slate-500 hover:text-slate-800" onClick={() => handleOpenViewDialog(config)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Xem
                        </Button>
                        <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-blue-600 hover:text-blue-800" onClick={() => handleOpenEditDialog(config)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Sửa
                        </Button>
                        <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-red-600 hover:text-red-800" onClick={() => handleDeleteConfig(config)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </MobileCard.Body>
                  </MobileCard>
                ))
              )}
            </div>

            {/* Weight summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-sm font-bold text-slate-600">
              <span>Tổng số chỉ số: {filteredConfigs.length}</span>
              <span className={`flex items-center gap-1 ${totalWeight === 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Sparkles className="w-4 h-4 shrink-0" />
                Tổng trọng số nhân viên: {(totalWeight * 100).toFixed(0)}%
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
        selectedStaffName={selectedStaffName}
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

      {/* Role KPI Allocation Section */}
      <Card className="mt-6">
        <CardHeader className="border-b border-slate-100 text-left">
          <CardTitle className="text-base font-bold text-slate-800 tracking-wider">CẤU HÌNH PHÂN BỔ KPI THEO VAI TRÒ</CardTitle>
          <CardDescription className="text-sm font-semibold text-slate-500 mt-1">
            Thiết lập quỹ KPI tối đa và số ngày công chuẩn làm căn cứ tính lương thưởng KPI cho từng vai trò.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Desktop Table View */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <Table className="text-left text-sm">
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-sm font-bold text-slate-700">Mã vai trò</TableHead>
                  <TableHead className="text-sm font-bold text-slate-700">Tên vai trò</TableHead>
                  <TableHead className="text-right text-sm font-bold text-slate-700 w-[240px]">Quỹ KPI tối đa (VNĐ)</TableHead>
                  <TableHead className="text-right text-sm font-bold text-slate-700 w-[180px]">Ngày công mặc định (ngày)</TableHead>
                  <TableHead className="w-24 text-right text-sm font-bold text-slate-700">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500 font-bold text-sm">
                      Không tìm thấy vai trò nào khả dụng.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map(role => {
                    const edits = roleEdits[role.id] || { kpiFund: 0, defaultWorkdays: 30 };
                    const isSaving = savingRoleId === role.id;
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-mono font-bold text-slate-500 text-xs">{role.code}</TableCell>
                        <TableCell className="font-bold text-slate-800 text-sm">{role.name}</TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            min="0"
                            step="100000"
                            value={edits.kpiFund || ''}
                            onChange={(e) => handleRoleEditChange(role.id, 'kpiFund', parseInt(e.target.value) || 0)}
                            className="w-full max-w-[200px] inline-block text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-sans font-bold text-[#C21A1A] focus:outline-none focus:border-red-400"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={edits.defaultWorkdays || ''}
                            onChange={(e) => handleRoleEditChange(role.id, 'defaultWorkdays', parseInt(e.target.value) || 0)}
                            className="w-full max-w-[140px] inline-block text-right px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-sans font-bold text-slate-700 focus:outline-none focus:border-blue-400"
                            placeholder="30"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={() => handleSaveRole(role)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-9 px-3 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50 ml-auto"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Lưu
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-3">
            {roles.map((role, idx) => {
              const edits = roleEdits[role.id] || { kpiFund: 0, defaultWorkdays: 30 };
              const isSaving = savingRoleId === role.id;
              return (
                <MobileCard key={role.id} delayIndex={idx} variant="bordered">
                  <MobileCard.Header
                    title={role.name}
                    badge={{ text: role.code, variant: 'secondary' }}
                  />
                  <MobileCard.Body className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-500">QUỸ KPI TỐI ĐA (VNĐ)</span>
                      <input
                        type="number"
                        min="0"
                        step="100000"
                        value={edits.kpiFund || ''}
                        onChange={(e) => handleRoleEditChange(role.id, 'kpiFund', parseInt(e.target.value) || 0)}
                        className="w-[160px] text-right px-3 py-1 border border-slate-200 rounded-lg text-sm font-sans font-bold text-[#C21A1A]"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-500">CÔNG MẶC ĐỊNH (NGÀY)</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={edits.defaultWorkdays || ''}
                        onChange={(e) => handleRoleEditChange(role.id, 'defaultWorkdays', parseInt(e.target.value) || 0)}
                        className="w-[100px] text-right px-3 py-1 border border-slate-200 rounded-lg text-sm font-sans font-bold text-slate-700"
                      />
                    </div>
                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleSaveRole(role)}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-8 px-4 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Lưu cấu hình
                          </>
                        )}
                      </Button>
                    </div>
                  </MobileCard.Body>
                </MobileCard>
              );
            })}
          </div>
        </CardContent>
      </Card>
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
