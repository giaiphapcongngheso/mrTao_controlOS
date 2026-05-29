import React, { useState } from 'react';
import { 
  AlertTriangle, 
  HelpCircle, 
  Lightbulb, 
  Plus, 
  Clock, 
  User, 
  CheckCircle, 
  ChevronRight, 
  Trash2,
  FileCheck,
  Search,
  Filter,
  Check,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Pencil
} from 'lucide-react';
import { SOPIssue } from '../../types/issues.types';

interface IssuesViewProps {
  issues: SOPIssue[];
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  onAddIssue: (issue: Omit<SOPIssue, 'id' | 'storeId'>) => void;
  onUpdateIssue: (issueId: string, updates: Partial<SOPIssue>) => void;
  onDeleteIssue: (issueId: string) => void;
  onUpdateIssueStatus: (issueId: string, status: string) => void;
  onConfirmIssueRead: (issueId: string) => void;
  errorMessage?: string | null;
  successMessage?: string | null;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
}

export default function IssuesView({
  issues,
  permissions,
  onAddIssue,
  onUpdateIssue,
  onDeleteIssue,
  onUpdateIssueStatus,
  onConfirmIssueRead,
  errorMessage,
  successMessage,
  onDismissError,
  onDismissSuccess,
}: IssuesViewProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'sop_error' | 'exception' | 'risk' | 'improvement'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

  // Status Change Dropdown
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'sop_error' | 'exception' | 'risk' | 'improvement'>('sop_error');
  const [newSeverity, setNewSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newStatus, setNewStatus] = useState('Xử lý ngay');
  const [newActor, setNewActor] = useState('');
  const [newProcess, setNewProcess] = useState('');
  const [newOccurrence, setNewOccurrence] = useState(1);
  const [newAssignee, setNewAssignee] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const formatReadConfirmedAt = (value?: string) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('vi-VN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Auto detect statuses for preset categories
  const handleCategoryChange = (cat: 'sop_error' | 'exception' | 'risk' | 'improvement') => {
    setNewCategory(cat);
    if (cat === 'sop_error') {
      setNewStatus('Xử lý ngay');
    } else if (cat === 'exception') {
      setNewStatus('Chờ duyệt');
    } else if (cat === 'risk') {
      setNewStatus('Xử lý ngay');
    } else {
      setNewStatus('Đang triển khai');
    }
  };

  // Compute category counts dynamically for Top Dashboard Stats
  const sopCount = issues.filter(i => i.category === 'sop_error').length;
  const exceptionCount = issues.filter(i => i.category === 'exception').length;
  const riskCount = issues.filter(i => i.category === 'risk').length;
  const improvementCount = issues.filter(i => i.category === 'improvement').length;

  // Filter issues based on search and category pill
  const filteredIssues = issues.filter(issue => {
    // 1. Category check
    if (selectedCategoryFilter !== 'all' && issue.category !== selectedCategoryFilter) {
      return false;
    }
    // 2. Search check
    const rawSearch = searchTerm.toLowerCase();
    const titleMatch = issue.title.toLowerCase().includes(rawSearch);
    const actorMatch = issue.actor.toLowerCase().includes(rawSearch);
    const descMatch = issue.description?.toLowerCase().includes(rawSearch) || false;
    const procMatch = issue.process?.toLowerCase().includes(rawSearch) || false;
    const assigneeMatch = issue.assignee?.toLowerCase().includes(rawSearch) || false;

    return titleMatch || actorMatch || descMatch || procMatch || assigneeMatch;
  });

  const resetIssueForm = () => {
    setNewTitle('');
    setNewCategory('sop_error');
    setNewSeverity('Medium');
    setNewStatus('Xử lý ngay');
    setNewActor('');
    setNewProcess('');
    setNewOccurrence(1);
    setNewAssignee('');
    setNewDesc('');
    setEditingIssueId(null);
  };

  const handleOpenEditIssue = (issue: SOPIssue) => {
    setEditingIssueId(issue.id);
    setNewTitle(issue.title || '');
    setNewCategory(issue.category);
    setNewSeverity(issue.severity);
    setNewStatus(issue.status || 'Xử lý ngay');
    setNewActor(issue.actor || '');
    setNewProcess(issue.process || '');
    setNewOccurrence(issue.occurrence || 1);
    setNewAssignee(issue.assignee || '');
    setNewDesc(issue.description || '');
    setIsAdding(true);
  };

  // Handle addition/update submit
  const handleSubmitNewIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingIssueId) {
      onUpdateIssue(editingIssueId, {
        title: newTitle.trim(),
        severity: newSeverity,
        status: newStatus,
        category: newCategory,
        actor: newActor.trim() || 'Hệ thống ca trực',
        process: newProcess.trim() || 'Vận hành chung',
        occurrence: Number(newOccurrence) || 1,
        assignee: newAssignee.trim() || 'Quản lý cửa hàng',
        description: newDesc.trim(),
      });
    } else {
      onAddIssue({
        title: newTitle.trim(),
        severity: newSeverity,
        status: newStatus,
        category: newCategory,
        date: new Date().toISOString().split('T')[0],
        actor: newActor.trim() || 'Hệ thống ca trực',
        process: newProcess.trim() || 'Vận hành chung',
        occurrence: Number(newOccurrence) || 1,
        assignee: newAssignee.trim() || 'Quản lý cửa hàng',
        description: newDesc.trim(),
      });
    }

    resetIssueForm();
    setIsAdding(false);
  };

  // Severity color utility helper
  const getSeverityPill = (sev: 'High' | 'Medium' | 'Low') => {
    switch(sev) {
      case 'High':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-rose-250 bg-rose-50 text-rose-700">Cao</span>;
      case 'Medium':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-250 bg-amber-50 text-amber-700">Trung bình</span>;
      case 'Low':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-200 bg-slate-50 text-slate-500">Thấp</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 2A. MAIN HEADER AREA - Pulled in a card with border */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none text-left">
        <div className="font-sans">
          <div className="flex items-center gap-2">
            <span className="bg-[#C21A1A]/10 text-[#C21A1A] p-1.5 rounded-lg shrink-0">
              <Layers className="w-5 h-5 shrink-0 stroke-[2.5]" />
            </span>
            <h1 className="text-xl font-black font-display tracking-tight text-slate-900 uppercase">
              KIỂM SOÁT LỖI SOP &amp; NGOẠI LỆ
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-medium font-sans">
            Ghi nhận – theo dõi – xử lý – đóng vòng cải tiến sai lệch showroom định kỳ.
          </p>
        </div>

        {/* Big Action button to log and add a new record */}
        {permissions.canCreate && (
          <button
            onClick={() => {
              resetIssueForm();
              handleCategoryChange('sop_error');
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#C21A1A] hover:bg-[#A31414] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ghi nhận phiếu phát sinh</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
            title="Đóng thông báo lỗi"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-emerald-700">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2B. TOP METRIC BENTO CARDS SYSTEM (4 Main Columns from Mockup Template) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. Lỗi SOP */}
        <div 
          onClick={() => setSelectedCategoryFilter('sop_error')}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
            selectedCategoryFilter === 'sop_error' 
              ? 'ring-2 ring-[#C21A1A] border-[#C21A1A] bg-red-50/10' 
              : 'border-slate-200 hover:border-[#C21A1A]/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nhóm chất lượng</span>
              <h4 className="font-extrabold text-slate-800 text-xs">Lỗi SOP</h4>
            </div>
            <span className="bg-red-50 p-2 rounded-xl text-[#C21A1A] group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-3xl font-black tracking-tight text-[#C21A1A]">{sopCount}</span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Cần xử lý gấp</span>
          </div>
        </div>

        {/* 2. Ngoại lệ */}
        <div 
          onClick={() => setSelectedCategoryFilter('exception')}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
            selectedCategoryFilter === 'exception' 
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/10' 
              : 'border-slate-200 hover:border-amber-500/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phê duyệt quy trình</span>
              <h4 className="font-extrabold text-slate-800 text-xs text-left">Ngoại lệ chờ duyệt</h4>
            </div>
            <span className="bg-amber-55 bg-amber-50 p-2 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-5 h-5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-3xl font-black tracking-tight text-amber-500">{exceptionCount}</span>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Chờ Quản lý duyệt</span>
          </div>
        </div>

        {/* 3. Rủi ro */}
        <div 
          onClick={() => setSelectedCategoryFilter('risk')}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
            selectedCategoryFilter === 'risk' 
              ? 'ring-2 ring-purple-600 border-purple-600 bg-purple-50/10' 
              : 'border-slate-200 hover:border-purple-500/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">An ninh & Phòng chống</span>
              <h4 className="font-extrabold text-slate-800 text-xs">Rủi ro cao</h4>
            </div>
            <span className="bg-purple-55 bg-purple-50 p-2 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-3xl font-black tracking-tight text-purple-600">{riskCount}</span>
            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-md border border-purple-100">Phải chặn ngay</span>
          </div>
        </div>

        {/* 4. Cải tiến */}
        <div 
          onClick={() => setSelectedCategoryFilter('improvement')}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer select-none text-left flex flex-col justify-between group ${
            selectedCategoryFilter === 'improvement' 
              ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/10' 
              : 'border-slate-200 hover:border-emerald-500/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tối ưu hiệu quả</span>
              <h4 className="font-extrabold text-slate-800 text-xs">Cải tiến đang chạy</h4>
            </div>
            <span className="bg-emerald-55 bg-emerald-50 p-2 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
              <Lightbulb className="w-5 h-5 stroke-[2.5]" />
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-3xl font-black tracking-tight text-emerald-600">{improvementCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Đang triển khai</span>
          </div>
        </div>

      </div>

      {/* 2C. SEARCH & PILL SELECTION PANEL INDEXED HORIZONTALLY - Outer heavy border card removed to avoid visual clutter */}
      <div className="flex flex-col md:flex-row gap-3.5 justify-between items-stretch md:items-center text-left">
        {/* Tabs - Aligned on left */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none gap-0.5 shrink-0 self-start md:self-auto w-full md:w-auto">
          <button
            onClick={() => {
              setSelectedCategoryFilter('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              selectedCategoryFilter === 'all'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({issues.length})
          </button>
          
          <button
            onClick={() => {
              setSelectedCategoryFilter('sop_error');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              selectedCategoryFilter === 'sop_error'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Lỗi SOP ({sopCount})
          </button>

          <button
            onClick={() => {
              setSelectedCategoryFilter('exception');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              selectedCategoryFilter === 'exception'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ngoại lệ ({exceptionCount})
          </button>

          <button
            onClick={() => {
              setSelectedCategoryFilter('risk');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              selectedCategoryFilter === 'risk'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Rủi ro ({riskCount})
          </button>

          <button
            onClick={() => {
              setSelectedCategoryFilter('improvement');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              selectedCategoryFilter === 'improvement'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cải tiến ({improvementCount})
          </button>
        </div>

        {/* Search bar input - aligned inline */}
        <div className="flex gap-2 flex-1 md:max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên lỗi, người liên quan, quy trình..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] bg-white transition-all shadow-2xs"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold font-sans cursor-pointer hover:underline"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 2D. ISSUES CONTAINER GRID (OPTIMIZED FOR WEB DIRECT VIEW) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-12">
        {filteredIssues.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 col-span-full">
            <FileCheck className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Không tìm thấy tài liệu phù hợp</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              Thử tìm kiếm với nội dung khác, hoặc chọn "Tất cả loại phiếu" bằng bộ lọc ở phía bên trên để xem dữ liệu đầy đủ.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            
            // Layout styling helpers for card categories
            let badgeLayoutColor = "bg-[#C21A1A] text-white";
            let badgeEmblemText = "⚠️ LỖI SOP";
            let actionBtnStyle = "border border-red-500 text-[#C21A1A] bg-transparent hover:bg-red-50/50";

            if (issue.category === 'exception') {
              badgeLayoutColor = "bg-amber-500 text-white";
              badgeEmblemText = "📋 NGOẠI LỆ";
              actionBtnStyle = "border border-amber-500 text-amber-700 bg-transparent hover:bg-amber-50/50";
            } else if (issue.category === 'risk') {
              badgeLayoutColor = "bg-purple-600 text-white";
              badgeEmblemText = "🛡️ RỦI RO";
              actionBtnStyle = "border border-purple-500 text-purple-700 bg-transparent hover:bg-purple-50/50";
            } else if (issue.category === 'improvement') {
              badgeLayoutColor = "bg-emerald-600 text-white";
              badgeEmblemText = "📈 CẢI TIẾN";
              actionBtnStyle = "border border-emerald-500 text-emerald-750 bg-transparent hover:bg-emerald-50/50";
            }

            // Determine dynamic roles on the mockup basis and labels
            let assigneeLabel = "Người xử lý";
            if (issue.category === 'exception') {
              assigneeLabel = "Người duyệt";
            } else if (issue.category === 'improvement') {
              assigneeLabel = "Người phụ trách";
            } else if (issue.category === 'risk') {
              assigneeLabel = "Người theo dõi";
            }

            return (
              <div 
                key={issue.id} 
                className="bg-white rounded-2xl border border-slate-205 p-5 shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between"
              >
                
                {/* Visual Top Header representing exact mockup blocks with status dropdown accessibility */}
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest ${badgeLayoutColor}`}>
                        {badgeEmblemText}
                      </span>
                      {getSeverityPill(issue.severity)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tight">{issue.date}</span>
                  </div>

                  {/* Main core title */}
                  <h4 className="font-black text-[15px] text-slate-850 tracking-tight leading-snug">
                    {issue.title}
                  </h4>

                  {/* Description of the ticket issue */}
                  {issue.description && (
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold bg-slate-50/75 p-3 rounded-xl border border-slate-100 mt-2">
                      {issue.description}
                    </p>
                  )}

                  {issue.readConfirmedAt && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1 inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>
                        Đã xác nhận đọc lúc {formatReadConfirmedAt(issue.readConfirmedAt)}
                        {issue.readConfirmedBy ? ` bởi ${issue.readConfirmedBy}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Sub Grid Panel (Exact Three columns translation from phone design) */}
                  <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-3 my-4 text-xs font-sans">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Người liên quan</span>
                      <p className="font-extrabold text-slate-700 truncate">{issue.actor}</p>
                    </div>
                    <div className="space-y-0.5 border-x border-slate-100 px-3">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Quy trình</span>
                      <p className="font-extrabold text-slate-700 truncate">{issue.process || 'Chưa định nghĩa'}</p>
                    </div>
                    <div className="space-y-0.5 pl-3">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lần xảy ra</span>
                      <p className="font-bold font-mono text-[#C21A1A]">{issue.occurrence || 1}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Human Avatar Assigned and Interactive Action Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  
                  {/* Human User info avatar */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-extrabold text-xs shrink-0 select-none">
                      {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold leading-tight uppercase font-sans">{assigneeLabel}</span>
                      <span className="text-xs font-black text-slate-800 leading-none block mt-0.5">{issue.assignee || 'Trọng tâm cửa hàng'}</span>
                    </div>
                  </div>

                  {/* Operational status toggle conforming to beautiful system layout state popup */}
                  <div className="relative shrink-0 text-right flex items-center gap-1.5">
                    {permissions.canUpdate && (
                      <button
                        onClick={() => handleOpenEditIssue(issue)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                        title="Chỉnh sửa phiếu"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {permissions.canDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu "${issue.title}"?`)) {
                            onDeleteIssue(issue.id);
                          }
                        }}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa phiếu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button 
                      disabled={!permissions.canUpdate}
                      onClick={() => setDropdownId(dropdownId === issue.id ? null : issue.id)}
                      className={`px-4 py-2 font-black text-xs uppercase tracking-wider rounded-xl duration-150 inline-flex items-center gap-1 shadow-2xs ${permissions.canUpdate ? `cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${actionBtnStyle}` : 'cursor-not-allowed opacity-50 border border-slate-200 text-slate-400 bg-slate-50'}`}
                    >
                      <span>{issue.status}</span>
                      <ChevronRight className="w-3.5 h-3.5 rotate-90 stroke-[3.5]" />
                    </button>

                    {permissions.canUpdate && dropdownId === issue.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 text-xs text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <p className="px-3 py-1 font-black text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-50 mb-1">Cập nhật xử lý</p>
                        
                        <button 
                          onClick={() => { onUpdateIssueStatus(issue.id, 'Xử lý ngay'); setDropdownId(null); }}
                          className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center justify-between text-[#C21A1A] font-bold"
                        >
                          <span>Xử lý ngay</span>
                          {issue.status === 'Xử lý ngay' && <Check className="w-4 h-4 text-[#C21A1A] stroke-[3]" />}
                        </button>

                        <button 
                          onClick={() => { onUpdateIssueStatus(issue.id, 'Chờ duyệt'); setDropdownId(null); }}
                          className="w-full px-3 py-2 text-left hover:bg-amber-50 flex items-center justify-between text-amber-600 font-bold"
                        >
                          <span>Chờ duyệt</span>
                          {issue.status === 'Chờ duyệt' && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                        </button>

                        <button 
                          onClick={() => { onUpdateIssueStatus(issue.id, 'Đang triển khai'); setDropdownId(null); }}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between text-emerald-600 font-bold"
                        >
                          <span>Đang triển khai</span>
                          {issue.status === 'Đang triển khai' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                        </button>

                        <button 
                          onClick={() => { onUpdateIssueStatus(issue.id, 'Đã xử lý'); setDropdownId(null); }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-600 font-bold"
                        >
                          <span>Đã xử lý (Bộ lưu trữ)</span>
                          {issue.status === 'Đã xử lý' && <Check className="w-4 h-4 text-slate-600 stroke-[3]" />}
                        </button>

                        <button
                          onClick={() => { onConfirmIssueRead(issue.id); setDropdownId(null); }}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between text-emerald-600 font-bold"
                        >
                          <span>Xác nhận đã đọc</span>
                          {issue.readConfirmedAt && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 2E. POPUP OVERLAY modal for creating a new issue ticket */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6.5 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto text-left">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600 animate-pulse" />
                {editingIssueId ? 'Chỉnh sửa phiếu phát sinh' : 'Ghi Nhận Thực Tế Sự Cố / Cải Tiến mới'}
              </h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  resetIssueForm();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewIssue} className="space-y-4">
              
              {/* Category picker matching mockup buttons */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại theo Nhóm</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['sop_error', 'exception', 'risk', 'improvement'] as const).map((cat) => {
                    let btnColor = "border-slate-200 text-slate-600 hover:bg-slate-50";
                    if (newCategory === cat) {
                      if (cat === 'sop_error') btnColor = "bg-[#C21A1A] border-[#C21A1A] text-white";
                      else if (cat === 'exception') btnColor = "bg-amber-500 border-amber-500 text-white";
                      else if (cat === 'risk') btnColor = "bg-purple-600 border-purple-600 text-white";
                      else if (cat === 'improvement') btnColor = "bg-emerald-600 border-emerald-600 text-white";
                    }
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`py-2 px-1 text-[10px] font-extrabold uppercase tracking-tighter text-center rounded-xl border cursor-pointer duration-100 ${btnColor}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Lỗi / Tên Đề xuất cải tiến *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sai quy trình bàn giao máy"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-201 outline-none focus:bg-white focus:ring-1 focus:ring-red-650 px-3 py-2.5 text-xs font-bold rounded-xl text-slate-800 shadow-inner"
                />
              </div>

              {/* Grid with severity and occurrence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mức độ ưu tiên</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-201 px-3 py-2 text-xs font-bold rounded-xl text-slate-700"
                  >
                    <option value="High">Cao (Xử lý gấp)</option>
                    <option value="Medium">Trung bình</option>
                    <option value="Low">Thấp</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lần xảy ra</label>
                  <input
                    type="number"
                    min={1}
                    value={newOccurrence}
                    onChange={(e) => setNewOccurrence(Number(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-201 px-3 py-2 text-xs font-bold rounded-xl text-slate-750"
                  />
                </div>
              </div>

              {/* Grid with related processes, actors and managers */}
              <div className="space-y-3.5 bg-slate-50/65 p-3.5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-1 mb-2">Thông tin vận hành chi tiết</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase">Người liên quan</label>
                    <input
                      type="text"
                      placeholder="Sales ca sáng"
                      value={newActor}
                      onChange={(e) => setNewActor(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-755"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase">Quy trình vận hành</label>
                    <input
                      type="text"
                      placeholder="Bán hàng – Bàn giao"
                      value={newProcess}
                      onChange={(e) => setNewProcess(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-755"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase">Người chịu trách nhiệm chính</label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-755"
                    />
                  </div>
                </div>
              </div>

              {/* Description field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả thực tế phòng ngừa / Đề xuất chi tiết *</label>
                <textarea
                  placeholder="Ví dụ: Khách hàng yêu cầu... Cần bổ sung quy trình hướng dẫn..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-201 p-3 text-xs font-medium rounded-xl leading-relaxed text-slate-700"
                />
              </div>

              {/* Footer action buttons */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    resetIssueForm();
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-150 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={editingIssueId ? !permissions.canUpdate : !permissions.canCreate}
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-[#971212] rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingIssueId ? 'Lưu cập nhật' : 'Ghi nhận vào hệ thống'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
