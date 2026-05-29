import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  Filter, 
  MoreVertical,
  ChevronRight,
  UserCheck,
  Tag,
  Check,
  Zap,
  AlertOctagon,
  HelpCircle,
  FileText,
  Send,
  Camera,
  Layers,
  ChevronDown
} from 'lucide-react';
import { TaskItem } from '../../types/tasks.types';

interface TasksViewProps {
  tasks: TaskItem[];
  onAddTask: (task: Omit<TaskItem, 'id' | 'storeId'>) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskItem['status']) => void;
}

const TASK_TEMPLATES = [
  { title: "Kiểm tra hàng iPhone 11 tồn kho", department: "Kho", priority: "high", assignee: "Lê Văn C", notes: "Đối soát 64GB vs 128GB tránh sai lệch imei chênh giá." },
  { title: "Đăng bài khuyến mãi cuối tuần", department: "Marketing", priority: "medium", assignee: "Nguyễn Trường Giang", notes: "Chuẩn bị nội dung và hình ảnh, đăng bài trên các kênh theo kế hoạch." },
  { title: "Sửa lỗi máy POS – chi nhánh Q3", department: "Kỹ thuật", priority: "high", assignee: "Trần Thanh Hoài", notes: "Kiểm tra lỗi kết nối và in hóa đơn, báo cáo kết quả xử lý." },
  { title: "Rà soát SOP bàn giao máy", department: "Vận hành", priority: "low", assignee: "Quản lý cửa hàng", notes: "Rà soát quy trình, đề xuất cập nhật và lưu trữ tài liệu SOP." }
];

