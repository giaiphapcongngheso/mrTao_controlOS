import React, { useState } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Award, 
  Plus, 
  Trash2, 
  Save, 
  Calendar,
  Users,
  Target,
  Sparkles,
  Zap,
  Check,
  X,
  Edit2,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import type { StaffMember } from '../../types/staff.types';
import type { KPIConfig, KPIDailyValue, StaffRank } from '../../types/kpi.types';
import { ModuleHeader } from '../../../share/components/module-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../shared/components/table';
import { ScrollArea, ScrollBar } from '../../shared/components/scroll-area';
import { GroupBox } from '../../components/custom/group-box';
import { Button } from '../../shared/components/button';

interface KpiViewProps {
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
  onSetTab: (tab: any) => void;
}

// Normalize role string to map templates
const normalizeRole = (r: string) => {
  if (!r) return '';
  const norm = r.toUpperCase().replace(/_/g, '').trim();
  if (norm === 'QUAN_LY' || norm === 'QUANLY' || norm === 'MANAGER') return 'QUAN_LY';
  if (norm === 'SALES' || norm === 'BAN_HANG' || norm === 'BANHANG') return 'SALES';
  if (norm === 'KY_THUAT' || norm === 'KYTHUAT' || norm === 'TECH') return 'KỸ_THUẬT';
  if (norm === 'KHO' || norm === 'WAREHOUSE') return 'KHO';
  return norm;
};

// Translate classification key to Vietnamese
const translateClassification = (cls: string) => {
  if (cls === 'excellent') return 'Xuất sắc';
  if (cls === 'good') return 'Tốt';
  if (cls === 'pass') return 'Khá';
  return 'Chưa đạt';
};

// Classification color badge style
const getClassificationBadgeClass = (cls: string) => {
  if (cls === 'excellent') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (cls === 'good') return 'bg-blue-50 text-blue-600 border-blue-200';
  if (cls === 'pass') return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-rose-50 text-rose-600 border-rose-200';
};

