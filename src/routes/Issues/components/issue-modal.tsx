import React, { useState, useEffect } from 'react';
import { Sparkles, Edit2, X } from 'lucide-react';
import { SOPIssue } from '../../../types/issues.types';
import { Button, Input, Textarea } from '../../../../share/ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../../../share/ui/dialog';
import { Label } from '../../../../share/ui/label';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { INITIAL_STAFF_MEMBERS } from '../../../data';
import { useChecklistProcessCategoriesQuery } from '../../Checklist/_hook/use-checklist';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SOPIssue, 'id' | 'storeId' | 'date'>) => void;
  initialData?: SOPIssue;
  canCreate: boolean;
  canUpdate: boolean;
}

const CATEGORY_LABELS = {
  sop_error: 'Lỗi SOP',
  exception: 'Ngoại lệ',
  risk: 'Rủi ro',
  improvement: 'Cải tiến',
} as const;

const IssueModal = React.memo(function IssueModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canCreate,
  canUpdate,
}: IssueModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'sop_error' | 'exception' | 'risk' | 'improvement'>('sop_error');
  const [severity, setSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [status, setStatus] = useState('Xử lý ngay');
  const [actor, setActor] = useState('');
  const [process, setProcess] = useState('');
  const [occurrence, setOccurrence] = useState(1);
  const [assignee, setAssignee] = useState('');
  const [description, setDescription] = useState('');

  // Fetch checklist categories (processes) using query hook
  const { data: categories = [] } = useChecklistProcessCategoriesQuery();

  // Generate staff options, including active value if it doesn't match default list
  const staffOptions = React.useMemo(() => {
    const baseOptions = INITIAL_STAFF_MEMBERS.map((staff) => ({
      label: `${staff.fullName} (${staff.role})`,
      value: staff.fullName,
    }));

    if (actor && !INITIAL_STAFF_MEMBERS.some((s) => s.fullName === actor)) {
      baseOptions.unshift({
        label: actor,
        value: actor,
      });
    }

    return baseOptions;
  }, [actor]);

  // Generate assignee options from staff list
  const assigneeOptions = React.useMemo(() => {
    const baseOptions = INITIAL_STAFF_MEMBERS.map((staff) => ({
      label: `${staff.fullName} (${staff.role})`,
      value: staff.fullName,
    }));

    if (assignee && !INITIAL_STAFF_MEMBERS.some((s) => s.fullName === assignee)) {
      baseOptions.unshift({
        label: assignee,
        value: assignee,
      });
    }

    return baseOptions;
  }, [assignee]);

  // Generate process options from checklist categories query
  const processOptions = React.useMemo(() => {
    const baseOptions = categories.map((cat) => ({
      label: cat.title,
      value: cat.title,
    }));

    if (process && !baseOptions.some((opt) => opt.value === process)) {
      baseOptions.unshift({
        label: process,
        value: process,
      });
    }

    return baseOptions;
  }, [categories, process]);

  // Initializing state based on initialData
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setCategory(initialData.category || 'sop_error');
        setSeverity(initialData.severity || 'Medium');
        setStatus(initialData.status || 'Xử lý ngay');
        setActor(initialData.actor || '');
        setProcess(initialData.process || '');
        setOccurrence(initialData.occurrence || 1);
        setAssignee(initialData.assignee || '');
        setDescription(initialData.description || '');
      } else {
        setTitle('');
        setCategory('sop_error');
        setSeverity('Medium');
        setStatus('Xử lý ngay');
        setActor('');
        setProcess('');
        setOccurrence(1);
        setAssignee('');
        setDescription('');
      }
    }
  }, [initialData, isOpen]);

  const handleCategoryChange = React.useCallback((cat: 'sop_error' | 'exception' | 'risk' | 'improvement') => {
    setCategory(cat);
    if (cat === 'sop_error') {
      setStatus('Xử lý ngay');
    } else if (cat === 'exception') {
      setStatus('Chờ duyệt');
    } else if (cat === 'risk') {
      setStatus('Xử lý ngay');
    } else {
      setStatus('Đang triển khai');
    }
  }, []);

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      severity,
      status,
      category,
      actor: actor.trim() || 'Hệ thống ca trực',
      process: process.trim() || 'Vận hành chung',
      occurrence: Number(occurrence) || 1,
      assignee: assignee.trim() || 'Quản lý cửa hàng',
      description: description.trim(),
    });
  }, [onSubmit, title, severity, status, category, actor, process, occurrence, assignee, description]);

  if (!isOpen) return null;

  const isEdit = !!initialData;
  const canSubmit = isEdit ? canUpdate : canCreate;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-4 !border-0 !bg-transparent !shadow-none flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl p-0 w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200/80 relative overflow-hidden text-left">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white flex items-center justify-center text-xs font-black animate-pulse">
                {isEdit ? <Edit2 className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
              </span>
              <span>
                {isEdit ? 'Chỉnh sửa phiếu phát sinh' : 'Ghi Nhận Thực Tế Sự Cố / Cải Tiến mới'}
              </span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </Button>
            </DialogClose>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
            <div className="px-5 py-4 space-y-4">

              {/* Category picker matching mockup buttons */}
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Phân loại theo Nhóm
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['sop_error', 'exception', 'risk', 'improvement'] as const).map((cat) => {
                    let btnColor = "border-slate-200 text-slate-600 hover:bg-slate-50";
                    if (category === cat) {
                      if (cat === 'sop_error') btnColor = "bg-[#C21A1A] border-[#C21A1A] text-white shadow-sm shadow-red-500/20";
                      else if (cat === 'exception') btnColor = "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/20";
                      else if (cat === 'risk') btnColor = "bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-500/20";
                      else if (cat === 'improvement') btnColor = "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20";
                    }
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`py-2 px-1 text-[11px] font-extrabold uppercase tracking-tighter text-center rounded-xl border cursor-pointer duration-100 transition-all ${btnColor}`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tên Lỗi / Tên Đề xuất cải tiến *
                </Label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Sai quy trình bàn giao máy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  clearable={true}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                />
              </div>

              {/* Grid with severity and occurrence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Mức độ ưu tiên
                  </Label>
                  <CustomSelect
                    value={severity}
                    onChangeValue={(val) => setSeverity(val as any)}
                    clearable={false}
                    options={[
                      { label: 'Cao (Xử lý gấp)', value: 'High' },
                      { label: 'Trung bình', value: 'Medium' },
                      { label: 'Thấp', value: 'Low' },
                    ]}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Số lần xảy ra
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={occurrence}
                    onChange={(e) => setOccurrence(Number(e.target.value) || 1)}
                    clearable={false}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Grid with related processes, actors and managers */}
              <div className="space-y-3 bg-slate-50/65 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-1.5 mb-3">
                  Thông tin vận hành chi tiết
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Người liên quan
                    </Label>
                    <CustomSelect
                      value={actor}
                      onChangeValue={(val) => setActor(String(val))}
                      placeholder="Chọn nhân sự..."
                      clearable={true}
                      options={staffOptions}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-750 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Quy trình vận hành
                    </Label>
                    <CustomSelect
                      value={process}
                      onChangeValue={(val) => setProcess(String(val))}
                      placeholder="Chọn quy trình..."
                      clearable={true}
                      options={processOptions}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-750 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Người xử lý
                    </Label>
                    <CustomSelect
                      value={assignee}
                      onChangeValue={(val) => setAssignee(String(val))}
                      placeholder="Chọn người xử lý..."
                      clearable={true}
                      options={assigneeOptions}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-lg text-xs font-bold text-slate-750 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-1">
                <Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Mô tả thực tế phòng ngừa / Đề xuất chi tiết *
                </Label>
                <Textarea
                  placeholder="Ví dụ: Khách hàng yêu cầu... Cần bổ sung quy trình hướng dẫn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 p-3 text-xs font-medium rounded-lg leading-relaxed text-slate-700 transition-colors"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2.5 justify-end shrink-0 bg-slate-50/40 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!canSubmit}
                className="h-9 px-5 text-sm font-bold text-white bg-[#C21A1A] hover:bg-[#971212] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEdit ? 'Lưu cập nhật' : 'Ghi nhận vào hệ thống'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default IssueModal;
