import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Layers, 
  Wrench, 
  Warehouse, 
  Coins, 
  CheckCircle, 
  CheckCircle2, 
  Smile, 
  Info,
  Calendar,
  Search,
  SlidersHorizontal,
  Image,
  User,
  Circle,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Trash2,
  Camera,
  Upload,
  X,
  Lock,
  CheckSquare,
  Edit3
} from 'lucide-react';
import { ChecklistCategory, ChecklistItem, TreeProcess, ProcessStep } from '../../types';
import { dbFetchList, dbSaveDoc, dbDeleteDoc, dbBatchSave } from '../../firebase';

interface ChecklistViewProps {
  categories: ChecklistCategory[];
  items: ChecklistItem[];
  currentUser?: { username: string; role: string; fullName: string; avatar?: string } | null;
  onToggleItem: (itemId: string) => void;
  onAddItem: (categoryId: string, title: string, targetRole?: string, timeSlot?: string) => void;
  onAddMultipleItems?: (categoryId: string, tasksToCreate: { title: string; targetRole: string; timeSlot: string }[]) => void;
  onAddCategory: (title: string, targetRole?: string, icon?: string, color?: string) => void;
  onAddCategoryWithTasks?: (categoryTitle: string, categoryRole: string, tasksToCreate: { title: string; targetRole: string; timeSlot: string }[], icon?: string, color?: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<ChecklistItem>) => void;
  onUpdateCategory?: (categoryId: string, updates: Partial<ChecklistCategory>) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onClearAllChecklists?: () => void;
  onResetChecklists?: () => void;
}

// Map category metadata dynamically for theme symmetry matching the reference phone UI image
const CATEGORY_META: Record<string, {
  label: string;
  themeColor: string; // Tailwinds classes
  barColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  accentHex: string;
}> = {
  opening: {
    label: '1. Mở cửa',
    themeColor: 'border-emerald-200 bg-emerald-50/20 text-emerald-800',
    barColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100/70 text-emerald-800',
    accentHex: '#107c41'
  },
  sales: {
    label: '2. Bán hàng – Bàn giao',
    themeColor: 'border-blue-200 bg-blue-50/20 text-blue-800',
    barColor: 'bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100/70 text-blue-800',
    accentHex: '#0066CC'
  },
  cleaning: {
    label: '3. Sửa chữa – Bảo hành',
    themeColor: 'border-amber-200 bg-amber-50/20 text-amber-800',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100/70 text-amber-800',
    accentHex: '#E67E22'
  },
  inventory: {
    label: '4. Kho – Kiểm kê',
    themeColor: 'border-purple-200 bg-purple-50/20 text-purple-800',
    barColor: 'bg-purple-600',
    iconBg: 'bg-purple-100 text-purple-700',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100/70 text-purple-800',
    accentHex: '#8E44AD'
  },
  closing: {
    label: '5. Chốt ca – Báo cáo',
    themeColor: 'border-rose-200 bg-rose-50/20 text-rose-800',
    barColor: 'bg-[#C21A1A]',
    iconBg: 'bg-rose-100 text-rose-700',
    iconColor: 'text-[#C21A1A]',
    badgeBg: 'bg-rose-100/70 text-rose-800',
    accentHex: '#C21A1A'
  }
};

const COLOR_PRESETS: Record<string, {
  themeColor: string;
  barColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  accentHex: string;
}> = {
  rose: {
    themeColor: 'border-rose-200 bg-rose-50/20 text-rose-800',
    barColor: 'bg-[#C21A1A]',
    iconBg: 'bg-rose-100 text-[#C21A1A]',
    iconColor: 'text-[#C21A1A]',
    badgeBg: 'bg-rose-100/70 text-rose-800',
    accentHex: '#C21A1A'
  },
  emerald: {
    themeColor: 'border-emerald-200 bg-emerald-50/20 text-emerald-800',
    barColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100/70 text-emerald-800',
    accentHex: '#107c41'
  },
  blue: {
    themeColor: 'border-blue-200 bg-blue-50/20 text-blue-800',
    barColor: 'bg-blue-600',
    iconBg: 'bg-blue-100 text-blue-705',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100/70 text-blue-850',
    accentHex: '#0066CC'
  },
  amber: {
    themeColor: 'border-amber-200 bg-amber-50/20 text-amber-800',
    barColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 text-amber-705',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100/70 text-amber-800',
    accentHex: '#E67E22'
  },
  purple: {
    themeColor: 'border-purple-200 bg-purple-50/20 text-purple-800',
    barColor: 'bg-purple-600',
    iconBg: 'bg-purple-100 text-purple-705',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100/70 text-purple-800',
    accentHex: '#8E44AD'
  },
  indigo: {
    themeColor: 'border-indigo-200 bg-indigo-50/20 text-indigo-805',
    barColor: 'bg-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-705',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-100/70 text-indigo-800',
    accentHex: '#4F46E5'
  },
  cyan: {
    themeColor: 'border-cyan-200 bg-cyan-50/20 text-cyan-805',
    barColor: 'bg-cyan-600',
    iconBg: 'bg-cyan-100 text-cyan-705',
    iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-100/70 text-cyan-800',
    accentHex: '#0891B2'
  },
  slate: {
    themeColor: 'border-slate-200 bg-slate-50 text-slate-805',
    barColor: 'bg-slate-600',
    iconBg: 'bg-slate-100 text-slate-705',
    iconColor: 'text-slate-600',
    badgeBg: 'bg-slate-100 text-slate-800',
    accentHex: '#64748B'
  }
};

const COLOR_OPTIONS = [
  { id: 'rose', name: 'Đỏ Đô', hex: '#C21A1A', bg: 'bg-[#C21A1A]' },
  { id: 'emerald', name: 'Lục bảo', hex: '#107c41', bg: 'bg-emerald-600' },
  { id: 'blue', name: 'Lam', hex: '#0066CC', bg: 'bg-blue-600' },
  { id: 'amber', name: 'Hổ phách', hex: '#E67E22', bg: 'bg-amber-500' },
  { id: 'purple', name: 'Tím hoa', hex: '#8E44AD', bg: 'bg-purple-600' },
  { id: 'indigo', name: 'Chàm', hex: '#4F46E5', bg: 'bg-indigo-600' },
  { id: 'cyan', name: 'Xanh băng', hex: '#0891B2', bg: 'bg-cyan-600' },
];

const ICON_OPTIONS = [
  { id: 'Layers', name: 'Mặc định', icon: Layers },
  { id: 'Calendar', name: 'Mở cửa', icon: Calendar },
  { id: 'Coins', name: 'Tiền tệ', icon: Coins },
  { id: 'Wrench', name: 'Sửa chữa', icon: Wrench },
  { id: 'Warehouse', name: 'Kho bãi', icon: Warehouse },
  { id: 'FileText', name: 'Báo cáo', icon: FileText },
  { id: 'Smile', name: 'Chăm sóc', icon: Smile },
  { id: 'CheckSquare', name: 'Nhiệm vụ', icon: CheckSquare },
  { id: 'Lock', name: 'Chốt ca', icon: Lock },
  { id: 'Camera', name: 'Hình ảnh', icon: Camera },
  { id: 'ClipboardList', name: 'Kế hoạch', icon: ClipboardList },
  { id: 'Sparkles', name: 'Đặc biệt', icon: Sparkles },
];

const getCreationColorClasses = (color: string) => {
  switch (color) {
    case 'emerald': return { bg: 'bg-emerald-50/40', border: 'border-emerald-100/90', focusRing: 'focus:outline-emerald-600 focus:ring-emerald-600', tintText: 'text-emerald-700' };
    case 'blue': return { bg: 'bg-blue-50/40', border: 'border-blue-100/90', focusRing: 'focus:outline-blue-600 focus:ring-blue-600', tintText: 'text-blue-700' };
    case 'amber': return { bg: 'bg-amber-50/40', border: 'border-amber-100/90', focusRing: 'focus:outline-amber-600 focus:ring-amber-600', tintText: 'text-amber-700' };
    case 'purple': return { bg: 'bg-purple-50/40', border: 'border-purple-100/90', focusRing: 'focus:outline-purple-600 focus:ring-purple-600', tintText: 'text-purple-700' };
    case 'indigo': return { bg: 'bg-indigo-50/40', border: 'border-indigo-100/90', focusRing: 'focus:outline-indigo-600 focus:ring-indigo-600', tintText: 'text-indigo-700' };
    case 'cyan': return { bg: 'bg-cyan-50/40', border: 'border-cyan-100/90', focusRing: 'focus:outline-cyan-600 focus:ring-cyan-600', tintText: 'text-cyan-700' };
    case 'rose':
    default:
      return { bg: 'bg-red-50/40', border: 'border-red-100/90', focusRing: 'focus:outline-[#C21A1A] focus:ring-[#C21A1A]', tintText: 'text-[#C21A1A]' };
  }
};