export default function KpiView({
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onSaveDailyValue,
  onSetTab
}: KpiViewProps) {
  // Tabs: 'ranks' | 'entry' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<'ranks' | 'entry' | 'settings'>('ranks');
  
  // Selection states
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffMembers.find(s => s.status === 'active')?.id || ''
  );
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedSettingRole, setSelectedSettingRole] = useState<string>('SALES');
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Input states for Tab 2 (Entry)
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form states for Tab 3 (Add config)
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [newConfigGoal, setNewConfigGoal] = useState('');
  const [newConfigKpi, setNewConfigKpi] = useState('');
  const [newConfigUnit, setNewConfigUnit] = useState('VNĐ');
  const [newConfigTarget, setNewConfigTarget] = useState('');
  const [newConfigWeight, setNewConfigWeight] = useState('');
  const [newConfigProof, setNewConfigProof] = useState('');

  // Inline editing config states
  const [editTarget, setEditTarget] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editProof, setEditProof] = useState('');

  // Helper: Get all active staff ranks dynamically calculated from Firestore
  const getDynamicStaffRanks = (): StaffRank[] => {
    const activeStaff = staffMembers.filter(s => s.status === 'active');
    
    const ranks = activeStaff.map((staff): StaffRank => {
      const roleNorm = normalizeRole(staff.role);
      const configs = kpiConfigs.filter(c => normalizeRole(c.role) === roleNorm);
      
      let totalScore = 0;
      configs.forEach(config => {
        // sum actuals
        const values = kpiDailyValues.filter(v => v.staffId === staff.id && v.kpiConfigId === config.id);
        const actual = values.reduce((sum, item) => sum + item.value, 0);
        // % progress
        const pct = config.monthlyTarget > 0 ? (actual / config.monthlyTarget) : 0;
        // score capped at weight
        const score = Math.min(config.weight, config.weight * pct);
        totalScore += score;
      });

      const finalScore = Math.round(totalScore * 100);
      let classification: 'excellent' | 'good' | 'pass' | 'needs_improvement' = 'needs_improvement';
      if (finalScore >= 90) classification = 'excellent';
      else if (finalScore >= 80) classification = 'good';
      else if (finalScore >= 70) classification = 'pass';

      return {
        storeId: staff.storeId,
        staffId: staff.id,
        name: staff.fullName,
        role: staff.role,
        score: finalScore,
        classification,
        avatar: staff.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${staff.username}`
      };
    });

    // Sort descending by score
    return ranks.sort((a, b) => b.score - a.score);
  };

  const dynamicRanks = getDynamicStaffRanks();
  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0];
  const staffConfigs = selectedStaff ? kpiConfigs.filter(c => normalizeRole(c.role) === normalizeRole(selectedStaff.role)) : [];

  // Helper: format money/number
  const formatValue = (val: number, unit: string) => {
    if (unit === 'VNĐ') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    }
    return `${val.toLocaleString()} ${unit}`;
  };

  // Generate 30 days array
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  // Tab 2: Load current values when Day/Staff changes
  React.useEffect(() => {
    if (!selectedStaff) return;
    const initialEntry: Record<string, string> = {};
    const dateStr = `2026-06-${selectedDay.toString().padStart(2, '0')}`;
    
    staffConfigs.forEach(config => {
      const record = kpiDailyValues.find(
        v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
      );
      initialEntry[config.id] = record ? record.value.toString() : '';
    });
    setEntryValues(initialEntry);
    setSaveSuccessMsg(null);
  }, [selectedStaffId, selectedDay, kpiDailyValues, kpiConfigs]);

  // Tab 2: Handle saving day values
  const handleSaveDayValues = async () => {
    if (!selectedStaff) return;
    const dateStr = `2026-06-${selectedDay.toString().padStart(2, '0')}`;

    try {
      for (const config of staffConfigs) {
        const valStr = entryValues[config.id] || '0';
        const numVal = parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;
        
        const payload: KPIDailyValue = {
          id: `${selectedStaff.id}_${config.id}_${dateStr}`,
          storeId: selectedStaff.storeId,
          staffId: selectedStaff.id,
          kpiConfigId: config.id,
          date: dateStr,
          value: numVal
        };
        await onSaveDailyValue(payload);
      }
      setSaveSuccessMsg(`Đã lưu thành công số liệu ngày ${selectedDay.toString().padStart(2, '0')}/06 cho ${selectedStaff.fullName}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Lỗi khi lưu KPI ngày:', err);
    }
  };

  // Tab 3: Edit configs
  const startEditConfig = (config: KPIConfig) => {
    setEditingConfigId(config.id);
    setEditTarget(config.monthlyTarget.toString());
    setEditWeight((config.weight * 100).toString());
    setEditProof(config.proofSource);
  };

  const handleUpdateConfig = async (config: KPIConfig) => {
    try {
      const numTarget = parseFloat(editTarget) || 0;
      const numWeight = (parseFloat(editWeight) || 0) / 100;
      const dailyTarget = Math.round(numTarget / 30);

      await onUpdateConfig({
        ...config,
        monthlyTarget: numTarget,
        weight: numWeight,
        dailyTarget,
        proofSource: editProof
      });
      setEditingConfigId(null);
    } catch (err) {
      console.error('Lỗi khi cập nhật cấu hình KPI:', err);
    }
  };

  // Tab 3: Create config
  const handleCreateConfig = async () => {
    if (!newConfigKpi || !newConfigTarget || !newConfigWeight) return;
    try {
      const numTarget = parseFloat(newConfigTarget) || 0;
      const numWeight = (parseFloat(newConfigWeight) || 0) / 100;
      const dailyTarget = Math.round(numTarget / 30);
      const newId = `cfg_${selectedSettingRole.toLowerCase()}_${Date.now()}`;

      const payload: KPIConfig = {
        id: newId,
        storeId: selectedStaff?.storeId || 'store-mr-tao-q1',
        role: selectedSettingRole,
        goalName: newConfigGoal || 'Chưa phân loại',
        kpiName: newConfigKpi,
        unit: newConfigUnit,
        monthlyTarget: numTarget,
        weight: numWeight,
        dailyTarget,
        proofSource: newConfigProof || 'Chưa thiết lập'
      };

      await onCreateConfig(payload);
      setIsAddingConfig(false);
      setNewConfigGoal('');
      setNewConfigKpi('');
      setNewConfigTarget('');
      setNewConfigWeight('');
      setNewConfigProof('');
    } catch (err) {
      console.error('Lỗi khi thêm cấu hình KPI:', err);
    }
  };

  // Tab 3: Delete config
  const handleDeleteConfig = async (configId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa chỉ số KPI này? Việc xóa sẽ ảnh hưởng tới tính toán điểm của toàn bộ nhân viên thuộc vai trò này.')) {
      try {
        await onDeleteConfig(configId);
      } catch (err) {
        console.error('Lỗi khi xóa cấu hình KPI:', err);
      }
    }
  };

  return (
    <div className="space-y-4 text-left">
      
      {/* 1. MODULE HEADER */}
      <ModuleHeader 
        title="Bảng KPI &amp; Hiệu Suất Vận Hành" 
        description="Đo lường tự động chỉ số doanh số, chăm sóc khách hàng và hiệu suất hoàn thành checklist tiêu chuẩn showroom."
        icon={<TrendingUp className="w-6 h-6 text-[#C21A1A]" />}
      >
        <button 
          onClick={() => onSetTab('Today')}
          className="px-4 h-9 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center"
        >
          Về Trang Chủ
        </button>
      </ModuleHeader>

      {/* 2. SUBTABS PANEL (Glassmorphism & Interactive) */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 w-fit">
        <Button 
          variant={activeSubTab === 'ranks' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('ranks')}
          className="font-bold cursor-pointer"
        >
          <Award className="w-4 h-4 mr-1" />
          Xếp hạng & Chi tiết
        </Button>
        <Button 
          variant={activeSubTab === 'entry' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('entry')}
          className="font-bold cursor-pointer"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Nhập Action Plan
        </Button>
        <Button 
          variant={activeSubTab === 'settings' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('settings')}
          className="font-bold cursor-pointer"
        >
          <Target className="w-4 h-4 mr-1" />
          Thiết lập KPI Chung
        </Button>
      </div>

      {/* 3. TAB 1: BẢNG XẾP HẠNG & CHI TIẾT */}
      {activeSubTab === 'ranks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Cột trái (Bảng xếp hạng) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-black text-slate-800 tracking-wider">LEADERBOARD THI ĐUA</h2>
                <p className="text-[11px] text-slate-400 font-bold">Xếp hạng dựa trên kết quả chốt số thực tế</p>
              </div>
              <span className="text-xs font-black text-[#C21A1A] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                T06/2026
              </span>
            </div>

            <div className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Hạng</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead className="text-right">Tổng điểm</TableHead>
                    <TableHead className="text-right">Xếp loại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dynamicRanks.map((rank, idx) => {
                    const isSelected = selectedStaffId === rank.staffId;
                    return (
                      <TableRow 
                        key={rank.staffId}
                        onClick={() => setSelectedStaffId(rank.staffId)}
                        className={`cursor-pointer hover:bg-slate-50/70 ${isSelected ? 'bg-slate-50 font-semibold border-l-4 border-l-[#C21A1A]' : ''}`}
                      >
                        <TableCell className="text-center font-sans">
                          {idx === 0 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-white font-black text-[11px] flex items-center justify-center mx-auto shadow-sm">1</span>
                          ) : idx === 1 ? (
                            <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[11px] flex items-center justify-center mx-auto shadow-sm">2</span>
                          ) : idx === 2 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-600/70 text-white font-black text-[11px] flex items-center justify-center mx-auto shadow-sm">3</span>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">{idx + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <img src={rank.avatar} className="w-7 h-7 rounded-full object-cover border border-slate-100 shrink-0" alt="" />
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-800 leading-tight">{rank.name}</p>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{rank.role}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-sans font-black text-slate-800 text-sm">
                          {rank.score}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border ${getClassificationBadgeClass(rank.classification)}`}>
                            {translateClassification(rank.classification)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Cột phải (Chi tiết điểm) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedStaff && (
              <Card>
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        <img src={selectedStaff.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedStaff.username}`} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg font-black text-slate-900">{selectedStaff.fullName}</CardTitle>
                        <CardDescription className="text-xs font-bold text-[#C21A1A] uppercase tracking-wider mt-0.5">
                          Vai trò: {selectedStaff.role}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">TỔNG ĐIỂM KPI CHỐT</p>
                      <h3 className="text-2xl font-black font-sans text-slate-900 leading-none mt-1">
                        {dynamicRanks.find(r => r.staffId === selectedStaff.id)?.score || 0}%
                      </h3>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                  
                  {/* Danh sách chỉ số */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider text-left">CHI TIẾT CHỈ SỐ KPI ĐẠT ĐƯỢC</h4>
                    
                    {staffConfigs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                        Chưa thiết lập chỉ số KPI nào cho vị trí này
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead>Chỉ số KPI</TableHead>
                              <TableHead className="text-right">Target tháng</TableHead>
                              <TableHead className="text-right">Thực đạt</TableHead>
                              <TableHead className="text-right">Đạt %</TableHead>
                              <TableHead className="text-right">Điểm</TableHead>
                              <TableHead className="text-right">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffConfigs.map(config => {
                              const actual = kpiDailyValues
                                .filter(v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id)
                                .reduce((sum, item) => sum + item.value, 0);
                              
                              const pct = config.monthlyTarget > 0 ? (actual / config.monthlyTarget) : 0;
                              const pctStr = (pct * 100).toFixed(1) + '%';
                              const score = Math.min(config.weight, config.weight * pct);
                              const scoreStr = (score * 100).toFixed(1) + '%';
                              
                              let statusText = 'Chưa nhập';
                              let statusColor = 'text-slate-400 bg-slate-50 border-slate-200';
                              if (actual > 0) {
                                if (pct >= 1) {
                                  statusText = 'Đạt';
                                  statusColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                                } else {
                                  statusText = 'Chưa đạt';
                                  statusColor = 'text-rose-600 bg-rose-50 border-rose-200';
                                }
                              }

                              return (
                                <TableRow key={config.id}>
                                  <TableCell className="max-w-[150px] truncate text-left">
                                    <p className="font-bold text-slate-800 text-xs truncate" title={config.kpiName}>
                                      {config.kpiName}
                                    </p>
                                    <span className="text-[9px] text-slate-400 font-semibold">Trọng số: {(config.weight * 100)}%</span>
                                  </TableCell>
                                  <TableCell className="text-right font-sans font-bold text-xs">
                                    {formatValue(config.monthlyTarget, config.unit)}
                                  </TableCell>
                                  <TableCell className="text-right font-sans font-black text-xs text-[#C21A1A]">
                                    {formatValue(actual, config.unit)}
                                  </TableCell>
                                  <TableCell className="text-right font-sans font-bold text-xs">
                                    {pctStr}
                                  </TableCell>
                                  <TableCell className="text-right font-sans font-black text-xs text-blue-600">
                                    {scoreStr}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* SVG mini chart (ambient visuals) */}
                  {staffConfigs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider text-left">BIỂU ĐỒ BIẾN ĐỘNG HẰNG NGÀY (THÁNG 6)</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-stretch h-40 justify-between relative overflow-hidden">
                        
                        {/* Decorative background grid */}
                        <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none opacity-50">
                          <div className="border-b border-slate-200/50 w-full"></div>
                          <div className="border-b border-slate-200/50 w-full"></div>
                          <div className="border-b border-slate-200/50 w-full"></div>
                        </div>

                        {/* Sparkline curve */}
                        <div className="relative flex-1 w-full mt-2">
                          <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C21A1A" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#C21A1A" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            {(() => {
                              // Get daily values for the first KPI (often revenue/sales)
                              const targetKpi = staffConfigs[0];
                              if (!targetKpi) return null;
                              
                              const dailyValues = Array.from({ length: 30 }, (_, dayIdx) => {
                                const day = dayIdx + 1;
                                const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
                                const record = kpiDailyValues.find(
                                  v => v.staffId === selectedStaff.id && v.kpiConfigId === targetKpi.id && v.date === dateStr
                                );
                                return record ? record.value : 0;
                              });

                              const maxVal = Math.max(...dailyValues, targetKpi.dailyTarget * 1.5, 1);
                              const points = dailyValues.map((val, idx) => {
                                const x = (idx / 29) * 300;
                                const y = 80 - (val / maxVal) * 70; // keep padding
                                return `${x},${y}`;
                              });

                              const pathData = `M ${points.join(' L ')}`;
                              const fillData = `${pathData} L 300,80 L 0,80 Z`;

                              return (
                                <>
                                  {/* Area fill */}
                                  <path d={fillData} fill="url(#chartGrad)" />
                                  {/* Line stroke */}
                                  <path d={pathData} fill="none" stroke="#C21A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  
                                  {/* Target line */}
                                  {(() => {
                                    const targetY = 80 - (targetKpi.dailyTarget / maxVal) * 70;
                                    return (
                                      <line x1="0" y1={targetY} x2="300" y2={targetY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" />
                                    );
                                  })()}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                        
                        {/* Legend axis */}
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 mt-2 z-10">
                          <span>01/06</span>
                          <span className="text-[#3b82f6]">Vạch target ngày (mốc đứt)</span>
                          <span>30/06</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      )}

      {/* 4. TAB 2: NHẬP LIỆU HÀNG NGÀY (ACTION PLAN) */}
      {activeSubTab === 'entry' && selectedStaff && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <CardTitle className="text-base font-black text-slate-800 tracking-wider">NHẬP LIỆU ACTION PLAN KPI</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 mt-0.5">
                  Nhân viên tự nhập số thực tế đạt được hằng ngày trước 21:30
                </CardDescription>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[180px]">
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 font-extrabold text-xs pl-3 pr-8 py-2 rounded-xl text-slate-700 focus:outline-none cursor-pointer appearance-none"
                  >
                    {staffMembers.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[120px]">
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 font-extrabold text-xs pl-3 pr-8 py-2 rounded-xl text-slate-700 focus:outline-none cursor-pointer appearance-none"
                  >
                    {daysInMonth.map(day => (
                      <option key={day} value={day}>Ngày {day.toString().padStart(2, '0')}/06</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            
            {/* Form nhập liệu */}
            <GroupBox legend={<span className="text-xs font-black uppercase text-slate-500 tracking-wider">Số liệu ngày {selectedDay.toString().padStart(2, '0')}/06</span>}>
              {staffConfigs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold">
                  Nhân viên này chưa được cấu hình chỉ số KPI nào. Hãy sang tab Thiết lập để tạo cấu hình.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffConfigs.map(config => (
                    <div key={config.id} className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl flex flex-col justify-between gap-2 text-left">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{config.goalName}</span>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{config.kpiName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          Target ngày: <span className="text-slate-700">{formatValue(config.dailyTarget, config.unit)}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          Đối chứng: <span className="text-slate-500">{config.proofSource}</span>
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nhập số thực tế..."
                          value={entryValues[config.id] || ''}
                          onChange={(e) => setEntryValues({ ...entryValues, [config.id]: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-amber-50 border border-amber-300 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans font-black text-sm text-slate-800 rounded-lg outline-none transition-all shadow-inner placeholder:font-normal"
                        />
                        <span className="text-xs font-bold text-slate-400 w-10 shrink-0">{config.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {staffConfigs.length > 0 && (
                <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-4 mt-2">
                  {saveSuccessMsg && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 animate-in fade-in duration-300">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      {saveSuccessMsg}
                    </span>
                  )}
                  <Button onClick={handleSaveDayValues} className="px-5 h-9 font-bold cursor-pointer">
                    <Save className="w-4 h-4 mr-1.5" />
                    Lưu báo cáo ngày
                  </Button>
                </div>
              )}
            </GroupBox>

            {/* Bảng tổng hợp 30 ngày (cuộn ngang) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">BẢNG ACTION PLAN KPI CHI TIẾT (30 NGÀY)</h4>
                <span className="text-[10px] font-bold text-slate-400">Cuộn ngang để xem tất cả các ngày ➔</span>
              </div>

              {staffConfigs.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <ScrollArea className="w-full">
                    <Table className="text-center font-sans text-xs">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-left w-48 sticky left-0 bg-slate-50 z-10 border-r shadow-xs">Chỉ số KPI</TableHead>
                          <TableHead className="w-20 border-r">Dòng</TableHead>
                          {daysInMonth.map(day => (
                            <TableHead key={day} className="w-14 min-w-[56px] text-center border-r font-bold">
                              {day.toString().padStart(2, '0')}/06
                            </TableHead>
                          ))}
                          <TableHead className="w-24 border-r text-right font-black sticky right-[90px] bg-slate-50 border-l shadow-xs">Tổng</TableHead>
                          <TableHead className="w-20 border-r text-right font-black sticky right-12 bg-slate-50 border-l shadow-xs">% Đạt</TableHead>
                          <TableHead className="w-12 text-center font-black sticky right-0 bg-slate-50 border-l shadow-xs">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffConfigs.flatMap(config => {
                          const actuals = daysInMonth.map(day => {
                            const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
                            const record = kpiDailyValues.find(
                              v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                            );
                            return record ? record.value : 0;
                          });

                          const totalActual = actuals.reduce((sum, v) => sum + v, 0);
                          const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
                          const pctStr = (pct * 100).toFixed(0) + '%';
                          
                          let statusText = 'Chưa nhập';
                          let statusColor = 'bg-slate-50 text-slate-400 border-slate-200';
                          if (totalActual > 0) {
                            if (pct >= 1) {
                              statusText = 'Đạt';
                              statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                            } else {
                              statusText = 'Chưa đạt';
                              statusColor = 'bg-rose-50 text-rose-600 border-rose-200';
                            }
                          }

                          return [
                            // Dòng Mục tiêu
                            <TableRow key={`${config.id}_target`} className="hover:bg-slate-50/20">
                              <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r shadow-xs max-w-[192px] truncate" title={config.kpiName}>
                                {config.kpiName}
                              </TableCell>
                              <TableCell className="border-r font-bold text-slate-400 bg-slate-50/30 text-[10px]">Mục tiêu</TableCell>
                              {daysInMonth.map(day => (
                                <TableCell key={day} className="border-r text-slate-400 font-medium">
                                  {config.monthlyTarget > 0 ? (config.dailyTarget).toLocaleString() : '1'}
                                </TableCell>
                              ))}
                              <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[90px] bg-white border-l shadow-xs">
                                {config.monthlyTarget.toLocaleString()}
                              </TableCell>
                              <TableCell className="border-r text-right font-bold text-slate-400 sticky right-12 bg-white border-l shadow-xs">-</TableCell>
                              <TableCell className="sticky right-0 bg-white border-l shadow-xs font-bold text-slate-400">-</TableCell>
                            </TableRow>,
                            // Dòng Thực tế
                            <TableRow key={`${config.id}_actual`} className="bg-amber-50/20 hover:bg-amber-50/40">
                              <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-[#fefdfa] z-10 border-r shadow-xs max-w-[192px] truncate">
                                {/* Empty cell or subtle indicator */}
                                <span className="text-[10px] text-amber-600 font-black">↳ Thực tế</span>
                              </TableCell>
                              <TableCell className="border-r font-black text-amber-700 bg-amber-50/50 text-[10px]">Thực tế</TableCell>
                              {daysInMonth.map((day, idx) => {
                                const act = actuals[idx];
                                return (
                                  <TableCell key={day} className={`border-r font-black ${act > 0 ? 'text-amber-800' : 'text-slate-300'}`}>
                                    {act > 0 ? act.toLocaleString() : '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="border-r text-right font-black text-slate-800 sticky right-[90px] bg-[#fefdfa] border-l shadow-xs">
                                {totalActual.toLocaleString()}
                              </TableCell>
                              <TableCell className="border-r text-right font-black text-blue-600 sticky right-12 bg-[#fefdfa] border-l shadow-xs">
                                {pctStr}
                              </TableCell>
                              <TableCell className="sticky right-0 bg-[#fefdfa] border-l shadow-xs">
                                <span className={`inline-block text-[9px] font-black px-1 py-0.5 rounded border ${statusColor}`}>
                                  {statusText}
                                </span>
                              </TableCell>
                            </TableRow>
                          ];
                        })}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {/* 5. TAB 3: THIẾT LẬP KPI CHUNG (ADMIN) */}
      {activeSubTab === 'settings' && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <CardTitle className="text-base font-black text-slate-800 tracking-wider">CẤU HÌNH KPI THEO VAI TRÒ</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 mt-0.5">
                  Thiết lập các chỉ số, target tháng và trọng số áp dụng chung cho toàn bộ nhân sự theo vai trò.
                </CardDescription>
              </div>

              {/* Roles selection dropdown */}
              <div className="relative min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Vai trò</span>
                <select
                  value={selectedSettingRole}
                  onChange={(e) => {
                    setSelectedSettingRole(e.target.value);
                    setIsAddingConfig(false);
                    setEditingConfigId(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 font-extrabold text-xs pl-16 pr-8 py-2.5 rounded-xl text-slate-700 focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="SALES">SALES (Bán hàng)</option>
                  <option value="KỸ_THUẬT">KỸ THUẬT (Kỹ thuật viên)</option>
                  <option value="QUAN_LY">QUAN LÝ (Cửa hàng trưởng)</option>
                  <option value="KHO">KHO (Nhân viên Kho)</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            
            {/* Form thêm cấu hình */}
            {isAddingConfig ? (
              <GroupBox legend={<span className="text-xs font-black text-[#C21A1A] uppercase tracking-wider">Thêm chỉ số KPI cho vị trí {selectedSettingRole}</span>}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tên nhóm mục tiêu</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tăng kết quả kinh doanh"
                      value={newConfigGoal}
                      onChange={(e) => setNewConfigGoal(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tên chỉ số KPI *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Doanh số cá nhân đạt mục tiêu"
                      value={newConfigKpi}
                      onChange={(e) => setNewConfigKpi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Đơn vị đo lường</label>
                    <select
                      value={newConfigUnit}
                      onChange={(e) => setNewConfigUnit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="VNĐ">VNĐ (Tiền mặt)</option>
                      <option value="Đơn">Đơn (Hóa đơn)</option>
                      <option value="Khách">Khách (Lượt khách)</option>
                      <option value="Đánh giá">Đánh giá (Review)</option>
                      <option value="Ca">Ca (Ca sửa)</option>
                      <option value="Máy">Máy (Số máy)</option>
                      <option value="Ngày">Ngày (Số ngày)</option>
                      <option value="%">% (Tỷ lệ)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Target tháng *</label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 450000000"
                      value={newConfigTarget}
                      onChange={(e) => setNewConfigTarget(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Trọng số (%) *</label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 45"
                      value={newConfigWeight}
                      onChange={(e) => setNewConfigWeight(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nguồn đối chứng</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: KiotViet theo nhân viên"
                      value={newConfigProof}
                      onChange={(e) => setNewConfigProof(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2 border-t border-slate-100 pt-3 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsAddingConfig(false)} className="font-bold cursor-pointer">
                    Hủy bỏ
                  </Button>
                  <Button size="sm" onClick={handleCreateConfig} className="font-bold cursor-pointer">
                    Tạo chỉ số
                  </Button>
                </div>
              </GroupBox>
            ) : (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setIsAddingConfig(true)} className="font-bold cursor-pointer">
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm chỉ số KPI mới
                </Button>
              </div>
            )}

            {/* Danh sách chỉ số cấu hình */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider text-left">DANH SÁCH CHỈ SỐ ÁP DỤNG</h4>
              
              {(() => {
                const filteredConfigs = kpiConfigs.filter(c => normalizeRole(c.role) === selectedSettingRole);
                const totalWeight = filteredConfigs.reduce((sum, c) => sum + c.weight, 0);

                return (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <Table className="text-left text-xs">
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead>Mục tiêu chung</TableHead>
                            <TableHead>Chỉ số KPI</TableHead>
                            <TableHead>Đơn vị</TableHead>
                            <TableHead className="text-right">Target tháng</TableHead>
                            <TableHead className="text-right">Target ngày (ước tính)</TableHead>
                            <TableHead className="text-right">Trọng số (%)</TableHead>
                            <TableHead>Nguồn đối chứng</TableHead>
                            <TableHead className="w-24 text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredConfigs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-6 text-slate-400 font-bold">
                                Vị trí này chưa được cấu hình chỉ số KPI nào
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredConfigs.map(config => {
                              const isEditing = editingConfigId === config.id;
                              return (
                                <TableRow key={config.id}>
                                  <TableCell className="font-semibold text-slate-500">
                                    {config.goalName}
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-800">
                                    {config.kpiName}
                                  </TableCell>
                                  <TableCell>{config.unit}</TableCell>
                                  <TableCell className="text-right font-sans font-bold">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={editTarget}
                                        onChange={(e) => setEditTarget(e.target.value)}
                                        className="w-24 px-2 py-1 border border-slate-200 text-xs font-semibold text-right rounded-lg outline-none"
                                      />
                                    ) : (
                                      formatValue(config.monthlyTarget, config.unit)
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-sans text-slate-400 font-semibold">
                                    {formatValue(config.dailyTarget, config.unit)}
                                  </TableCell>
                                  <TableCell className="text-right font-sans font-black text-blue-600">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={editWeight}
                                        onChange={(e) => setEditWeight(e.target.value)}
                                        className="w-16 px-2 py-1 border border-slate-200 text-xs font-semibold text-right rounded-lg outline-none"
                                      />
                                    ) : (
                                      `${(config.weight * 100)}%`
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editProof}
                                        onChange={(e) => setEditProof(e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 text-xs font-semibold rounded-lg outline-none"
                                      />
                                    ) : (
                                      config.proofSource
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isEditing ? (
                                        <>
                                          <Button variant="ghost" size="icon-xs" onClick={() => setEditingConfigId(null)} className="cursor-pointer">
                                            <X className="w-3.5 h-3.5 text-slate-400" />
                                          </Button>
                                          <Button size="icon-xs" onClick={() => handleUpdateConfig(config)} className="cursor-pointer">
                                            <Check className="w-3.5 h-3.5 text-white" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button variant="ghost" size="icon-xs" onClick={() => startEditConfig(config)} className="cursor-pointer">
                                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                          </Button>
                                          <Button variant="destructive" size="icon-xs" onClick={() => handleDeleteConfig(config.id)} className="cursor-pointer">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Tổng số chỉ số: {filteredConfigs.length}</span>
                      <span className={`flex items-center gap-1 ${totalWeight === 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        Tổng trọng số vị trí: {(totalWeight * 100).toFixed(0)}%
                        {totalWeight !== 1 && ' (Khuyên dùng: Đảm bảo tổng trọng số đạt 100%)'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </CardContent>
        </Card>
      )}

    </div>
  );
}
