import React, { useCallback } from 'react';
import { Target, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../../../../share/ui/dialog';
import { Button } from '../../../shared/components/button';
import { Label } from '../../../../share/ui/label';
import { Input } from '../../../../share/ui/input';
import { formatValue } from '../kpi-utils';
import type { KPIConfig } from '../../../types/kpi.types';

export type ConfigDialogMode = 'create' | 'edit' | 'view';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ConfigDialogMode;
  selectedRole: string;
  selectedMonthYear: string;
  daysInMonthCount: number;
  config: KPIConfig | null;
  onSubmit: (data: {
    goalName: string;
    kpiName: string;
    unit: string;
    monthlyTarget: number;
    weight: number;
    proofSource: string;
  }) => Promise<void>;
}

export const ConfigDialog = React.memo(function ConfigDialog({
  open,
  onOpenChange,
  mode,
  selectedRole,
  selectedMonthYear,
  daysInMonthCount,
  config,
  onSubmit,
}: ConfigDialogProps) {
  const [formGoal, setFormGoal] = React.useState('');
  const [formKpi, setFormKpi] = React.useState('');
  const [formUnit, setFormUnit] = React.useState('VNĐ');
  const [formTarget, setFormTarget] = React.useState('');
  const [formWeight, setFormWeight] = React.useState('');
  const [formProof, setFormProof] = React.useState('');

  // Sync form state when config or mode changes
  React.useEffect(() => {
    if (config) {
      setFormGoal(config.goalName);
      setFormKpi(config.kpiName);
      setFormUnit(config.unit);
      setFormTarget(config.monthlyTarget.toString());
      setFormWeight((config.weight * 100).toString());
      setFormProof(config.proofSource);
    } else {
      setFormGoal('');
      setFormKpi('');
      setFormUnit('VNĐ');
      setFormTarget('');
      setFormWeight('');
      setFormProof('');
    }
  }, [config, open]);

  const isViewMode = mode === 'view';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKpi || !formTarget || !formWeight) return;

    await onSubmit({
      goalName: formGoal || 'Chưa phân loại',
      kpiName: formKpi,
      unit: formUnit,
      monthlyTarget: parseFloat(formTarget) || 0,
      weight: (parseFloat(formWeight) || 0) / 100,
      proofSource: formProof || 'Chưa thiết lập',
    });
  }, [formGoal, formKpi, formUnit, formTarget, formWeight, formProof, onSubmit]);

  const handleGoalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormGoal(e.target.value), []);
  const handleKpiChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormKpi(e.target.value), []);
  const handleTargetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormTarget(e.target.value), []);
  const handleWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormWeight(e.target.value), []);
  const handleProofChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormProof(e.target.value), []);
  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFormUnit(e.target.value), []);

  const title =
    mode === 'view' ? 'Chi tiết chỉ số KPI'
    : mode === 'edit' ? 'Chỉnh sửa chỉ số KPI'
    : 'Thêm chỉ số KPI mới';

  const description =
    mode === 'view' ? `Xem cấu hình chỉ số chung cho vị trí ${selectedRole}`
    : mode === 'edit' ? `Cập nhật cấu hình chỉ số chung cho vị trí ${selectedRole}`
    : `Tạo chỉ số KPI mới áp dụng chung cho vị trí ${selectedRole}`;

  const estimatedDailyTarget = formTarget
    ? formatValue(Math.round((parseFloat(formTarget) || 0) / daysInMonthCount), formUnit)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] p-6 md:p-7 rounded-3xl border-0 shadow-xl bg-white/95 backdrop-blur-md overflow-y-auto text-left">
        <DialogHeader className="text-left pb-2">
          <DialogTitle className="text-base font-bold text-slate-900 tracking-wide">{title}</DialogTitle>
          <DialogDescription className="text-sm font-semibold text-slate-500 mt-1 leading-normal">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 text-left">
          {/* Block 1: KPI Info */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
              <Target className="w-4 h-4 text-blue-500 shrink-0" />
              Thông tin chỉ số KPI
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-bold text-slate-600 tracking-wide">Tên chỉ số KPI *</Label>
              <Input
                placeholder="Ví dụ: Doanh số cá nhân đạt mục tiêu"
                value={formKpi}
                onChange={handleKpiChange}
                disabled={isViewMode}
                required
                clearable={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-bold text-slate-600 tracking-wide">Đơn vị đo lường</Label>
                <select
                  value={formUnit}
                  onChange={handleUnitChange}
                  disabled={isViewMode}
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm font-semibold outline-none focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-white cursor-pointer text-slate-700 disabled:opacity-75 disabled:bg-slate-150"
                >
                  <option value="VNĐ">VNĐ</option>
                  <option value="Đơn">Đơn</option>
                  <option value="Khách">Khách</option>
                  <option value="Đánh giá">Đánh giá</option>
                  <option value="Ca">Ca</option>
                  <option value="Máy">Máy</option>
                  <option value="Ngày">Ngày</option>
                  <option value="%">%</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-bold text-slate-600 tracking-wide">Trọng số KPI (%) *</Label>
                <Input
                  type="number"
                  placeholder="Ví dụ: 45"
                  value={formWeight}
                  onChange={handleWeightChange}
                  disabled={isViewMode}
                  required
                  clearable={false}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-bold text-slate-600 tracking-wide">Vai trò áp dụng</Label>
              <Input value={selectedRole} disabled clearable={false} />
            </div>
          </div>

          {/* Block 2: Target & Proof */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
              <Award className="w-4 h-4 text-emerald-500 shrink-0" />
              Chỉ tiêu &amp; Đối chứng
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-bold text-slate-600 tracking-wide">Tên nhóm mục tiêu</Label>
              <Input
                placeholder="Ví dụ: Tăng kết quả kinh doanh"
                value={formGoal}
                onChange={handleGoalChange}
                disabled={isViewMode}
                clearable={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-bold text-slate-600 tracking-wide">Chỉ tiêu tháng *</Label>
              <Input
                type="number"
                placeholder="Ví dụ: 450000000"
                value={formTarget}
                onChange={handleTargetChange}
                disabled={isViewMode}
                required
                clearable={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-bold text-slate-600 tracking-wide">Nguồn đối chứng</Label>
              <Input
                placeholder="Ví dụ: KiotViet theo nhân viên"
                value={formProof}
                onChange={handleProofChange}
                disabled={isViewMode}
                clearable={false}
              />
            </div>

            {estimatedDailyTarget && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-800 font-semibold flex items-center justify-between">
                <span>Target ngày ước tính:</span>
                <span className="font-bold text-sm">{estimatedDailyTarget} / ngày</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="font-bold cursor-pointer h-10 px-5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                {isViewMode ? 'Đóng' : 'Hủy bỏ'}
              </Button>
            </DialogClose>
            {!isViewMode && (
              <button
                type="submit"
                className="h-10 px-6 bg-[#C21A1A] hover:bg-[#A51414] active:scale-95 text-white font-bold rounded-xl shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center cursor-pointer border-0 text-sm"
              >
                {mode === 'edit' ? 'Lưu thay đổi' : 'Tạo chỉ số'}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