const getIconSelectionActiveStyles = (color: string) => {
  switch (color) {
    case 'emerald': return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' };
    case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' };
    case 'amber': return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' };
    case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-705' };
    case 'indigo': return { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-705' };
    case 'cyan': return { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-705' };
    case 'rose':
    default:
      return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-[#C21A1A]' };
  }
};

const renderCategoryIcon = (cat: any) => {
  const iconName = cat.icon || 'Layers';
  const colorClass = cat.meta?.iconColor || 'text-slate-600';
  const size = "w-5 h-5";

  switch (iconName) {
    case 'Calendar': return <Calendar className={`${size} ${colorClass}`} />;
    case 'Coins': return <Coins className={`${size} ${colorClass}`} />;
    case 'Wrench': return <Wrench className={`${size} ${colorClass}`} />;
    case 'Warehouse': return <Warehouse className={`${size} ${colorClass}`} />;
    case 'FileText': return <FileText className={`${size} ${colorClass}`} />;
    case 'Smile': return <Smile className={`${size} ${colorClass}`} />;
    case 'CheckSquare': return <CheckSquare className={`${size} ${colorClass}`} />;
    case 'Lock': return <Lock className={`${size} ${colorClass}`} />;
    case 'Camera': return <Camera className={`${size} ${colorClass}`} />;
    case 'ClipboardList': return <ClipboardList className={`${size} ${colorClass}`} />;
    case 'Sparkles': return <Sparkles className={`${size} ${colorClass}`} />;
    case 'Plus': return <Plus className={`${size} ${colorClass}`} />;
    case 'Info': return <Info className={`${size} ${colorClass}`} />;
    case 'Layers':
    default:
      return <Layers className={`${size} ${colorClass}`} />;
  }
};

// Map mock timings to items for a highly realistic feel
const ITEM_TIMINGS: Record<string, string> = {
  // Opening
  op1: '07:30',
  op2: '07:35',
  op3: '07:40',
  op4: '07:45',
  op5: '07:50',
  // Cleaning / Sửa chữa
  cl1: '08:30',
  cl2: '08:35',
  cl3: '08:40',
  cl4: '08:45',
  // Inventory
  iv1: '09:00',
  iv2: '09:10',
  iv3: '09:20',
  iv4: '09:30',
  iv5: '09:40',
  // Sales
  sl1: '08:05',
  sl2: '08:10',
  sl3: '08:15',
  sl4: '08:20',
  sl5: '08:25',
  sl6: '10:00',
  sl7: '10:15',
  // Closing
  cs1: '20:30',
  cs2: '20:45',
  cs3: '21:00',
  cs4: '21:15',
};

const DEFAULT_TREE_PROCESSES: TreeProcess[] = [
  {
    id: 'proc-handover',
    title: 'Quy trình kiểm soát bàn giao Ca trực',
    description: 'Hướng dẫn chuẩn hóa quy trình kiểm két tiền mặt, đối soát dòng tiền POS KiotViet và bàn giao vệ sinh hiện trường.',
    targetRole: 'Tất cả',
    createdAt: '01/06/2026',
    steps: [
      {
        id: 'proc-hand-s1',
        title: 'Bước 1: Chốt quỹ két tiền lẻ của showroom',
        tasks: [
          'Kiểm đếm toàn bộ tiền mặt lẻ trong ca (Mối ca dạn mức giữ lại 3,000,000đ)',
          'Đồng bộ dữ liệu dòng tiền thu chi tức thời lên app quản lý POS'
        ]
      },
      {
        id: 'proc-hand-s2',
        title: 'Bước 2: Niêm phong và kết chuyển dòng tiền chính',
        tasks: [
          'Chuyển toàn bộ tiền mặt doanh số ngoài két lẻ bỏ vào xấp két sắt an toàn',
          'Chụp ảnh biên lai quét mã QR thanh toán ngân hàng chuyển khoản để lưu trữ'
        ]
      },
      {
        id: 'proc-hand-s3',
        title: 'Bước 3: Vệ sinh dọn dẹp & Tắt các thiết bị điện an toàn',
        tasks: [
          'Lau sạch sẽ bụi bám quầy và mồ hôi trên sản phẩm mẫu (iPhone/iPad demo)',
          'Dập cầu dao Aptomat máy chiếu sáng trang trí ngoài trời, khóa chặt chốt cửa rèm',
          'Báo cáo hoàn thành lên nhóm chat trao quyền cho ca tiếp theo'
        ]
      }
    ]
  },
  {
    id: 'proc-vip-iphone',
    title: 'Quy trình Đón tiếp khách hàng mua iPhone VIP',
    description: 'Nghi thức 5 sao đón chào khách hàng trải nghiệm mua sắm và bàn giao máy Mr. Táo.',
    targetRole: 'Sales',
    createdAt: '01/06/2026',
    steps: [
      {
        id: 'proc-vip-s1',
        title: 'Bước 1: Chào đón mở cửa & tư vấn chuẩn mực',
        tasks: [
          'Cúi đầu chào nồng nhiệt "Mr. Táo xin chào Anh/Chị" kèm nụ cười rạng rỡ',
          'Mở cửa tủ mẫu hỗ trợ khách hàng cầm nắm trải nghiệm không khí mát mẻ',
          'Vừa rót nước đóng chai Mr. Táo vừa giới thiệu chế độ bảo hành vàng 12 tháng lỗi đổi mới'
        ]
      },
      {
        id: 'proc-vip-s2',
        title: 'Bước 2: Set-up hoàn thiện máy siêu tốc',
        tasks: [
          'Hỗ trợ khách hàng truyền toàn bộ dữ liêu cũ sang thiết bị mới an toàn',
          'Tặng kèm & tự tay dán kính cường lực chính hãng mặt trước sau chu đáo',
          'Bày khay hộp iPhone chuẩn phong cách đập hộp chụp ảnh lưu niệm cùng khách'
        ]
      }
    ]
  }
];

export default function ChecklistView({
  categories,
  items,
  currentUser,
  onToggleItem,
  onAddItem,
  onAddMultipleItems,
  onAddCategory,
  onAddCategoryWithTasks,
  onUpdateItem,
  onUpdateCategory,
  onDeleteItem,
  onDeleteCategory,
  onClearAllChecklists,
  onResetChecklists
}: ChecklistViewProps) {
  const [subTab, setSubTab] = useState<'today' | 'process' | 'completed'>('today');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('opening');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check role authorization details
  const isAdmin = currentUser?.role === 'Quản lý' || currentUser?.role === 'CHU_CUA_HANG' || currentUser?.role === 'QUAN_LY' || currentUser?.username === 'admin' || currentUser?.username === 'manager';

  // Custom states for inputs
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [createNewCategory, setCreateNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryRole, setCategoryRole] = useState('Tất cả');
  const [categoryIcon, setCategoryIcon] = useState('Layers');
  const [categoryColor, setCategoryColor] = useState('rose');
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState(categories[0]?.id || 'opening');
  
  // Tasks list for creating multiple items at once
  const [tasksToCreate, setTasksToCreate] = useState<Array<{
    title: string;
    timeSlot: string;
  }>>([
    { title: '', timeSlot: '08:00' }
  ]);

  // Detail Modal popup uploader states
  const [activeDetailItem, setActiveDetailItem] = useState<ChecklistItem | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // States for editing ChecklistCategory (Today tab)
  const [editingCategory, setEditingCategory] = useState<ChecklistCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryRole, setEditCategoryRole] = useState('Tất cả');
  const [editCategoryIcon, setEditCategoryIcon] = useState('Layers');
  const [editCategoryColor, setEditCategoryColor] = useState('rose');

  // States for editing TreeProcess (Process tab)
  const [editingTreeProcess, setEditingTreeProcess] = useState<TreeProcess | null>(null);
  const [editTreeTitle, setEditTreeTitle] = useState('');
  const [editTreeRole, setEditTreeRole] = useState('Tất cả');
  const [editTreeDesc, setEditTreeDesc] = useState('');
  const [editTreeSteps, setEditTreeSteps] = useState<Array<{
    id: string;
    title: string;
    tasksText: string;
    subSteps: Array<{
      id: string;
      title: string;
      tasksText: string;
    }>;
  }>>([]);

  // States for tree-structured processes ("Theo quy trình" tab)
  const [treeProcesses, setTreeProcesses] = useState<TreeProcess[]>(() => {
    try {
      const saved = localStorage.getItem('mrt_tree_processes_v1');
      return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : DEFAULT_TREE_PROCESSES;
    } catch {
      return DEFAULT_TREE_PROCESSES;
    }
  });

  // Sync treeProcesses with Firebase Firestore on mount
  useEffect(() => {
    async function loadTreeProcesses() {
      try {
        const procs = await dbFetchList<TreeProcess>('tree_processes');
        if (procs.length > 0) {
          procs.sort((a, b) => {
            const aTs = Number(a.id.replace('process-', '')) || 0;
            const bTs = Number(b.id.replace('process-', '')) || 0;
            return bTs - aTs;
          });
          setTreeProcesses(procs);
        } else {
          await dbBatchSave('tree_processes', DEFAULT_TREE_PROCESSES);
        }
      } catch (err) {
        console.error("Error loading tree processes from Firebase:", err);
      }
    }
    loadTreeProcesses();
  }, []);

  const [expandedProcessIds, setExpandedProcessIds] = useState<string[]>([]);
  const [isAddingTreeProcess, setIsAddingTreeProcess] = useState(false);
  const [newTreeTitle, setNewTreeTitle] = useState('');
  const [newTreeRole, setNewTreeRole] = useState('Tất cả');
  const [newTreeDesc, setNewTreeDesc] = useState('');
  const [editingTreeSteps, setEditingTreeSteps] = useState<Array<{
    id: string;
    title: string;
    tasksText: string;
    subSteps: Array<{
      id: string;
      title: string;
      tasksText: string;
    }>;
  }>>([
    {
      id: `initial-step-${Date.now()}`,
      title: '',
      tasksText: '',
      subSteps: []
    }
  ]);

  const toggleExpandProcess = (procId: string) => {
    setExpandedProcessIds(prev => 
      prev.includes(procId) ? prev.filter(id => id !== procId) : [...prev, procId]
    );
  };

  const handleDeleteTreeProcess = (procId: string) => {
    const updated = treeProcesses.filter(p => p.id !== procId);
    setTreeProcesses(updated);
    localStorage.setItem('mrt_tree_processes_v1', JSON.stringify(updated));

    // Concurrently delete from Firebase
    dbDeleteDoc('tree_processes', procId);
  };

  const handleCreateTreeProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeTitle.trim()) {
      alert("Vui lòng nhập tên quy trình!");
      return;
    }

    const stepsParsed: ProcessStep[] = editingTreeSteps.map((est, coreIdx) => {
      // parse flat tasks for core step
      const coreTasks = est.tasksText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // parse sub-steps
      const parsedSubSteps: ProcessStep[] = est.subSteps.map((sub, subIdx) => {
        const subTasks = sub.tasksText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        return {
          id: `step-sub-${Date.now()}-${coreIdx}-${subIdx}`,
          title: sub.title.trim() || `Bước nhỏ ${subIdx + 1}`,
          tasks: subTasks.length > 0 ? subTasks : undefined
        };
      });

      return {
        id: `step-core-${Date.now()}-${coreIdx}`,
        title: est.title.trim() || `Bước chính ${coreIdx + 1}`,
        tasks: coreTasks.length > 0 ? coreTasks : undefined,
        steps: parsedSubSteps.length > 0 ? parsedSubSteps : undefined
      };
    });

    const newProcess: TreeProcess = {
      id: `process-${Date.now()}`,
      title: newTreeTitle.trim(),
      targetRole: newTreeRole,
      description: newTreeDesc.trim(),
      steps: stepsParsed,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    const updated = [newProcess, ...treeProcesses];
    setTreeProcesses(updated);
    localStorage.setItem('mrt_tree_processes_v1', JSON.stringify(updated));

    // Save to Firebase Firestore
    dbSaveDoc('tree_processes', newProcess);

    // Reset Form
    setNewTreeTitle('');
    setNewTreeRole('Tất cả');
    setNewTreeDesc('');
    setEditingTreeSteps([
      {
        id: `initial-step-${Date.now()}`,
        title: '',
        tasksText: '',
        subSteps: []
      }
    ]);
    setIsAddingTreeProcess(false);
  };

  const handleSaveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      alert("Vui lòng nhập tên nhóm quy trình!");
      return;
    }

    if (onUpdateCategory) {
      onUpdateCategory(editingCategory.id, {
        title: editCategoryName.trim(),
        targetRole: editCategoryRole,
        icon: editCategoryIcon,
        color: editCategoryColor
      });
    }
    setEditingCategory(null);
  };

  const handleSaveTreeProcessEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreeProcess) return;
    if (!editTreeTitle.trim()) {
      alert("Vui lòng nhập tên quy trình!");
      return;
    }

    const stepsParsed: ProcessStep[] = editTreeSteps.map((est, coreIdx) => {
      // parse flat tasks for core step
      const coreTasks = est.tasksText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // parse sub-steps
      const parsedSubSteps: ProcessStep[] = est.subSteps.map((sub, subIdx) => {
        const subTasks = sub.tasksText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        return {
          id: sub.id.startsWith('step-sub-') ? sub.id : `step-sub-${Date.now()}-${coreIdx}-${subIdx}`,
          title: sub.title.trim() || `Bước nhỏ ${subIdx + 1}`,
          tasks: subTasks.length > 0 ? subTasks : undefined
        };
      });

      return {
        id: est.id.startsWith('step-core-') ? est.id : `step-core-${Date.now()}-${coreIdx}`,
        title: est.title.trim() || `Bước chính ${coreIdx + 1}`,
        tasks: coreTasks.length > 0 ? coreTasks : undefined,
        steps: parsedSubSteps.length > 0 ? parsedSubSteps : undefined
      };
    });

    const updatedProcess: TreeProcess = {
      ...editingTreeProcess,
      title: editTreeTitle.trim(),
      targetRole: editTreeRole,
      description: editTreeDesc.trim(),
      steps: stepsParsed
    };

    const updated = treeProcesses.map(p => p.id === editingTreeProcess.id ? updatedProcess : p);
    setTreeProcesses(updated);
    localStorage.setItem('mrt_tree_processes_v1', JSON.stringify(updated));

    // Save to Firebase Firestore
    dbSaveDoc('tree_processes', updatedProcess);

    setEditingTreeProcess(null);
  };

  // Handle accordion toggle
  const toggleExpand = (catId: string) => {
    setExpandedCategoryId(expandedCategoryId === catId ? null : catId);
  };

  // Filter categories and search items according to role privileges
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      // Step 1: Filter by sub-tab state
      if (subTab === 'completed') {
        if (cat.countDone !== cat.countTotal || cat.countTotal === 0) return false;
      }
      if (subTab === 'process') {
        if (cat.countDone === cat.countTotal && cat.countTotal > 0) return false;
      }
      return true;
    }).map(cat => {
      // Check category-level targetRole permissions for view visibility:
      const catRole = cat.targetRole || 'Tất cả';
      if (!isAdmin && catRole !== 'Tất cả' && catRole !== currentUser?.role) {
        return null;
      }

      // Step 2: Decorate with label & metadata matching phone UI list
      let meta = CATEGORY_META[cat.id];
      if (!meta) {
        const catColorKey = cat.color || 'slate';
        const preset = COLOR_PRESETS[catColorKey] || COLOR_PRESETS.slate;
        meta = {
          label: cat.title,
          themeColor: preset.themeColor,
          barColor: preset.barColor,
          iconBg: preset.iconBg,
          iconColor: preset.iconColor,
          badgeBg: preset.badgeBg,
          accentHex: preset.accentHex
        };
      }

      // Filter tasks within this cat if search string matches
      const catTasks = items.filter(it => it.categoryId === cat.id);

      const filteredTasks = catTasks.filter(it => 
        it.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return {
        ...cat,
        meta,
        tasks: filteredTasks,
        originalCount: catTasks.length
      };
    }).filter((cat): cat is (Exclude<typeof cat, null>) => {
      if (cat === null) return false;
      if (searchTerm.trim() !== '') {
        return cat.tasks.length > 0;
      }
      return true;
    });
  }, [categories, items, subTab, searchTerm, isAdmin, currentUser]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter non-empty tasks
    const validTasks = tasksToCreate.filter(t => t.title.trim().length > 0);
    if (validTasks.length === 0) {
      alert("Vui lòng nhập ít nhất một công việc cần làm!");
      return;
    }

    const shouldForceNewCategory = categories.length === 0;
    const isCreatingNewGroup = createNewCategory || shouldForceNewCategory;

    if (isCreatingNewGroup) {
      if (!newCategoryName.trim()) {
        alert("Vui lòng nhập tên nhóm quy trình mới!");
        return;
      }
      if (onAddCategoryWithTasks) {
        onAddCategoryWithTasks(newCategoryName.trim(), categoryRole, validTasks, categoryIcon, categoryColor);
      } else {
        onAddCategory(newCategoryName.trim(), categoryRole, categoryIcon, categoryColor);
      }
    } else {
      if (onAddMultipleItems) {
        const parentCat = categories.find(c => c.id === selectedCategoryForNewItem);
        const parentRole = parentCat?.targetRole || 'Tất cả';
        const tasksWithRole = validTasks.map(t => ({
          title: t.title,
          targetRole: parentRole,
          timeSlot: t.timeSlot
        }));
        onAddMultipleItems(selectedCategoryForNewItem, tasksWithRole);
      } else {
        validTasks.forEach(t => {
          onAddItem(selectedCategoryForNewItem, t.title.trim(), undefined, t.timeSlot);
        });
      }
    }

    // Reset Creation form states
    setTasksToCreate([{ title: '', timeSlot: '08:00' }]);
    setNewCategoryName('');
    setCategoryRole('Tất cả');
    setCategoryIcon('Layers');
    setCategoryColor('rose');
    setCreateNewCategory(false);
    setIsAddingItem(false);
  };

  const filteredTreeProcesses = useMemo(() => {
    return treeProcesses.filter(p => {
      if (isAdmin) return true;
      const role = p.targetRole || 'Tất cả';
      if (role === 'Tất cả') return true;
      return role === currentUser?.role;
    });
  }, [treeProcesses, isAdmin, currentUser]);

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-gray-900 flex items-center gap-2">
            📋 Checklist &amp; Quy trình
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Thực thi hằng ngày theo tiêu chuẩn và được duyệt.
          </p>
        </div>

        {/* System Primary Brand Add button */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 items-center">
            {subTab === 'today' && (
              <button
                onClick={() => {
                  setTasksToCreate([{ title: '', timeSlot: '08:00' }]);
                  setCreateNewCategory(false);
                  setNewCategoryName('');
                  setCategoryRole('Tất cả');
                  setSelectedCategoryForNewItem(categories[0]?.id || 'opening');
                  setIsAddingItem(true);
                }}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C21A1A] hover:bg-red-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm checklist mới</span>
              </button>
            )}

            {subTab === 'process' && (
              <button
                onClick={() => {
                  setNewTreeTitle('');
                  setNewTreeRole('Tất cả');
                  setNewTreeDesc('');
                  setEditingTreeSteps([
                    {
                      id: `step-${Date.now()}`,
                      title: '',
                      tasksText: '',
                      subSteps: []
                    }
                  ]);
                  setIsAddingTreeProcess(true);
                }}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C21A1A] hover:bg-red-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm quy trình</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. BỘ LỌC THÔNG MINH - Segmented Tabs with Icons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto scrollbar-none gap-1">
          <button
            onClick={() => setSubTab('today')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'today'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Hôm nay</span>
          </button>
          
          <button
            onClick={() => setSubTab('process')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'process'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Theo quy trình</span>
          </button>

          <button
            onClick={() => setSubTab('completed')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'completed'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Đã hoàn thành</span>
          </button>
        </div>
      </div>

      {/* 3. THANH TÌM KIẾM HOẠT ĐỘNG KHỚP HÌNH ẢNH */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm checklist hoặc công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-slate-200/90 focus:outline-hidden focus:border-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] bg-white transition-all"
          />
        </div>
        <button 
          title="Bộ lọc nâng cao"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* 4. MAIN INTERACTIVE ACCORDION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left main pane (Spans 8) - NHÓM CHECKLIST THEO TÁC VỤ */}
        <div className="lg:col-span-8 space-y-3.5">
          {subTab === 'process' ? (
            /* TREE PROCESS DISPLAY */
            filteredTreeProcesses.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-200/90 space-y-3">
                <Layers className="w-12 h-12 text-slate-350 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">Chưa có quy trình nào được đăng tải.</p>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setNewTreeTitle('');
                      setNewTreeRole('Tất cả');
                      setNewTreeDesc('');
                      setEditingTreeSteps([
                        {
                          id: `step-${Date.now()}`,
                          title: '',
                          tasksText: '',
                          subSteps: []
                        }
                      ]);
                      setIsAddingTreeProcess(true);
                    }}
                    className="text-[#C21A1A] font-extrabold text-xs hover:underline uppercase tracking-wide cursor-pointer"
                  >
                    Thêm quy trình mới
                  </button>
                )}
              </div>
            ) : (
              filteredTreeProcesses.map((proc) => {
                const isExpanded = expandedProcessIds.includes(proc.id);
                return (
                  <div key={proc.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Header of Process Card */}
                    <div 
                      onClick={() => toggleExpandProcess(proc.id)}
                      className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-red-50 text-[#C21A1A] border border-red-100 flex items-center justify-center shrink-0">
                          <Layers className="w-4.5 h-4.5" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight flex flex-wrap items-center gap-2">
                            <span>{proc.title}</span>
                              <select
                                value={proc.targetRole || 'Tất cả'}
                                onChange={(e) => {
                                  const updatedRole = e.target.value;
                                  const updatedProcs = treeProcesses.map(p => p.id === proc.id ? { ...p, targetRole: updatedRole } : p);
                                  setTreeProcesses(updatedProcs);
                                  localStorage.setItem('mrt_tree_processes_v1', JSON.stringify(updatedProcs));
                                  
                                  // Update Firebase
                                  const changedProc = updatedProcs.find(p => p.id === proc.id);
                                  if (changedProc) {
                                    dbSaveDoc('tree_processes', changedProc);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9.5px] font-extrabold px-2 py-0.5 rounded bg-red-100 text-[#C21A1A] uppercase focus:outline-[#C21A1A] cursor-pointer"
                              >
                                <option value="Tất cả">Tất cả</option>
                                <option value="Sales">Sales</option>
                                <option value="Kỹ thuật">Kỹ thuật</option>
                                <option value="Quản lý">Quản lý</option>
                              </select>
                          </h3>
                          {proc.description && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{proc.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingTreeProcess(proc);
                                setEditTreeTitle(proc.title);
                                setEditTreeRole(proc.targetRole);
                                setEditTreeDesc(proc.description || '');
                                
                                const mappedSteps = proc.steps.map(step => {
                                  const tasksText = step.tasks ? step.tasks.join('\n') : '';
                                  const subSteps = step.steps ? step.steps.map(sub => {
                                    const subTasksText = sub.tasks ? sub.tasks.join('\n') : '';
                                    return {
                                      id: sub.id,
                                      title: sub.title,
                                      tasksText: subTasksText
                                    };
                                  }) : [];
                                  
                                  return {
                                    id: step.id,
                                    title: step.title,
                                    tasksText,
                                    subSteps
                                  };
                                });
                                setEditTreeSteps(mappedSteps);
                              }}
                              type="button"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 transition-colors cursor-pointer"
                              title="Sửa quy trình này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTreeProcess(proc.id)}
                              type="button"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-[#C21A1A] transition-colors cursor-pointer"
                              title="Xóa quy trình này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => toggleExpandProcess(proc.id)}
                          type="button"
                          className="p-1.5 rounded-lg bg-white border border-slate-250 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Tree Steps Rendering inside container */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100 bg-white space-y-4">
                        {proc.steps.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center font-medium py-3">Quy trình này chưa được tạo danh sách các bước.</p>
                        ) : (
                          proc.steps.map((coreStep, stepIdx) => (
                            <div key={coreStep.id} className="pt-4 first:pt-0">
                              <div className="flex items-start gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-slate-150 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {stepIdx + 1}
                                </span>
                                <div className="flex-1 text-left min-w-0">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1">
                                    {coreStep.title}
                                  </h4>
                                  
                                  {/* Direct core step tasks */}
                                  {coreStep.tasks && coreStep.tasks.length > 0 && (
                                    <ul className="mt-2 pl-3 space-y-1.5">
                                      {coreStep.tasks.map((task, tIdx) => (
                                        <li key={tIdx} className="text-xs font-semibold text-slate-600 flex items-start gap-2.5 font-sans">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#C21A1A] shrink-0 mt-1.5" />
                                          <span className="leading-relaxed">{task}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  {/* core step's nested sub-steps */}
                                  {coreStep.steps && coreStep.steps.length > 0 && (
                                    <div className="mt-3.5 pl-4 border-l border-slate-200 space-y-4">
                                      {coreStep.steps.map((subStep, sIdx) => (
                                        <div key={subStep.id} className="space-y-1.5">
                                          <h5 className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-xs bg-blue-500 shrink-0" />
                                            <span>{subStep.title}</span>
                                          </h5>
                                          
                                          {subStep.tasks && subStep.tasks.length > 0 && (
                                            <ul className="mt-1.5 pl-2.5 space-y-1">
                                              {subStep.tasks.map((subTask, stIdx) => (
                                                <li key={stIdx} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5 font-sans">
                                                  <span className="text-slate-400 select-none">•</span>
                                                  <span className="leading-relaxed">{subTask}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* ORIGINAL DAILY CHECKLIST VIEW FOR TODAY AND COMPLETED TABS */
            filteredCategories.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Smile className="w-12 h-12 text-slate-350 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">Không tìm thấy checklist trùng khớp theo bộ lọc.</p>
                <button 
                  onClick={() => {
                    setSubTab('today');
                    setSearchTerm('');
                  }}
                  className="text-[#C21A1A] font-extrabold text-xs hover:underline uppercase tracking-wide cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                const ratio = cat.countTotal > 0 ? (cat.countDone / cat.countTotal) : 0;
                const isFinishedList = cat.countDone === cat.countTotal;

                return (
                  <div 
                    key={cat.id} 
                    className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs hover:shadow-xs ${
                      isExpanded ? 'border-slate-300 ring-2 ring-slate-100/35' : 'border-slate-200'
                    }`}
                  >
                    
                    {/* Category Card Header */}
                    <div 
                      onClick={() => toggleExpand(cat.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
                        {/* Left Specific Round Icon Container matching each workflow color */}
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${cat.meta.iconBg}`}>
                          {cat.id === 'opening' && <Calendar className="w-5 h-5 text-emerald-600" />}
                          {cat.id === 'sales' && <Coins className="w-5 h-5 text-blue-600" />}
                          {cat.id === 'cleaning' && <Wrench className="w-5 h-5 text-amber-600" />}
                          {cat.id === 'inventory' && <Warehouse className="w-5 h-5 text-purple-600" />}
                          {cat.id === 'closing' && <FileText className="w-5 h-5 text-[#C21A1A]" />}
                          {!['opening', 'sales', 'cleaning', 'inventory', 'closing'].includes(cat.id) && renderCategoryIcon(cat)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className={`font-black text-xs uppercase tracking-tight text-slate-850 flex items-center gap-1.5`}>
                            <span style={{ color: cat.meta.accentHex }}>{cat.meta.label}</span>
                            {isFinishedList && <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded-sm">Xong</span>}
                          </h3>
                          
                          {/* Dynamic Progress indicator with Horizontal Mini progress bar on collapsed/header state too */}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap sm:flex-nowrap">
                            <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${cat.meta.badgeBg}`}>
                              {cat.countDone}/{cat.countTotal} việc hoàn thành
                            </span>
                            
                            {onUpdateCategory ? (
                              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 shrink-0">
                                <span className="text-[9.5px] font-extrabold text-slate-500">Vai trò:</span>
                                <select
                                  value={cat.targetRole || 'Tất cả'}
                                  onChange={(e) => onUpdateCategory(cat.id, { targetRole: e.target.value })}
                                  className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-red-105 text-[#C21A1A] border border-red-150 focus:outline-[#C21A1A] cursor-pointer"
                                >
                                  <option value="Tất cả">Tất cả</option>
                                  <option value="Sales">Sales</option>
                                  <option value="Kỹ thuật">Kỹ thuật</option>
                                  <option value="Quản lý">Quản lý</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md shrink-0 bg-red-50 text-[#C21A1A] border border-red-100">
                                Vai trò: {cat.targetRole || 'Tất cả'}
                              </span>
                            )}
                            
                            {/* Sled-like minimalist bar slider inside headers as in screenshot design */}
                            <div className="w-24 sm:w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${cat.meta.barColor}`} 
                                style={{ width: `${ratio * 100}%` }}
                              />
                            </div>
                            <span className="text-[9.5px] font-mono font-black text-slate-400 shrink-0">
                              {Math.round(ratio * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && onUpdateCategory && (
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCategoryName(cat.title);
                              setEditCategoryRole(cat.targetRole || 'Tất cả');
                              setEditCategoryIcon(cat.icon || 'Layers');
                              setEditCategoryColor(cat.color || 'rose');
                            }}
                            type="button"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 transition-colors cursor-pointer"
                            title="Sửa nhóm quy trình này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && onDeleteCategory && (
                          <button
                            onClick={() => {
                              onDeleteCategory(cat.id);
                            }}
                            type="button"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-150 text-[#C21A1A] transition-colors cursor-pointer"
                            title="Xóa nhóm quy trình này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        {/* Expand/Collapse arrow */}
                        <button 
                          onClick={() => toggleExpand(cat.id)}
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-150 text-slate-400 hover:text-slate-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 cursor-pointer" /> : <ChevronDown className="w-4 h-4 cursor-pointer" />}
                        </button>
                      </div>
                    </div>

                    {/* Progressive indicator top bar for active Accordion */}
                    <div className="w-full bg-slate-100 h-[1.5px]">
                      <div 
                        className={`h-full transition-all duration-300 ${cat.meta.barColor}`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>

                    {/* Accordion Children details (Checklist items roster inside) */}
                    {isExpanded && (
                      <div className="bg-slate-50/50 p-1.5 divide-y divide-slate-150/60 border-t border-slate-100 text-left">
                        {cat.tasks.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-6 text-center font-semibold">Danh mục quy trình trống rỗng. Thêm đầu việc mới để khởi động.</p>
                        ) : (
                          cat.tasks.map((item) => {
                            const itemTime = item.timeSlot || '08:00';
                            return (
                              <div 
                                key={item.id} 
                                onClick={() => {
                                  // Open detailed modal on row click
                                  setActiveDetailItem(item);
                                }}
                                className="py-3 px-3.5 flex items-center justify-between gap-4 hover:bg-white cursor-pointer select-none transition-all rounded-lg text-left group"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                  {/* Left Checkbox icon: Round tick xanh lá or Empty circle - TIẾN ĐỘ & TRẠNG THÁI */}
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent detail modal on click
                                      onToggleItem(item.id);
                                    }}
                                    className="transition-transform group-hover:scale-110 duration-200 shrink-0 cursor-pointer p-1 -m-1"
                                  >
                                    {item.isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                                    )}
                                  </span>
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 text-left">
                                    <span className={`text-xs font-bold leading-relaxed truncate ${
                                      item.isCompleted 
                                        ? 'text-slate-400 line-through font-normal' 
                                        : 'text-slate-700'
                                    }`}>
                                      {item.title}
                                    </span>
                                  </div>
                                </div>

                                {/* Right indicators and metadata elements EXACTLY AS SHOWN IN SCREENSHOT */}
                                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                                  {/* Mock Hour Timing Badge */}
                                  <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                                    {itemTime}
                                  </span>

                                  {/* BẰNG CHỨNG & DUYỆT Icons */}
                                  <span className={`p-1 rounded border transition-all ${
                                    item.images && item.images.length > 0
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-600 font-bold'
                                      : 'bg-slate-50 border-slate-150 text-slate-400 hover:text-slate-650'
                                  }`} title="Đính kèm minh chứng hình ảnh">
                                    {item.images && item.images.length > 0 ? (
                                      <span className="text-[9px] font-mono font-bold flex items-center gap-0.5">
                                        <Image className="w-3 h-3 stroke-[2.5]" />
                                        {item.images.length}
                                      </span>
                                    ) : (
                                      <Image className="w-3.5 h-3.5 stroke-[2]" />
                                    )}
                                  </span>

                                  <span className="p-1 rounded bg-slate-50 border border-slate-150 text-slate-400 hover:text-slate-650" title="Quyền phân vai/Người phụ trách">
                                    <User className="w-3.5 h-3.5 stroke-[2]" />
                                  </span>

                                  {/* Chevron indicator or Edit/Delete buttons for Admin */}
                                  {isAdmin ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newTitle = prompt("Nhập tiêu đề công việc mới:", item.title);
                                          if (newTitle && newTitle.trim()) {
                                            const newTime = prompt("Nhập thời gian thực hiện (ví dụ: 08:30):", item.timeSlot || '08:00');
                                            if (newTime !== null && onUpdateItem) {
                                              onUpdateItem(item.id, { title: newTitle.trim(), timeSlot: newTime.trim() });
                                            }
                                          }
                                        }}
                                        type="button"
                                        className="p-1.5 rounded bg-slate-50 border border-slate-150 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 text-slate-400 shrink-0 transition-colors cursor-pointer"
                                        title="Sửa nhanh hàng đầu việc này"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      {onDeleteItem && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation(); // Avoid opening detail dialog
                                            onDeleteItem(item.id);
                                          }}
                                          type="button"
                                          className="p-1.5 rounded bg-slate-50 border border-slate-150 hover:bg-red-50 hover:text-[#C21A1A] hover:border-red-100 text-slate-400 shrink-0 transition-colors cursor-pointer"
                                          title="Xóa công việc này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Add entry quick launch component */}
                        {isAdmin && (
                          <div className="py-3 px-3.5 text-left">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategoryForNewItem(cat.id);
                                setIsAddingItem(true);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-[#C21A1A] hover:underline cursor-pointer"
                            >
                              <Plus className="w-4 h-4" /> 
                              <span>Thêm đầu việc mới vào nhóm này</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Right Help widget checklist panel (Spans 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Stats overview panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
            <h3 className="font-extrabold text-slate-800 font-display text-xs uppercase tracking-wider mb-4 pb-2 border-b border-slate-150 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#C21A1A]" />
              Tiêu chuẩn quy trình thiết kế
            </h3>

            <div className="space-y-3.5">
              <div className="p-3 bg-slate-50/70 border border-slate-155 rounded-xl text-left">
                <span className="text-[10px] font-extrabold text-[#C21A1A] uppercase tracking-wider block">Nguyên tắc thi hành</span>
                <p className="text-[11px] text-slate-600 mt-1 font-semibold leading-relaxed">
                  Nhóm các checklist theo chu trình thời gian rõ ràng để hạn chế tối đa sai lệch của nhân viên cửa hàng.
                </p>
              </div>

              <div className="p-3 bg-slate-50/70 border border-slate-155 rounded-xl text-left">
                <span className="text-[10px] font-extrabold text-[#107c41] uppercase tracking-wider block font-sans">Thời gian nghiêm ngặt</span>
                <p className="text-[11px] text-slate-600 mt-1 font-semibold leading-relaxed text-left">
                  Từng đầu việc nhỏ có gán khung giờ chốt nhằm giúp cho giám sát cửa hàng nắm bắt kịp thời và tối ưu vận hành.
                </p>
              </div>
            </div>
          </div>

          {/* Quick system instructions widget */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-[#C21A1A]">
              <Info className="w-4 h-4 shrink-0" />
              <h4 className="text-[10.5px] font-bold font-display uppercase tracking-wider text-slate-800">Ghi chú vận hành</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium text-left">
              Bắt buộc chụp hình bằng chứng cụ thể trước khi bấm duyệt hoành thành với các đầu mối công việc quan trọng liên quan đến két an toàn và quản lý dòng tiền mặt của showroom.
            </p>
          </div>
          
        </div>

      </div>

      {/* 5. FLOATING RED "+" BUTTON AT THE BOTTOM RIGHT CORNER (DIỀU HƯỚNG 1 TAY) */}
      {isAdmin && (
        <button 
          onClick={() => {
            setSelectedCategoryForNewItem(categories[0]?.id || 'opening');
            setIsAddingItem(true);
          }}
          className="fixed bottom-24 right-5 lg:bottom-12 lg:right-12 w-14 h-14 bg-[#C21A1A] hover:bg-red-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title="Thêm checklist mới nhanh (1 tay)"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>
      )}

      {/* MODAL WINDOW DIALOG: EDIT EXISTING CHECKLIST CATEGORY */}
      {editingCategory && (() => {
        const dynamicStyles = getCreationColorClasses(editCategoryColor);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-black text-slate-850 pb-3 border-b border-slate-100 mb-4 font-display flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#C21A1A]" />
                  Chỉnh sửa biểu mẫu quy trình
                </span>
                <button 
                  onClick={() => setEditingCategory(null)} 
                  type="button"
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </h3>
              
              <form onSubmit={handleSaveCategoryEdit} className="space-y-4">
                <div className={`${dynamicStyles.bg} p-4 rounded-xl border ${dynamicStyles.border} space-y-4`}>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tên nhóm quy trình</label>
                    <input
                      type="text"
                      required
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      placeholder="Ví dụ: Khách hàng & Giao máy chuyên nghiệp"
                      className={`w-full bg-white border border-slate-200 ${dynamicStyles.focusRing} focus:ring-1 px-3 py-2 rounded-lg text-xs font-semibold`}
                    />
                  </div>
                  
                  {/* Color selector */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Màu sắc chủ đạo (Chủ đề quy trình)
                    </label>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {COLOR_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditCategoryColor(opt.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${
                            editCategoryColor === opt.id ? 'border-slate-850 scale-110 shadow' : 'border-transparent hover:scale-105'
                          }`}
                          title={opt.name}
                        >
                          <span className={`w-5 h-5 rounded-full ${opt.bg}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon selector */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Biểu tượng đại diện quy trình
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1.5">
                      {ICON_OPTIONS.map(opt => {
                        const IconComp = opt.icon;
                        const isSelected = editCategoryIcon === opt.id;
                        const activeStyles = getIconSelectionActiveStyles(editCategoryColor);

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEditCategoryIcon(opt.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected 
                                ? `${activeStyles.bg} ${activeStyles.border} ${activeStyles.text} font-bold scale-105 shadow-2xs` 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <IconComp className="w-5 h-5 mb-1 shrink-0" />
                            <span className="text-[9px] truncate w-full">{opt.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Vai trò thực hiện (áp dụng cho cả quy trình)</label>
                    <select
                      value={editCategoryRole}
                      onChange={(e) => setEditCategoryRole(e.target.value)}
                      className={`w-full bg-white border border-slate-200 ${dynamicStyles.focusRing} focus:ring-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer`}
                    >
                      <option value="Tất cả">Tất cả (Mọi ca)</option>
                      <option value="Sales">Sales (Bán hàng)</option>
                      <option value="Kỹ thuật">Kỹ thuật</option>
                      <option value="Quản lý">Quản lý (Cửa hàng trưởng/Ca trưởng)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-[#C21A1A] hover:bg-red-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL WINDOW DIALOG: EDIT EXISTING TREE-STRUCTURED PROCESS */}
      {editingTreeProcess && (() => {
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-black text-slate-850 pb-3 border-b border-slate-100 mb-4 font-display flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#C21A1A]" />
                  Chỉnh sửa quy trình: {editingTreeProcess.title}
                </span>
                <button 
                  onClick={() => setEditingTreeProcess(null)} 
                  type="button"
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </h3>
              
              <form onSubmit={handleSaveTreeProcessEdit} className="space-y-4">
                {/* Process General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tên quy trình *</label>
                    <input
                      type="text"
                      required
                      value={editTreeTitle}
                      onChange={(e) => setEditTreeTitle(e.target.value)}
                      placeholder="Ví dụ: Quy trình bàn giao ca"
                      className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Vai trò thực hiện *</label>
                    <select
                      value={editTreeRole}
                      onChange={(e) => setEditTreeRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <option value="Tất cả">Tất cả</option>
                      <option value="Sales">Sales</option>
                      <option value="Kỹ thuật">Kỹ thuật</option>
                      <option value="Quản lý">Quản lý</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={editTreeDesc}
                    onChange={(e) => setEditTreeDesc(e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung quy trình..."
                    className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold"
                  />
                </div>

                {/* Steps Section */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider font-sans">Danh sách các bước của quy trình</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTreeSteps([
                          ...editTreeSteps,
                          {
                            id: `step-${Date.now()}-${Math.random()}`,
                            title: '',
                            tasksText: '',
                            subSteps: []
                          }
                        ]);
                      }}
                      className="text-xs text-[#C21A1A] hover:text-red-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm bước chính</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {editTreeSteps.map((step, idx) => (
                      <div key={step.id} className="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3 relative">
                        {editTreeSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditTreeSteps(editTreeSteps.filter(s => s.id !== step.id));
                            }}
                            className="absolute top-3 right-3 text-slate-400 hover:text-[#C21A1A] p-1 rounded hover:bg-slate-100 cursor-pointer"
                            title="Xóa bước chính này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="pr-8 text-left">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Bước {idx + 1}: Tên bước chính *</label>
                          <input
                            type="text"
                            required
                            value={step.title}
                            onChange={(e) => {
                              const updated = [...editTreeSteps];
                              updated[idx].title = e.target.value;
                              setEditTreeSteps(updated);
                            }}
                            placeholder="Ví dụ: Kiểm tra vệ sinh khu vực trưng bày"
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-1.5 rounded-lg text-xs font-semibold"
                          />
                        </div>

                        <div className="text-left">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Các việc cần làm trong bước chính (mỗi việc 1 dòng)</label>
                          <textarea
                            rows={2}
                            value={step.tasksText}
                            onChange={(e) => {
                              const updated = [...editTreeSteps];
                              updated[idx].tasksText = e.target.value;
                              setEditTreeSteps(updated);
                            }}
                            placeholder="Ví dụ:&#10;Lau chùi kệ tủ trưng bày&#10;Kiểm tra các mô hình máy mẫu"
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-1.5 rounded-lg text-xs font-semibold leading-relaxed"
                          />
                        </div>

                        {/* Substeps section */}
                        <div className="pl-4 border-l-2 border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Các bước nhỏ của Bước {idx + 1} ({step.subSteps.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editTreeSteps];
                                updated[idx].subSteps.push({
                                  id: `substep-${Date.now()}-${Math.random()}`,
                                  title: '',
                                  tasksText: ''
                                });
                                setEditTreeSteps(updated);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Thêm bước nhỏ</span>
                            </button>
                          </div>

                          {step.subSteps.map((sub, sIdx) => (
                            <div key={sub.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editTreeSteps];
                                  updated[idx].subSteps = updated[idx].subSteps.filter(ss => ss.id !== sub.id);
                                  setEditTreeSteps(updated);
                                }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 cursor-pointer"
                                title="Xóa bước nhỏ này"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <div className="pr-6 text-left">
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Bước {idx + 1}.{sIdx + 1}: Tên bước nhỏ *</label>
                                <input
                                  type="text"
                                  required
                                  value={sub.title}
                                  onChange={(e) => {
                                    const updated = [...editTreeSteps];
                                    updated[idx].subSteps[sIdx].title = e.target.value;
                                    setEditTreeSteps(updated);
                                  }}
                                  placeholder="Ví dụ: Vệ sinh máy POS"
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-2.5 py-1 rounded text-xs font-semibold"
                                />
                              </div>

                              <div className="text-left">
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Các việc trong bước nhỏ này (mỗi việc 1 dòng)</label>
                                <textarea
                                  rows={1.5}
                                  value={sub.tasksText}
                                  onChange={(e) => {
                                    const updated = [...editTreeSteps];
                                    updated[idx].subSteps[sIdx].tasksText = e.target.value;
                                    setEditTreeSteps(updated);
                                  }}
                                  placeholder="Ví dụ:&#10;Dùng khăn giấy lau màn hình&#10;Kiểm tra giấy in hóa đơn"
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-2.5 py-1 rounded text-xs font-semibold leading-normal"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTreeProcess(null)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-[#C21A1A] hover:bg-red-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Lưu thay đổi quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL WINDOW DIALOG: CREATE NEW CHECKLIST WORKFLOW */}
      {isAddingItem && (() => {
        const shouldForceNewCategory = categories.length === 0;
        const isCreatingNewGroup = createNewCategory || shouldForceNewCategory;

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-black text-slate-850 pb-3 border-b border-slate-100 mb-4 font-display flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#C21A1A]" />
                  Tự thiết kế Quy trình & Checklist
                </span>
                <button 
                  onClick={() => setIsAddingItem(false)} 
                  type="button"
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </h3>
              
              <form onSubmit={handleCreateItem} className="space-y-4">
                
                {/* 1. Category Setup */}
                {!shouldForceNewCategory && (
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-1">
                    <input
                      type="checkbox"
                      id="createNewCategoryCheckbox"
                      checked={createNewCategory}
                      onChange={(e) => setCreateNewCategory(e.target.checked)}
                      className="rounded text-[#C21A1A] focus:ring-[#C21A1A] w-4 h-4 accent-red-650 cursor-pointer"
                    />
                    <label htmlFor="createNewCategoryCheckbox" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                      Tạo nhóm quy trình mới (ví dụ: Chăm sóc khách hàng, Đào tạo sản phẩm...)
                    </label>
                  </div>
                )}

                {isCreatingNewGroup ? (
                  (() => {
                    const dynamicStyles = getCreationColorClasses(categoryColor);
                    return (
                      <div className={`${dynamicStyles.bg} p-4 rounded-xl border ${dynamicStyles.border} space-y-4 animate-in fade-in slide-in-from-top-1 duration-150`}>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tên nhóm quy trình mới</label>
                          <input
                            type="text"
                            required={isCreatingNewGroup}
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Ví dụ: Khách hàng & Giao máy chuyên nghiệp"
                            className={`w-full bg-white border border-slate-200 ${dynamicStyles.focusRing} focus:ring-1 px-3 py-2 rounded-lg text-xs font-semibold`}
                          />
                        </div>
                        
                        {/* 1. MÀU SẮC CHỦ ĐẠO (COLOR SELECTION) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Màu sắc chủ đạo (Chủ đề quy trình)
                          </label>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {COLOR_OPTIONS.map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCategoryColor(opt.id)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${
                                  categoryColor === opt.id ? 'border-slate-850 scale-110 shadow' : 'border-transparent hover:scale-105'
                                }`}
                                title={opt.name}
                              >
                                <span className={`w-5 h-5 rounded-full ${opt.bg}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. BIỂU TƯỢNG ĐẠI DIỆN (ICON SELECTION) */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Biểu tượng đại diện quy trình
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1.5">
                            {ICON_OPTIONS.map(opt => {
                              const IconComp = opt.icon;
                              const isSelected = categoryIcon === opt.id;
                              const activeStyles = getIconSelectionActiveStyles(categoryColor);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setCategoryIcon(opt.id)}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                    isSelected 
                                      ? `${activeStyles.bg} ${activeStyles.border} ${activeStyles.text} font-bold scale-105 shadow-2xs` 
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <IconComp className="w-5 h-5 mb-1 shrink-0" />
                                  <span className="text-[9px] truncate w-full">{opt.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Vai trò thực hiện (áp dụng cho cả quy trình)</label>
                          <select
                            value={categoryRole}
                            onChange={(e) => setCategoryRole(e.target.value)}
                            className={`w-full bg-white border border-slate-200 ${dynamicStyles.focusRing} focus:ring-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer`}
                          >
                            <option value="Tất cả">Tất cả (Mọi ca)</option>
                            <option value="Sales">Sales (Bán hàng)</option>
                            <option value="Kỹ thuật">Kỹ thuật</option>
                            <option value="Quản lý">Quản lý (Cửa hàng trưởng/Ca trưởng)</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Hệ thống sẽ đồng bộ và giao quy trình này cho đúng vai trò đã lựa chọn.</p>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">Chọn nhóm quy trình sẵn có</label>
                    <select 
                      value={selectedCategoryForNewItem}
                      onChange={(e) => setSelectedCategoryForNewItem(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.title} ({cat.targetRole || 'Tất cả'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Tasks List Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
                      Danh sách đầu việc cần làm ({tasksToCreate.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setTasksToCreate([...tasksToCreate, { title: '', timeSlot: '08:00' }])}
                      className="text-xs text-[#C21A1A] hover:text-red-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Thêm dòng việc</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1.5">
                    {tasksToCreate.map((task, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5 relative">
                        {tasksToCreate.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTasksToCreate(tasksToCreate.filter((_, i) => i !== idx))}
                            className="absolute top-2 w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-[#C21A1A] hover:border-red-100 border border-transparent transition-colors right-2 cursor-pointer"
                            title="Xóa việc này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Chi tiết công việc #{idx + 1}</label>
                          <textarea
                            required
                            rows={1}
                            value={task.title}
                            onChange={(e) => {
                               const copy = [...tasksToCreate];
                               copy[idx].title = e.target.value;
                               setTasksToCreate(copy);
                            }}
                            placeholder="Ví dụ: Đếm quỹ nghiệp vụ bàn giao lại cho nhân viên sau hoặc Vệ sinh sạch bàn trải nghiệm..."
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-2.5 py-1.5 rounded-lg text-xs font-semibold leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Giờ chốt hoàn thành</label>
                          <input
                            type="text"
                            required
                            value={task.timeSlot}
                            onChange={(e) => {
                              const copy = [...tasksToCreate];
                              copy[idx].timeSlot = e.target.value;
                              setTasksToCreate(copy);
                            }}
                            placeholder="Ví dụ: 08:30, 20:45..."
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Actions Row */}
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-[#C21A1A] hover:bg-red-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Xác nhận tạo việc
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL WINDOW DIALOG: CREATE NEW TREE PROCESS ("Theo quy trình") */}
      {isAddingTreeProcess && (() => {
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-black text-slate-850 pb-3 border-b border-slate-100 mb-4 font-display flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#C21A1A]" />
                  Thêm quy trình dạng cây mới
                </span>
                <button 
                  onClick={() => setIsAddingTreeProcess(false)} 
                  type="button"
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </h3>
              
              <form onSubmit={handleCreateTreeProcess} className="space-y-4">
                {/* Process General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tên quy trình *</label>
                    <input
                      type="text"
                      required
                      value={newTreeTitle}
                      onChange={(e) => setNewTreeTitle(e.target.value)}
                      placeholder="Ví dụ: Quy trình bàn giao ca"
                      className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Vai trò thực hiện *</label>
                    <select
                      value={newTreeRole}
                      onChange={(e) => setNewTreeRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <option value="Tất cả">Tất cả</option>
                      <option value="Sales">Sales</option>
                      <option value="Kỹ thuật">Kỹ thuật</option>
                      <option value="Quản lý">Quản lý</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    value={newTreeDesc}
                    onChange={(e) => setNewTreeDesc(e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung quy trình..."
                    className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold"
                  />
                </div>

                {/* Steps Section */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider font-sans">Danh sách các bước của quy trình</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTreeSteps([
                          ...editingTreeSteps,
                          {
                            id: `step-${Date.now()}-${Math.random()}`,
                            title: '',
                            tasksText: '',
                            subSteps: []
                          }
                        ]);
                      }}
                      className="text-xs text-[#C21A1A] hover:text-red-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm bước chính</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {editingTreeSteps.map((step, idx) => (
                      <div key={step.id} className="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3 relative">
                        {editingTreeSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTreeSteps(editingTreeSteps.filter(s => s.id !== step.id));
                            }}
                            className="absolute top-3 right-3 text-slate-400 hover:text-[#C21A1A] p-1 rounded hover:bg-slate-100 cursor-pointer"
                            title="Xóa bước chính này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="pr-8 text-left">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Bước {idx + 1}: Tên bước chính *</label>
                          <input
                            type="text"
                            required
                            value={step.title}
                            onChange={(e) => {
                              const updated = [...editingTreeSteps];
                              updated[idx].title = e.target.value;
                              setEditingTreeSteps(updated);
                            }}
                            placeholder="Ví dụ: Kiểm tra vệ sinh khu vực trưng bày"
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-1.5 rounded-lg text-xs font-semibold"
                          />
                        </div>

                        <div className="text-left">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Các việc cần làm trong bước chính (mỗi việc 1 dòng)</label>
                          <textarea
                            rows={2}
                            value={step.tasksText}
                            onChange={(e) => {
                              const updated = [...editingTreeSteps];
                              updated[idx].tasksText = e.target.value;
                              setEditingTreeSteps(updated);
                            }}
                            placeholder="Ví dụ:&#10;Lau chùi kệ tủ trưng bày&#10;Kiểm tra các mô hình máy mẫu"
                            className="w-full bg-white border border-slate-200 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] px-3 py-1.5 rounded-lg text-xs font-semibold leading-relaxed"
                          />
                        </div>

                        {/* Substeps section */}
                        <div className="pl-4 border-l-2 border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Các bước nhỏ của Bước {idx + 1} ({step.subSteps.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editingTreeSteps];
                                updated[idx].subSteps.push({
                                  id: `substep-${Date.now()}-${Math.random()}`,
                                  title: '',
                                  tasksText: ''
                                });
                                setEditingTreeSteps(updated);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Thêm bước nhỏ</span>
                            </button>
                          </div>

                          {step.subSteps.map((sub, sIdx) => (
                            <div key={sub.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTreeSteps];
                                  updated[idx].subSteps = updated[idx].subSteps.filter(ss => ss.id !== sub.id);
                                  setEditingTreeSteps(updated);
                                }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 cursor-pointer"
                                title="Xóa bước nhỏ này"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <div className="pr-6 text-left">
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Bước {idx + 1}.{sIdx + 1}: Tên bước nhỏ *</label>
                                <input
                                  type="text"
                                  required
                                  value={sub.title}
                                  onChange={(e) => {
                                    const updated = [...editingTreeSteps];
                                    updated[idx].subSteps[sIdx].title = e.target.value;
                                    setEditingTreeSteps(updated);
                                  }}
                                  placeholder="Ví dụ: Vệ sinh máy POS"
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-2.5 py-1 rounded text-xs font-semibold"
                                />
                              </div>

                              <div className="text-left">
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5">Các việc trong bước nhỏ này (mỗi việc 1 dòng)</label>
                                <textarea
                                  rows={1.5}
                                  value={sub.tasksText}
                                  onChange={(e) => {
                                    const updated = [...editingTreeSteps];
                                    updated[idx].subSteps[sIdx].tasksText = e.target.value;
                                    setEditingTreeSteps(updated);
                                  }}
                                  placeholder="Ví dụ:&#10;Dùng khăn giấy lau màn hình&#10;Kiểm tra giấy in hóa đơn"
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-2.5 py-1 rounded text-xs font-semibold leading-normal"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingTreeProcess(false)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-[#C21A1A] hover:bg-red-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Xác nhận tạo quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* DETAIL MODAL WITH EXPERT IMAGE UPLOAD / COMPLETED CHECK DETAILS */}
      {activeDetailItem && (() => {
        const currentItem = items.find(it => it.id === activeDetailItem.id);
        if (!currentItem) return null;

        const parentCategory = categories.find(c => c.id === currentItem.categoryId);
        const parentRole = parentCategory?.targetRole || 'Tất cả';
        
        const catMeta = CATEGORY_META[currentItem.categoryId] || {
          label: 'Chi tiết checklist',
          accentHex: '#C21A1A',
          badgeBg: 'bg-slate-100 text-slate-800'
        };

        const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          
          const file = files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            if (base64String && onUpdateItem) {
              const existingImages = currentItem.images || [];
              onUpdateItem(currentItem.id, {
                images: [...existingImages, base64String]
              });
            }
          };
          reader.readAsDataURL(file);
        };

        const handleRemovePhoto = (imgIdx: number) => {
          if (onUpdateItem) {
            const existingImages = currentItem.images || [];
            onUpdateItem(currentItem.id, {
              images: existingImages.filter((_, idx) => idx !== imgIdx)
            });
          }
        };

        const hasEditPrivilege = isAdmin || parentRole === 'Tất cả' || parentRole === currentUser?.role;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Colored Header Block matching Category Theme */}
              <div 
                className="p-5 text-white flex justify-between items-start"
                style={{ backgroundColor: catMeta.accentHex }}
              >
                <div className="flex-1 mr-4">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                    {catMeta.label}
                  </span>
                  {isAdmin && onUpdateItem ? (
                    <div className="mt-2">
                      <label className="block text-[9px] font-black text-white/70 uppercase tracking-widest mb-1 font-sans">Tên đầu việc (Quản lý sửa)</label>
                      <input
                        type="text"
                        value={currentItem.title}
                        onChange={(e) => onUpdateItem(currentItem.id, { title: e.target.value })}
                        className="w-full text-xs font-bold bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 border border-white/20 rounded px-2.5 py-1.5 focus:outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <h3 className="text-base font-black font-display tracking-tight mt-2 leading-tight">
                      {currentItem.title}
                    </h3>
                  )}
                </div>
                <button 
                  onClick={() => setActiveDetailItem(null)}
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-white cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider mb-1">
                      Vai trò của nhóm
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#C21A1A]" />
                      {parentRole}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider mb-1">
                      Giờ chốt hoàn thành
                    </span>
                    {isAdmin && onUpdateItem ? (
                      <input
                        type="text"
                        value={currentItem.timeSlot || '08:00'}
                        onChange={(e) => onUpdateItem(currentItem.id, { timeSlot: e.target.value })}
                        placeholder="Ví dụ: 08:00"
                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 w-full focus:outline-none"
                      />
                    ) : (
                      <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {currentItem.timeSlot || ITEM_TIMINGS[currentItem.id] || 'Chưa gán giờ'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status completion switch controls */}
                <div className="flex items-center justify-between p-4 bg-slate-50/70 border border-slate-150 rounded-xl">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">Trạng thái công việc</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      {currentItem.isCompleted 
                        ? `Đã hoàn thành bởi: ${currentItem.checkedBy || 'Nhân viên'}` 
                        : 'Vẫn chưa hoàn thành'}
                    </p>
                  </div>

                  {hasEditPrivilege ? (
                    <button
                      onClick={() => onToggleItem(currentItem.id)}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                        currentItem.isCompleted
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {currentItem.isCompleted ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-450 italic flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <Lock className="w-3.5 h-3.5" />
                      Yêu cầu vai trò {currentItem.targetRole}
                    </span>
                  )}
                </div>

                {/* IMAGES EVIDENCE SECTION */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#C21A1A]" />
                      Bằng chứng hình ảnh ({currentItem.images?.length || 0})
                    </h4>
                    
                    {hasEditPrivilege && (
                      <label className="text-xs font-black text-[#C21A1A] hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        Tải ảnh lên
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="camera"
                          onChange={handlePhotoUpload} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {currentItem.images && currentItem.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 py-1">
                      {currentItem.images.map((imgUrl, index) => (
                        <div 
                          key={index} 
                          className="relative aspect-video rounded-lg border border-slate-200 overflow-hidden group shadow-xs cursor-zoom-in"
                          onClick={() => setFullscreenImage(imgUrl)}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`evidence-${index}`} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {hasEditPrivilege && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid triggering lightbox
                                handleRemovePhoto(index);
                              }}
                              className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800 cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center">
                      <Image className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-[11px] text-slate-400 mt-2 font-medium">Chưa có ảnh bằng chứng đính kèm.</p>
                      {hasEditPrivilege && (
                        <p className="text-[9.5px] text-slate-400 mt-0.5">Vui lòng tải lên ảnh hiện trường bàn giao để hoàn thiện quy trình.</p>
                      )}
                    </div>
                  )}
                </div>

              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {isAdmin && onDeleteItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteItem(currentItem.id);
                      setActiveDetailItem(null);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-[#C21A1A] text-xs font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa đầu việc</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDetailItem(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* FULLSCREEN LIGHTBOX DIALOG */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-55 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 hover:scale-105 transition-all text-white p-2 rounded-full cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen lightbox preview" 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          />
        </div>
      )}

    </div>
  );
}