export default function TasksView({
  tasks,
  onAddTask,
  onUpdateTaskStatus
}: TasksViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'late' | 'completed'>('all');
  
  // Modals controller
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickDelegateOpen, setQuickDelegateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  
  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Scanner simulator states
  const [scannerState, setScannerState] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [scannedResult, setScannedResult] = useState<any>(null);

  // Form fields for Task Manual Creation
  const [taskName, setTaskName] = useState('');
  const [taskDept, setTaskDept] = useState('Kho');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDeadline, setTaskDeadline] = useState('Today');
  const [taskAssignee, setTaskAssignee] = useState('Lê Văn C');
  const [taskNotes, setTaskNotes] = useState('');

  // Form fields for Quick Delegate
  const [quickName, setQuickName] = useState('');
  const [quickAssignee, setQuickAssignee] = useState('Lê Văn C');
  const [quickDept, setQuickDept] = useState('Kho');

  // Active Menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Auto disappear toast notifications
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Handle barcode scanner simulation countdown
  useEffect(() => {
    if (scannerOpen && scannerState === 'scanning') {
      const timer = setTimeout(() => {
        setScannerState('success');
        setScannedResult({
          serial: `VN-A${Math.floor(100000 + Math.random() * 900000)}`,
          model: "iPhone 11 Pro Max 256GB Gold",
          diagnostic: "Lỗi hao nguồn cần gửi đối soát kiểm tra bảo hành"
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [scannerOpen, scannerState]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleStartBarcodeScanner = () => {
    setScannerState('scanning');
    setScannedResult(null);
    setScannerOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    onAddTask({
      title: taskName.trim(),
      department: taskDept,
      priority: taskPriority,
      status: 'not_started',
      deadline: taskDeadline,
      assignee: taskAssignee.trim(),
      notes: taskNotes.trim()
    });

    setTaskName('');
    setTaskNotes('');
    setIsAddingTask(false);
    showToast("🎉 Đã lưu và giao việc mới thành công!");
  };

  const handleQuickDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    onAddTask({
      title: quickName.trim(),
      department: quickDept,
      priority: 'high',
      status: 'in_progress',
      deadline: 'Today',
      assignee: quickAssignee,
      notes: 'Giao nhanh từ thanh Thao tác nhanh thời gian thực.'
    });

    setQuickName('');
    setQuickDelegateOpen(false);
    showToast(`✈️ Đã kích hoạt Giao nhanh cho nhân viên ${quickAssignee}!`);
  };

  const handleSelectTemplate = (tpl: typeof TASK_TEMPLATES[0]) => {
    onAddTask({
      title: tpl.title,
      department: tpl.department,
      priority: tpl.priority as any,
      status: 'not_started',
      deadline: 'Today',
      assignee: tpl.assignee,
      notes: tpl.notes
    });
    setTemplatesOpen(false);
    showToast(`📄 Đã tạo công việc theo mẫu: "${tpl.title}"`);
  };

  const handleConfirmScannedTask = () => {
    if (!scannedResult) return;
    onAddTask({
      title: `Đối soát Kho & Bảo hành - ${scannedResult.model}`,
      department: 'Kho',
      priority: 'high',
      status: 'in_progress',
      deadline: 'Today',
      assignee: 'Lê Văn C',
      notes: `Serial: ${scannedResult.serial}. Kết quả quét barcode: ${scannedResult.diagnostic}`
    });
    setScannerOpen(false);
    showToast("📸 Tự động tạo việc thành công qua máy quét mã!");
  };

  // Filter computation
  const filteredTasks = tasks.filter(task => {
    const titleMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = task.department.toLowerCase().includes(searchTerm.toLowerCase());
    const assigneeMatch = task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const notesMatch = task.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    if (!titleMatch && !deptMatch && !assigneeMatch && !notesMatch) return false;

    if (activeFilter === 'completed') {
      return task.status === 'completed';
    }
    if (activeFilter === 'late') {
      return task.status !== 'completed' && (task.deadline.toLowerCase().includes('trễ') || task.deadline.includes('08/05') || task.deadline.includes('Overdue'));
    }
    if (activeFilter === 'mine') {
      return task.assignee === 'Nguyễn Trường Giang' || task.assignee === 'Quản lý cửa hàng';
    }

    return true; 
  });

  const getDeptCircle = (dept: string) => {
    switch (dept?.toLowerCase()) {
      case 'kho':
      case 'kho hàng':
        return { short: 'KHO', bg: 'bg-[#005FF9] text-white' };
      case 'marketing':
      case 'mkt':
        return { short: 'MKT', bg: 'bg-[#7F00FF] text-white' };
      case 'kỹ thuật':
      case 'kt':
        return { short: 'KT', bg: 'bg-[#00B050] text-white' };
      case 'vận hành':
      case 'vh':
        return { short: 'VH', bg: 'bg-[#FF8000] text-white' };
      default:
        return { short: dept?.substring(0, 3).toUpperCase() || 'SYS', bg: 'bg-slate-600 text-white' };
    }
  };

  const priorityMeta = {
    high: { bg: 'bg-rose-50 text-rose-700 border-rose-100', text: 'Cao' },
    medium: { bg: 'bg-amber-50 text-amber-700 border-amber-100', text: 'Trung bình' },
    low: { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'Thấp' }
  };

  const statusMeta = {
    not_started: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Chưa làm' },
    in_progress: { bg: 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse', text: 'Đang làm' },
    waiting: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Chờ duyệt' },
    completed: { bg: 'bg-slate-900 text-white border-slate-950', text: 'Hoàn thành' }
  };

  return (
    <div className="space-y-3.5 text-left">
      
      {/* 1. NOTIFICATION TOAST SUCCESS STATUS */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xl text-xs font-bold font-sans max-w-sm transition-all animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. DYNAMIC APP BAR / HEADER WITH INTEGRATED ACTION BUTTONS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-[#C21A1A] border border-red-100 rounded-lg">
            🛫 PHÂN HỆ GIAO VIỆC &amp; CHI CA
          </span>
          <h1 className="text-xl font-black font-display tracking-tight text-slate-900 mt-2">
            Điều phối công việc Chi nhánh
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Quản trị tiến độ, ủy nhiệm siêu tốc và kiểm soát chỉ tiêu nhân sự trong ca trực showroom thời gian thực.
          </p>
        </div>
        
        {/* SINGLE UNIFIED ACTION BUTTON WITH DROPDOWN */}
        <div className="relative">
          <button 
            onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
            className="px-4 py-2.5 bg-[#C21A1A] hover:bg-[#A81515] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer select-none"
          >
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>Thao tác nhanh</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${actionsDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {actionsDropdownOpen && (
            <>
              {/* Tap to close backdrop */}
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setActionsDropdownOpen(false)}
              />
              
              {/* Dropdown Menu Items Container */}
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs text-slate-700 font-bold overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                
                <button
                  onClick={() => {
                    setIsAddingTask(true);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left text-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Tạo việc mới</span>
                </button>

                <button
                  onClick={() => {
                    setQuickName('');
                    setQuickDelegateOpen(true);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left text-slate-800 transition-colors"
                >
                  <Send className="w-4 h-4 text-[#C21A1A]" />
                  <span>Giao nhanh</span>
                </button>

                <button
                  onClick={() => {
                    setTemplatesOpen(true);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left text-slate-800 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Mẫu công việc SOP</span>
                </button>

                <button
                  onClick={() => {
                    handleStartBarcodeScanner();
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-left text-slate-800 transition-colors"
                >
                  <Camera className="w-4 h-4 text-cyan-600" />
                  <span>Quét Barcode sản phẩm</span>
                </button>

              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. CORE ANALYTICAL PILLS STRIP (NATIVE OVERVIEW STATS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CHƯA KHỞI ĐỘNG</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xl font-black font-mono text-slate-950">{tasks.filter(t => t.status === 'not_started').length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-2xs">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">ĐANG THỰC HIỆN</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xl font-black font-mono text-blue-700">{tasks.filter(t => t.status === 'in_progress').length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-2xs">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">CHỜ DUYỆT CA</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xl font-black font-mono text-amber-700">{tasks.filter(t => t.status === 'waiting').length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]"></span>
          </div>
        </div>

        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-150 shadow-2xs">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">HOÀN THÀNH</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xl font-black font-mono text-[#00B050]">{tasks.filter(t => t.status === 'completed').length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B050]"></span>
          </div>
        </div>

        <div className="bg-rose-55 bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 shadow-2xs col-span-2 md:col-span-1">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">QUÁ HẠN CHỐT CA</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xl font-black font-mono text-rose-700">
              {tasks.filter(t => t.status !== 'completed' && (t.deadline.toLowerCase().includes('trễ') || t.deadline.includes('08/05') || t.deadline.includes('Overdue'))).length}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          </div>
        </div>

      </div>

      {/* 4. FILTER CONTROLS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Switch Filter Tab Segment */}
        <div className="flex bg-slate-150 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          
          <button
            onClick={() => setActiveFilter('mine')}
            className={`px-4 py-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'mine'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Của tôi ({tasks.filter(t => t.assignee === 'Nguyễn Trường Giang' || t.assignee === 'Quản lý cửa hàng').length})
          </button>

          <button
            onClick={() => setActiveFilter('late')}
            className={`px-4 py-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'late'
                ? 'bg-rose-100/60 border border-rose-100 text-rose-700'
                : 'text-slate-500 hover:text-rose-750 hover:text-rose-700'
            }`}
          >
            Trễ hạn ({tasks.filter(t => t.status !== 'completed' && (t.deadline.toLowerCase().includes('trễ') || t.deadline.includes('08/05'))).length})
          </button>

          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-4 py-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'completed'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đã hoàn thành ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>

        {/* Dynamic Live Text Input */}
        <div className="relative md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo công việc, phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
          />
        </div>

      </div>

      {/* 5. PRISTINE CARD STREAM OF TASKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs col-span-full">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-extrabold text-slate-850 text-slate-800 text-xs">Không tìm thấy nhiệm vụ nào</h4>
            <p className="text-[10.5px] text-slate-400 mt-1 max-w-xs mx-auto">Vui lòng rà soát lại ký tự tìm kiếm hoặc bộ chuyển đổi trạng thái ở trên.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isLate = task.status !== 'completed' && (task.deadline.toLowerCase().includes('trễ') || task.deadline.includes('08/05') || task.deadline.includes('Overdue'));
            const deptMeta = getDeptCircle(task.department);
            
            return (
              <div 
                key={task.id}
                className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md flex flex-col justify-between relative overflow-hidden h-[185px] ${
                  isLate 
                    ? 'border-red-300 shadow-sm bg-red-50/5' 
                    : 'border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Upper Zone: Badges & Dropdown Action Menu */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Circle department color marker */}
                    <span className={`px-2 py-0.5 text-[8.5px] font-black rounded tracking-wide shadow-2xs ${deptMeta.bg}`}>
                      {deptMeta.short}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${priorityMeta[task.priority].bg}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {priorityMeta[task.priority].text}
                    </span>
                  </div>

                  {/* Context State Menu Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === task.id && (
                      <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 text-white rounded-xl shadow-xl z-25 py-1 text-[11px] font-bold border border-slate-800 animate-in fade-in duration-100">
                        <p className="px-3 py-1 text-slate-400 text-[8.5px] uppercase font-black tracking-wider border-b border-slate-800 mb-1">Cập nhật nhanh</p>
                        {(['not_started', 'in_progress', 'waiting', 'completed'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              onUpdateTaskStatus(task.id, st);
                              setActiveMenuId(null);
                              showToast(`🔄 Cập nhật trạng thái sang: "${statusMeta[st].text}"`);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between font-bold text-slate-200 transition-colors"
                          >
                            <span>{statusMeta[st].text}</span>
                            {task.status === st && <Check className="w-3.5 h-3.5 text-[#C21A1A] stroke-[3]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mid Zone: Title and notes instructions */}
                <div className="my-2.5 text-left flex-1">
                  <h3 className="font-extrabold text-slate-900 text-xs tracking-tight line-clamp-1">
                    {task.title}
                  </h3>
                  {task.notes ? (
                    <p className="text-[10.5px] text-slate-400 font-medium line-clamp-2 mt-1 whitespace-pre-line leading-relaxed">
                      {task.notes}
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-slate-300 italic font-medium mt-1">
                      Không có ghi chú nào đi kèm trong nhiệm vụ này...
                    </p>
                  )}
                </div>

                {/* Bottom Zone: Deadline & Assignee card */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold mt-auto gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isLate ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <Calendar className={`w-3.5 h-3.5 ${isLate ? 'text-red-600' : 'text-slate-400'}`} />
                    <span>{task.deadline}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${statusMeta[task.status].bg}`}>
                      {statusMeta[task.status].text}
                    </span>

                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 pl-1.5 pr-2 py-0.5 rounded-lg max-w-[105px]">
                      <div className="w-4.5 h-4.5 rounded-full bg-slate-200 shrink-0 text-[10px] flex items-center justify-center font-bold text-slate-600">
                        {task.assignee?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-500 truncate">{task.assignee}</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ======================= INTERACTIVE MODAL FORMS ========================= */}
      {/* ========================================================================= */}

      {/* Manual Add Task Form Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#C21A1A] stroke-[2.5]" />
                TẠO CÔNG VIỆC MỚI CHI TIẾT
              </h3>
              <button onClick={() => setIsAddingTask(false)} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">Tên phần việc / Nhiệm vụ *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kiểm tra hàng iPhone 11 tồn kho"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 text-xs font-semibold rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Phòng ban</label>
                  <select
                    value={taskDept}
                    onChange={(e) => setTaskDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-2.5 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <option value="Kho">Kho hàng</option>
                    <option value="Marketing">Marketing (MKT)</option>
                    <option value="Kỹ thuật">Kỹ thuật (KT)</option>
                    <option value="Vận hành">Vận hành (VH)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Mức ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-2.5 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Hạn chót (Deadline)</label>
                  <input
                    type="text"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    placeholder="Today hoặc 08/04/2026"
                    required
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-semibold rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Người phụ trách</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="Họ tên nhân sự"
                    required
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-semibold rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">Ghi chú hướng dẫn (Nếu có)</label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Ghi rõ thông điệp, quy trình tránh nhầm lẫn..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs font-medium rounded-lg"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer animate-none"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Delegate Modal */}
      {quickDelegateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-left border border-slate-100">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150">
              <h3 className="text-xs font-black text-[#C21A1A] uppercase tracking-wider flex items-center gap-2">
                <span>✈</span> GIAO VIỆC SIÊU TỐC CA LÀM VIỆC
              </h3>
              <button onClick={() => setQuickDelegateOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">×</button>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Giao khẩn phần việc đột xuất cho ca trực. Chỉ cần mô tả ngắn và chọn nhân sự chốt nhanh.
            </p>

            <form onSubmit={handleQuickDelegate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase">TÊN PHẦN VIỆC KHẨN CẤP *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lau dọn quầy thu ngân trung tâm"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 text-xs font-semibold rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase">CHỌN NGƯỜI NHẬN NHANH</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { name: 'Lê Văn C', role: 'Thủ kho ca trực', dept: 'Kho' },
                    { name: 'Nguyễn Trường Giang', role: 'Sales trưởng ca', dept: 'Marketing' },
                    { name: 'Trần Thanh Hoài', role: 'Kỹ thuật viên', dept: 'Kỹ thuật' },
                    { name: 'Đặng Hùng An', role: 'Kho phó', dept: 'Kho' }
                  ].map((cand) => (
                    <button
                      key={cand.name}
                      type="button"
                      onClick={() => {
                        setQuickAssignee(cand.name);
                        setQuickDept(cand.dept);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        quickAssignee === cand.name 
                          ? 'border-[#C21A1A] bg-[#C21A1A]/5 shadow-2xs' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <h4 className="font-extrabold text-slate-800 text-xs">{cand.name}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{cand.role}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickDelegateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Giao nhanh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates choosing Dialog modal */}
      {templatesOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-left border border-slate-100">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-[#C21A1A]" />
                MẪU CÔNG VIỆC CHUẨN SOP
              </h3>
              <button onClick={() => setTemplatesOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">×</button>
            </div>

            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Tạo công việc 1 chạm dựa trên kịch bản chuẩn hóa quy trình phục vụ từ chuỗi.
            </p>

            <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto">
              {TASK_TEMPLATES.map((tpl, i) => {
                const deptMeta = getDeptCircle(tpl.department);
                return (
                  <div 
                    key={i}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#C21A1A] bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex items-start gap-3 group text-left"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${deptMeta.bg}`}>
                      {deptMeta.short}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Kịch bản: {tpl.department}</span>
                        <span className="text-[9px] font-black text-[#C21A1A] group-hover:underline">Áp dụng &gt;</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-xs mt-0.5">{tpl.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-medium">{tpl.notes}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Simulator Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-left border border-slate-150">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150">
              <h3 className="text-xs font-black text-[#C21A1A] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4.5 h-4.5 text-[#C21A1A] animate-pulse" />
                MÁY QUÉT BARCODE SERIAL - HÌNH ẢNH
              </h3>
              <button onClick={() => setScannerOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">×</button>
            </div>

            <div className="relative h-44 bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center text-white">
              {scannerState === 'scanning' ? (
                <>
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-[bounce_2s_infinite]"></div>
                  <div className="absolute inset-8 border border-white/20 border-dashed rounded-lg flex items-center justify-center flex-col space-y-2">
                    <span className="text-[9.5px] text-slate-300 uppercase tracking-widest font-black animate-pulse">ĐANG QUÉT MÃ VẠCH SẢN PHẨM...</span>
                    <span className="text-[9px] text-slate-500 font-mono">Đặt mã serial thiết bị vào tâm camera</span>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center z-10 space-y-2">
                  <span className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-base font-bold shadow-xl">✔</span>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">THÔNG TIN NHẬN DIỆN THÀNH CÔNG</p>
                    <p className="text-xs font-black bg-white text-slate-900 px-2.5 py-1 rounded shadow-sm inline-block">{scannedResult?.model}</p>
                    <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Serial: {scannedResult?.serial}</p>
                  </div>
                </div>
              )}
            </div>

            {scannerState === 'scanning' ? (
              <p className="text-[10.5px] text-slate-400 text-center font-bold">
                Hệ thống đang giả lập giải mã serial sản phẩm...
              </p>
            ) : (
              <div className="space-y-3.5 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-250/60 text-[11px] font-bold">
                  <span className="text-red-700 uppercase tracking-wider block mb-1 text-[9.5px]">Trạng thái kỹ thuật đề xuất</span>
                  <p className="text-slate-600 font-semibold">"{scannedResult?.diagnostic}"</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScannerState('scanning')}
                    className="py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-center"
                  >
                    Quét lại
                  </button>
                  <button
                    onClick={handleConfirmScannedTask}
                    className="py-2 text-xs font-black text-white bg-[#C21A1A] hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer text-center"
                  >
                    Tạo việc đối soát
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
