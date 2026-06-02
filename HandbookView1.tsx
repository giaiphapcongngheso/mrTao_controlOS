import React, { useState } from 'react';
import { 
  Shield, 
  FileText, 
  Network, 
  Lock, 
  User, 
  Scale, 
  Settings, 
  GraduationCap, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  Bell, 
  Check, 
  ExternalLink,
  BookOpen,
  Info,
  Sparkles,
  HelpCircle,
  FileCheck,
  Edit3,
  Trash2,
  Plus,
  CheckCircle,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading,
  List,
  ListOrdered
} from 'lucide-react';
import { HANDBOOK_DOCS } from '../../data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dbFetchList, dbSaveDoc, dbDeleteDoc } from '../../firebase';

interface UICardMetadata {
  id: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  hasSeen?: boolean;
  isUpdated?: boolean;
  driveLink?: string;
  categoryKey: string;
}

interface HandbookViewProps {
  currentUser?: { username: string; role: string; fullName: string } | null;
}

export default function HandbookView({ currentUser }: HandbookViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'required' | 'updated'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Real documents list
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin privileges check
  const isAdmin = currentUser?.role === 'Quản lý' || currentUser?.role === 'CHU_CUA_HANG' || currentUser?.role === 'QUAN_LY' || currentUser?.username === 'admin' || currentUser?.username === 'manager';

  // Modal forms state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Văn hóa doanh nghiệp');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDriveLink, setFormDriveLink] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('Đọc chi tiết');
  const [formIsUpdated, setFormIsUpdated] = useState(false);

  // Rich text editor management refs
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // Sync state with content editable content
  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormContent(editorRef.current.innerHTML);
    }
  };

  // Sync editor HTML value once when modal is mounted / displayed
  React.useEffect(() => {
    if (isFormOpen) {
      if (!editorInitialized && editorRef.current) {
        editorRef.current.innerHTML = formContent;
        setEditorInitialized(true);
      }
    } else {
      setEditorInitialized(false);
    }
  }, [isFormOpen, editorInitialized]);

  // Image compressor & insertion
  const compressAndInsertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Limit max width to 800px to maintain performant Firestore & LocalStorage storage
        const MAX_WIDTH = 800;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress JPEG to 0.75 quality for super high resolution with tiny footprint
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          
          if (editorRef.current) {
            editorRef.current.focus();
            
            // Insert base64 image with proper premium design style
            document.execCommand(
              'insertHTML', 
              false, 
              `<img src="${compressedBase64}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh tài liệu" />`
            );
            handleEditorInput();
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      compressAndInsertImage(files[0]);
    }
  };

  // Local interaction states for marking documents read
  const [readDocs, setReadDocs] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('mrt_read_docs');
    return cached ? JSON.parse(cached) : { 'doc-5': true };
  });

  React.useEffect(() => {
    localStorage.setItem('mrt_read_docs', JSON.stringify(readDocs));
  }, [readDocs]);

  // Toast notifications for user actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleConfirmRead = (docId: string, title: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setReadDocs(prev => ({ ...prev, [docId]: true }));
    showToast(`Xác nhận đã đọc thành công: "${title}"`);
  };

  // Sync documents with database / local storage
  React.useEffect(() => {
    const loadHandbookDocs = async () => {
      try {
        const fbDocs = await dbFetchList<any>('handbook_docs');
        if (fbDocs && fbDocs.length > 0) {
          setDocuments(fbDocs);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to load from Firebase:", err);
      }

      // Fallback
      const cached = localStorage.getItem('mrt_handbook_docs_v1');
      if (cached) {
        try {
          setDocuments(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) {}
      }

      // Preseeded
      setDocuments(HANDBOOK_DOCS);
      setLoading(false);
      
      // Save static ones locally
      localStorage.setItem('mrt_handbook_docs_v1', JSON.stringify(HANDBOOK_DOCS));

      // Asynchronously seed to Firestore
      try {
        for (const staticDoc of HANDBOOK_DOCS) {
          await dbSaveDoc('handbook_docs', staticDoc);
        }
      } catch (err) {
        console.error("Async seeding to Firestore failed:", err);
      }
    };

    loadHandbookDocs();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormCategory('Văn hóa doanh nghiệp');
    setFormSummary('');
    setFormContent('');
    setFormDriveLink('');
    setFormBadgeText('Đọc chi tiết');
    setFormIsUpdated(false);
    setEditorInitialized(false); // Reset to allow fresh initialization in the editor
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDoc(doc);
    setFormTitle(doc.title || '');
    setFormCategory(doc.category || 'Văn hóa doanh nghiệp');
    setFormSummary(doc.summary || '');
    setFormContent(doc.content || '');
    setFormDriveLink(doc.driveLink || '');
    setFormBadgeText(doc.badgeText || doc.meta?.badgeText || 'Đọc chi tiết');
    setFormIsUpdated(doc.isUpdated || doc.meta?.isUpdated || false);
    setEditorInitialized(false); // Reset to allow fresh initialization in the editor
    setIsFormOpen(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Vui lòng nhập tên tài liệu!");
      return;
    }

    // Fallback directly to the editor's live inner HTML to bypass any potential state update latency
    const finalContent = editorRef.current ? editorRef.current.innerHTML : formContent;

    const docId = editingDoc ? editingDoc.id : `doc-custom-${Date.now()}`;
    const newDocItem = {
      id: docId,
      title: formTitle.trim(),
      category: formCategory,
      summary: formSummary.trim(),
      content: finalContent,
      driveLink: formDriveLink.trim(),
      badgeText: formBadgeText,
      isUpdated: formIsUpdated,
    };

    let updatedDocs = [];
    if (editingDoc) {
      updatedDocs = documents.map(d => d.id === docId ? newDocItem : d);
      showToast(`Đã chỉnh sửa tài liệu "${newDocItem.title}" thành công!`);
    } else {
      updatedDocs = [...documents, newDocItem];
      showToast(`Đã tải lên và thêm mới tài liệu "${newDocItem.title}"!`);
    }

    setDocuments(updatedDocs);
    localStorage.setItem('mrt_handbook_docs_v1', JSON.stringify(updatedDocs));
    setIsFormOpen(false);

    // Save synchronously or asynchronously to Firestore
    try {
      await dbSaveDoc('handbook_docs', newDocItem);
    } catch (err) {
      console.error("Failed to save to Firestore:", err);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa tài liệu: "${title}" không? Hành động này không thể hoàn tác!`);
    if (!confirmed) return;

    const updatedDocs = documents.filter(d => d.id !== docId);
    setDocuments(updatedDocs);
    localStorage.setItem('mrt_handbook_docs_v1', JSON.stringify(updatedDocs));
    
    if (activeDocId === docId) {
      setActiveDocId(null);
    }
    
    showToast(`Đã xóa tài liệu "${title}" khỏi hệ thống.`);

    try {
      await dbDeleteDoc('handbook_docs', docId);
    } catch (err) {
      console.error("Failed to delete from Firestore:", err);
    }
  };

  const getDynamicCategoryMeta = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('văn hóa') || catLower.includes('sứ mệnh')) {
      return {
        icon: Shield,
        iconBg: 'bg-rose-50 text-red-650 hover:bg-rose-100',
        iconColor: 'text-red-500',
        categoryKey: 'văn hóa'
      };
    }
    if (catLower.includes('nội quy') || catLower.includes('hành chính') || catLower.includes('hành chính')) {
      return {
        icon: FileText,
        iconBg: 'bg-orange-50 text-orange-650 hover:bg-orange-100',
        iconColor: 'text-orange-500',
        categoryKey: 'nội quy'
      };
    }
    if (catLower.includes('sơ đồ')) {
      return {
        icon: Network,
        iconBg: 'bg-emerald-50 text-emerald-650 hover:bg-emerald-100',
        iconColor: 'text-emerald-500',
        categoryKey: 'sơ đồ'
      };
    }
    if (catLower.includes('quyền') || catLower.includes('mật')) {
      return {
        icon: Lock,
        iconBg: 'bg-blue-50 text-blue-650 hover:bg-blue-100',
        iconColor: 'text-blue-500',
        categoryKey: 'phân quyền'
      };
    }
    if (catLower.includes('mô tả') || catLower.includes('công việc')) {
      return {
        icon: User,
        iconBg: 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100',
        iconColor: 'text-indigo-500',
        categoryKey: 'mô tả công việc'
      };
    }
    if (catLower.includes('quy chế')) {
      return {
        icon: Scale,
        iconBg: 'bg-pink-50 text-pink-650 hover:bg-pink-100',
        iconColor: 'text-pink-600',
        categoryKey: 'quy chế'
      };
    }
    if (catLower.includes('sop') || catLower.includes('quy trình')) {
      return {
        icon: Settings,
        iconBg: 'bg-sky-50 text-sky-650 hover:bg-sky-100',
        iconColor: 'text-sky-600',
        categoryKey: 'sop gốc'
      };
    }
    if (catLower.includes('đào tạo')) {
      return {
        icon: GraduationCap,
        iconBg: 'bg-amber-50 text-amber-650 hover:bg-amber-100',
        iconColor: 'text-amber-500',
        categoryKey: 'đào tạo'
      };
    }
    return {
      icon: FileText,
      iconBg: 'bg-slate-50 text-slate-650 hover:bg-slate-100',
      iconColor: 'text-slate-500',
      categoryKey: 'khác'
    };
  };

  // Pre-configured list elements matching the exact visual spec of the template image
  const cardMetadataMap: Record<string, UICardMetadata> = {
    'doc-1': {
      id: 'doc-1',
      iconBg: 'bg-rose-50 text-red-650 hover:bg-rose-100',
      iconColor: 'text-red-600',
      icon: Shield,
      badgeText: 'Bắt buộc đọc',
      categoryKey: 'văn hóa'
    },
    'doc-2': {
      id: 'doc-2',
      iconBg: 'bg-orange-50 text-orange-650 hover:bg-orange-100',
      iconColor: 'text-orange-500',
      icon: FileText,
      badgeText: 'Bắt buộc đọc',
      categoryKey: 'nội quy'
    },
    'doc-4': {
      id: 'doc-4',
      iconBg: 'bg-emerald-50 text-emerald-650 hover:bg-emerald-100',
      iconColor: 'text-emerald-500',
      icon: Network,
      badgeText: 'Xem tóm tắt',
      categoryKey: 'sơ đồ'
    },
    'doc-10': { 
      id: 'doc-10',
      iconBg: 'bg-blue-50 text-blue-650 hover:bg-blue-100',
      iconColor: 'text-blue-500',
      icon: Lock,
      badgeText: 'Xem tóm tắt',
      categoryKey: 'phân quyền'
    },
    'doc-5': {
      id: 'doc-5',
      iconBg: 'bg-indigo-50 text-indigo-650 hover:bg-indigo-100',
      iconColor: 'text-indigo-500',
      icon: User,
      badgeText: 'Xem tóm tắt',
      hasSeen: true,
      categoryKey: 'mô tả công việc'
    },
    'doc-3': {
      id: 'doc-3',
      iconBg: 'bg-pink-50 text-pink-650 hover:bg-pink-100',
      iconColor: 'text-pink-600',
      icon: Scale,
      isUpdated: true,
      badgeText: 'Xác nhận đã đọc',
      categoryKey: 'quy chế'
    },
    'doc-6': {
      id: 'doc-6',
      iconBg: 'bg-sky-50 text-sky-650 hover:bg-sky-100',
      iconColor: 'text-sky-600',
      icon: Settings,
      driveLink: 'https://drive.google.com/drive/folders/mrt_tech_training_fake',
      categoryKey: 'sop gốc'
    },
    'doc-8': {
      id: 'doc-8',
      iconBg: 'bg-amber-50 text-amber-650 hover:bg-amber-100',
      iconColor: 'text-amber-500',
      icon: GraduationCap,
      driveLink: 'https://drive.google.com/drive/folders/mrt_finance_forms_fake',
      categoryKey: 'đào tạo'
    }
  };

  // Prepare standard list incorporating items
  const processedDocs = documents.map(doc => {
    const metaFallback: any = cardMetadataMap[doc.id] || getDynamicCategoryMeta(doc.category || '');
    return {
      ...doc,
      driveLink: doc.driveLink || metaFallback.driveLink,
      meta: {
        ...metaFallback,
        badgeText: doc.badgeText || metaFallback.badgeText || 'Đọc chi tiết',
        driveLink: doc.driveLink || metaFallback.driveLink,
        isUpdated: doc.isUpdated !== undefined ? doc.isUpdated : !!metaFallback.isUpdated
      }
    };
  });

  // Filter handbook topics based on Search Term, Pills Selected Filter, and Category selection shorthand
  const filteredDocs = processedDocs.filter(doc => {
    // 1. Category check
    if (selectedCategory) {
      const docCat = doc.category.toLowerCase();
      const targetCat = selectedCategory.toLowerCase();
      // Match partials like "Văn hóa" -> "Văn hóa - Triết lý vận hành"
      if (!docCat.includes(targetCat) && !doc.title.toLowerCase().includes(targetCat)) {
        return false;
      }
    }

    // 2. Search term
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 3. Pills filter
    if (selectedFilter === 'required') {
      return doc.meta.badgeText === 'Bắt buộc đọc';
    }
    if (selectedFilter === 'updated') {
      return doc.meta.isUpdated;
    }

    return true;
  });

  const activeDoc = processedDocs.find(doc => doc.id === activeDocId);

  // Formatter for rendering doc markup
  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-black text-slate-800 mt-6 mb-3 font-display uppercase tracking-wider border-b border-slate-100 pb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-xs font-black text-[#C21A1A] mt-4 mb-2 uppercase tracking-wide">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={idx} className="flex gap-2 items-start pl-1 py-1">
            <span className="text-[#C21A1A] mt-1.5 select-none shrink-0 text-xs font-bold">▪</span>
            <span className="text-xs text-slate-700 font-medium leading-relaxed">{line.substring(2)}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }
      
      const matchLink = line.match(/\[(.*?)\]\((.*?)\)/);
      if (matchLink) {
        const textStr = matchLink[1];
        const urlStr = matchLink[2];
        return (
          <p key={idx} className="text-xs py-1.5">
            <a 
              href={urlStr} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-[#C21A1A] hover:underline font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{textStr}</span>
            </a>
          </p>
        );
      }

      return <p key={idx} className="text-xs text-slate-600 leading-relaxed py-1.5">{line}</p>;
    });
  };

  const isHtmlContent = (content: string) => {
    return /<[a-z][\s\S]*>/i.test(content || '');
  };

  const documentCategoriesList = [
    { name: 'Văn hóa', icon: Shield, bg: 'bg-[#C21A1A]/10 text-[#C21A1A]', key: 'văn hóa' },
    { name: 'Nội quy', icon: FileText, bg: 'bg-orange-500/10 text-orange-650', key: 'nội quy' },
    { name: 'Sơ đồ', icon: Network, bg: 'bg-emerald-500/10 text-emerald-650', key: 'sơ đồ' },
    { name: 'Phân quyền', icon: Lock, bg: 'bg-blue-500/10 text-blue-650', key: 'phân quyền' },
    { name: 'Mô tả công việc', icon: User, bg: 'bg-indigo-500/10 text-indigo-650', key: 'mô tả' },
    { name: 'Quy chế', icon: Scale, bg: 'bg-pink-500/10 text-pink-650', key: 'quy chế' },
    { name: 'SOP gốc', icon: Settings, bg: 'bg-sky-500/10 text-sky-650', key: 'sop gốc' },
    { name: 'Đào tạo', icon: GraduationCap, bg: 'bg-amber-500/10 text-amber-650', key: 'đào tạo' },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Dynamic Toast Notification popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-[11px] font-bold px-4 py-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </span>
          <span className="text-left font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Area adapted to responsive full web panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left font-sans select-none">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#C21A1A] shrink-0" />
            <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
              SỔ TAY ĐIỀU HÀNH &amp; HỆ THỐNG VẬN HÀNH
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-1.5">
            Tập trung toàn bộ chuẩn vận hành cốt lõi của MR.TÁO giúp bạn nhân bản, đào tạo và vận hành cửa hàng chuyên nghiệp.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          {isAdmin && (
            <button
              onClick={handleOpenCreateForm}
              className="px-3.5 py-2 bg-[#C21A1A] hover:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-white stroke-[3.5]" />
              <span>Thêm tài liệu mới</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Hệ thống tóm tắt tối ưu (SOP Lite)</span>
          </div>
        </div>
      </div>

      {/* Compact Top Category Filter - Premium Full-width Horizontal Scrollbar Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm text-left select-none">
        <h3 className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2.5 block">
          Danh mục phễu lọc tài liệu
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          <button
            onClick={() => {
              setSelectedCategory(null);
              showToast('Đang hiển thị tất cả tài liệu');
            }}
            className={`px-3.5 py-2 rounded-xl border text-[11px] font-black uppercase transition-all shrink-0 cursor-pointer ${
              !selectedCategory
                ? 'bg-[#C21A1A] border-[#C21A1A] text-white shadow-xs'
                : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100 hover:text-[#C21A1A]'
            }`}
          >
            <span>Tất cả danh mục</span>
          </button>
          
          {documentCategoriesList.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategory(null); // Deselect
                    showToast(`Bỏ lọc theo ${cat.name}`);
                  } else {
                    setSelectedCategory(cat.key);
                    showToast(`Đang hiển thị tài liệu thuộc nhóm ${cat.name}`);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-[11px] font-black uppercase transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#C21A1A] border-[#C21A1A] text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100 hover:text-[#C21A1A] hover:border-[#C21A1A]/40'
                }`}
              >
                <div className={`p-1 rounded-md shrink-0 ${isSelected ? 'bg-white/20 text-white' : cat.bg}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                </div>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area - Full-width for maximum visualization quality */}
      <div className="w-full space-y-6">
          
          {activeDocId === null ? (
            /* 2A. MASTER DOCUMENT DIRECTORY VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col gap-6 min-h-[500px]">
              
              {/* Filter controls & Search box header panel */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-slate-100 pb-6">
                
                {/* Search bar widget */}
                <div className="relative text-left flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5.5 h-5.5 text-slate-400 stroke-[2.5]" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh tài liệu, nội quy, quy định, SOP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-150 focus:bg-white focus:border-[#C21A1A] focus:outline-none pl-12 pr-10 py-3.5 rounded-2xl text-[13px] font-extrabold text-slate-800 shadow-sm placeholder-slate-400 transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black font-sans cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Pill filters slider block */}
                <div className="flex items-center gap-2.5 self-start xl:self-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-none select-none">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-4.5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider select-none transition-all cursor-pointer ${
                      selectedFilter === 'all'
                        ? 'bg-[#C21A1A] text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả tài liệu
                  </button>
                  <button
                    onClick={() => setSelectedFilter('required')}
                    className={`px-4.5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider select-none transition-all cursor-pointer ${
                      selectedFilter === 'required'
                        ? 'bg-[#C21A1A] text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    Bắt buộc đọc
                  </button>
                  <button
                    onClick={() => setSelectedFilter('updated')}
                    className={`px-4.5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider select-none transition-all cursor-pointer flex items-center gap-2 ${
                      selectedFilter === 'updated'
                        ? 'bg-[#C21A1A] text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${selectedFilter === 'updated' ? 'bg-white' : 'bg-[#1E40AF]'}`} />
                    Mới cập nhật
                  </button>
                </div>

              </div>

              {/* Status active category notification line */}
              {(selectedCategory || selectedFilter !== 'all' || searchTerm) && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-150 inline-flex text-xs font-bold text-slate-600 text-left">
                  <span>
                    Kết quả lọc: &nbsp;
                    {selectedCategory && <span className="bg-white border text-[#C21A1A] px-2 py-0.5 rounded mr-1.5 uppercase font-extrabold text-[10px]">Danh mục: {selectedCategory}</span>}
                    {selectedFilter !== 'all' && <span className="bg-white border text-[#1E40AF] px-2 py-0.5 rounded mr-1.5 uppercase font-extrabold text-[10px]">Bộ lọc: {selectedFilter === 'required' ? 'Bắt buộc đọc' : 'Mới cập nhật'}</span>}
                    {searchTerm && <span className="bg-white border text-emerald-600 px-2 py-0.5 rounded mr-1.5 font-mono">Từ khóa: "{searchTerm}"</span>}
                  </span>
                  
                  <button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedFilter('all');
                      setSearchTerm('');
                      showToast('Được đặt lại bộ lọc hiển thị tất cả');
                    }}
                    className="text-[#C21A1A] hover:underline cursor-pointer uppercase text-[10px] font-black ml-2"
                  >
                    Đặt lại tất cả
                  </button>
                </div>
              )}

              {/* Grid of SOP/Guidelines Sized up for exceptional readability */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-5">
                {filteredDocs.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 text-center flex flex-col items-center justify-center">
                    <BookOpen className="w-14 h-14 text-slate-200 mb-4" />
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">Không tìm thấy bất kỳ tài liệu nào phù hợp</h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm font-medium">Bạn có thể thay đổi từ khóa lọc hoặc nhấp vào "Đặt lại tất cả" bên trên để xem toàn bộ chuẩn SOP.</p>
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const IconComponent = doc.meta.icon;
                    const isDocRead = readDocs[doc.id] || false;

                    return (
                      <div 
                        key={doc.id}
                        onClick={() => {
                          setActiveDocId(doc.id);
                        }}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 flex flex-col justify-between hover:border-[#C21A1A] hover:shadow-md transition-all duration-200 cursor-pointer text-left relative group hover:-translate-y-0.5"
                      >
                        {/* Upper row */}
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            {/* Icon block badge layout */}
                            <div className="flex items-center gap-3 w-max">
                              <div className={`w-11 h-11 rounded-xl ${doc.meta.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                                <IconComponent className="w-5.5 h-5.5 stroke-[2.25]" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black tracking-wider text-[#C21A1A] bg-red-50/75 border border-red-100/50 px-2.5 py-1 rounded-lg uppercase leading-none">
                                  {doc.category}
                                </span>
                              </div>
                            </div>

                            {/* Actions or Chevron */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={(e) => handleOpenEditForm(doc, e)}
                                    type="button"
                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 transition-colors cursor-pointer"
                                    title="Chỉnh sửa tài liệu"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                                    type="button"
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 transition-colors cursor-pointer"
                                    title="Xóa tài liệu"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#C21A1A] group-hover:translate-x-1 transition-all shrink-0" />
                            </div>
                          </div>

                          {/* Central descriptions text */}
                          <div className="space-y-1.5">
                            <h3 className="font-black text-[#111827] text-sm sm:text-[15px] leading-snug tracking-tight group-hover:text-[#C21A1A] transition-colors text-left uppercase">
                              {doc.title}
                            </h3>
                            <p className="text-[12px] text-slate-500 font-medium leading-relaxed line-clamp-2 text-left">
                              {doc.summary}
                            </p>
                          </div>
                        </div>

                        {/* Lower statuses layout rows footer */}
                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                          
                          {/* Left dynamic markers indicators */}
                          <div className="flex items-center gap-1.5">
                            {isDocRead ? (
                              <span className="flex items-center gap-1 text-[#10B981] font-black uppercase tracking-wider text-[10px]">
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Đã đọc</span>
                              </span>
                            ) : doc.meta.isUpdated ? (
                              <span className="flex items-center gap-1 text-[#1E40AF] font-bold uppercase tracking-wider text-[9px] bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-lg select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]"></span>
                                <span>Mới cập nhật</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold text-[10px] select-none uppercase tracking-wider">Chưa đọc</span>
                            )}
                          </div>

                          {/* Right action control display elements */}
                          <div className="flex items-center">
                            {doc.meta.badgeText === 'Bắt buộc đọc' ? (
                              <span className="px-3 py-1 bg-rose-50 border border-rose-150 rounded-lg text-[#C21A1A] text-[10px] font-black tracking-tight flex items-center gap-1 whitespace-nowrap select-none">
                                <span className="text-red-600">🔖</span>
                                <span>Bắt buộc đọc</span>
                              </span>
                            ) : doc.meta.badgeText === 'Xác nhận đã đọc' && !isDocRead ? (
                              <button
                                onClick={(e) => handleConfirmRead(doc.id, doc.title, e)}
                                className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-black text-[10px] tracking-wider rounded-xl uppercase whitespace-nowrap cursor-pointer transition-all active:scale-95 shadow-xs"
                              >
                                Xác nhận đã đọc
                              </button>
                            ) : doc.meta.driveLink ? (
                              <span className="px-3 py-1 bg-[#F1F5F9] border border-slate-250 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-[10.5px] tracking-tight inline-flex items-center gap-1.5 whitespace-nowrap transition-colors">
                                Xem Drive gốc
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-bold text-[10px]">
                                {doc.meta.badgeText}
                              </span>
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* 2B. IMMERSIVE INLINE WEB DOCUMENT READING PANEL & SPLIT PANE */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-4 animate-in fade-in duration-205">
              
              {/* Back navigation & details summary menu card */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-left">
                
                <button
                  onClick={() => setActiveDocId(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 hover:border-slate-350 transition-all cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-650 stroke-[3]" />
                  <span>Quay lại Danh sách</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-slate-500 font-extrabold uppercase tracking-wide">
                    {activeDoc?.category}
                  </span>
                  {activeDoc && readDocs[activeDoc.id] && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-600 text-xs font-black uppercase">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Bạn đã đọc</span>
                    </span>
                  )}
                </div>

              </div>

              {/* Reader Grid pane split: Col-1: Reading sheet, Col-2: Meta specs & rules */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* 1. Large scrolling Document Sheet panel wrapper */}
                <div className="lg:col-span-9 bg-slate-50/40 rounded-2xl border border-slate-155 p-5 flex flex-col select-text leading-relaxed">
                  
                  {/* Brand tags header inside reading sheet */}
                  <div className="flex items-center gap-2 select-none text-[#C21A1A] font-bold mb-3">
                    <span className="h-2 w-2 rounded-full bg-[#C21A1A]" />
                    <span className="text-[10px] font-black font-mono tracking-widest uppercase">mr. táo SOP standard - standard operating procedure</span>
                  </div>

                  <h2 className="text-base font-black tracking-tight text-slate-900 uppercase border-b border-slate-150 pb-4 mb-4 leading-snug font-display select-text text-left">
                    {activeDoc?.title}
                  </h2>

                  {/* Scroll viewport */}
                  <ScrollArea className="h-[600px] pr-3 select-text text-left">
                    <div className="space-y-2 pb-12 font-sans font-medium text-slate-700 select-text">
                      {activeDoc ? (
                        isHtmlContent(activeDoc.content) ? (
                          <div 
                            className="rich-text-content space-y-3 select-text text-slate-700 text-xs leading-relaxed text-left
                              [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
                              [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-100 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
                              [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                              [&_p]:mb-2 [&_p]:leading-relaxed
                              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                              [&_li]:text-xs [&_li]:text-slate-700
                              [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150
                              [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-505 [&_blockquote]:my-3
                              [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
                            dangerouslySetInnerHTML={{ __html: activeDoc.content }}
                          />
                        ) : (
                          renderFormattedContent(activeDoc.content)
                        )
                      ) : null}
                    </div>
                  </ScrollArea>

                </div>

                {/* 2. Side Panel layout inside Reader: Summary metadata check card */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between text-left shrink-0">
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50/40 rounded-xl border border-red-100 flex items-center gap-2.5">
                      <div className="p-1 rounded-full bg-[#C21A1A] text-white">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Trách nghiệm tuân thủ</span>
                    </div>

                    {/* Metadata items list */}
                    <div className="space-y-3.5 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">CHỦ ĐỀ LỚN</span>
                        <span className="font-extrabold text-slate-800 text-[11px] mt-0.5 block">{activeDoc?.category}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">PHIÊN BẢN CÔNG BỐ</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">SOP-LITE-PRO-2026</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">PHÂN LOẠI QUY CHUẨN</span>
                        <span className="font-bold text-slate-800 text-[11px] mt-0.5 block">
                          {activeDoc?.meta.badgeText || 'Tài liệu hướng dẫn'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">CAM KẾT LƯU VẾT</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-medium">
                          Bằng việc nhấn hoàn tất đọc, bạn tự nguyện xác nhận hiểu rõ quy trình tóm tắt và thực hành đúng tiêu chuẩn tại cửa hàng.
                        </p>
                      </div>

                      {activeDoc?.meta.driveLink && (
                        <div className="pt-3 border-t">
                          <a 
                            href={activeDoc.meta.driveLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-extrabold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>Mở liên kết Drive Gốc</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete & signature workflow button section */}
                  <div className="pt-6 border-t mt-6 space-y-2 select-none">
                    {activeDoc && (
                      <button
                        onClick={() => {
                          setReadDocs(prev => ({ ...prev, [activeDoc.id]: true }));
                          showToast(`Xác nhận đã đọc thành công: "${activeDoc.title}"`);
                          setActiveDocId(null);
                        }}
                        className={`w-full py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                          readDocs[activeDoc.id]
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#C21A1A] hover:bg-[#A81515] text-white'
                        }`}
                      >
                        <FileCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {readDocs[activeDoc.id] ? 'Ký lại xác nhận đã đọc' : 'Ký xác nhận đã đọc'}
                        </span>
                      </button>
                    )}

                    <p className="text-[10px] text-center text-slate-400 font-medium">
                      Biên bản điện tử được ghi nhận lưu trữ tại ca trực của bạn.
                    </p>
                  </div>

                </div>

              </div>

              {/* Reader bottom footer compliance panel */}
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-400 select-none text-center sm:text-left">
                <span>MR.TÁO CONTROL SYSTEM • Hệ truyền đạt quy trình SOP Lite v1.1 • Độc quyền lưu hành nội bộ</span>
                <span className="font-mono text-[10px] text-slate-350">ID: {activeDoc?.id?.toUpperCase()}</span>
              </div>

            </div>
          )}

        </div>

      {/* 2C. WORD-LIKE TEXT EDITOR MODAL FOR CREATING AND EDITING HANDBOOK DOCUMENTS */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-205">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left font-sans">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-[#C21A1A]">
                  <BookOpen className="w-5 h-5 text-[#C21A1A]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                    {editingDoc ? 'Cập nhật tài liệu vận hành' : 'Thêm mới tài liệu sổ tay'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Soạn thảo tài liệu chuẩn SOP Lite với bộ công cụ Word</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveDocument} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tên tài liệu *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Quy định giờ giấc làm việc & trực nhật"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-750"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Danh mục tài liệu *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-3 py-2.5 rounded-xl text-xs font-bold text-slate-750 cursor-pointer"
                  >
                    <option value="Văn hóa doanh nghiệp">Văn hóa & Triết lý vận hành</option>
                    <option value="Nội quy cửa hàng">Nội quy cửa hàng</option>
                    <option value="Sơ đồ tổ chức">Sơ đồ tổ chức</option>
                    <option value="Phân quyền hệ thống">Phân quyền hệ thống</option>
                    <option value="Mô tả công việc">Mô tả công việc</option>
                    <option value="Quy chế">Quy chế thưởng phạt</option>
                    <option value="SOP gốc">SOP gốc (Quy trình chuẩn)</option>
                    <option value="Đào tạo">Đào tạo nhân sự</option>
                    <option value="Khác">Phần khác</option>
                  </select>
                </div>
              </div>

              {/* Summary / Mô tả ngắn */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tóm tắt ngắn (Hiển thị ngoài thẻ danh sách)</label>
                <textarea
                  placeholder="Mô tả ngắn gọn nội dung tài liệu để nhân sự nắm bắt nhanh..."
                  rows={2}
                  maxLength={250}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2 rounded-xl text-xs font-bold text-slate-750 resize-none"
                />
              </div>

              {/* Word-like Professional Rich Text Editor */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nội dung tài liệu chi tiết (Soạn thảo văn bản thoải mái)</label>
                
                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-[#C21A1A] focus-within:border-[#C21A1A]">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border-b border-slate-200 select-none">
                    
                    {/* Inline Text Styles */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => document.execCommand('bold', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="In đậm"
                      >
                        <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('italic', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="In nghiêng"
                      >
                        <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('underline', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-800 rounded transition-colors cursor-pointer"
                        title="Gạch dưới"
                      >
                        <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Block Formats: H3, H4, P */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => document.execCommand('formatBlock', false, '<h3>')}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                        title="Tiêu đề H3"
                      >
                        <Heading className="w-3 h-3 stroke-[2.5]" />
                        <span>H3</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('formatBlock', false, '<h4>')}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                        title="Tiêu đề H4"
                      >
                        <Heading className="w-3 h-3 stroke-[2.5]" />
                        <span>H4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('formatBlock', false, '<p>')}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded text-[10px] font-black transition-colors cursor-pointer"
                        title="Văn bản thường"
                      >
                        P
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => document.execCommand('insertUnorderedList', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded transition-colors cursor-pointer"
                        title="Danh sách dấu tròn (Bullet)"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('insertOrderedList', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded transition-colors cursor-pointer"
                        title="Danh sách số"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alignments */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyLeft', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded transition-colors cursor-pointer"
                        title="Căn lề trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyCenter', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded transition-colors cursor-pointer"
                        title="Căn lề giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('justifyRight', false)}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-850 rounded transition-colors cursor-pointer"
                        title="Căn lề phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Text Colors */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs h-[26px]">
                      <span className="text-[9px] text-slate-400 font-black uppercase select-none mr-0.5">Màu:</span>
                      <button
                        type="button"
                        onClick={() => document.execCommand('foreColor', false, '#C21A1A')}
                        className="w-3.5 h-3.5 rounded-full bg-[#C21A1A] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu đỏ thương hiệu"
                      />
                      <button
                        type="button"
                        onClick={() => document.execCommand('foreColor', false, '#1E40AF')}
                        className="w-3.5 h-3.5 rounded-full bg-[#1E40AF] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xanh lam"
                      />
                      <button
                        type="button"
                        onClick={() => document.execCommand('foreColor', false, '#10B981')}
                        className="w-3.5 h-3.5 rounded-full bg-[#10B981] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xanh lá"
                      />
                      <button
                        type="button"
                        onClick={() => document.execCommand('foreColor', false, '#F59E0B')}
                        className="w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu hổ phách"
                      />
                      <button
                        type="button"
                        onClick={() => document.execCommand('foreColor', false, '#1E293B')}
                        className="w-3.5 h-3.5 rounded-full bg-[#1E293B] border border-white hover:scale-120 active:scale-90 transition-all cursor-pointer shadow-xs"
                        title="Màu xám đen gốc"
                      />
                    </div>

                    {/* Media, Links & Utilities */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 px-2.5 bg-white border border-[#C21A1A]/30 text-[#C21A1A] hover:bg-rose-50 hover:border-[#C21A1A]/60 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                        title="Tải ảnh trực tiếp lên từ máy"
                      >
                        <ImageIcon className="w-3 h-3 text-[#C21A1A]" />
                        <span>Upload Ảnh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Nhập địa chỉ URL của ảnh:");
                          if (url) {
                            if (editorRef.current) {
                              editorRef.current.focus();
                            }
                            document.execCommand('insertHTML', false, `<img src="${url}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 border border-slate-200 shadow-md block mx-auto hover:scale-[1.02] transition-transform duration-200" alt="Hình ảnh liên kết" />`);
                            handleEditorInput();
                          }
                        }}
                        className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                        title="Chèn liên kết URL ảnh công khai"
                      >
                        🔗 Dán link ảnh
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Nhập đường dẫn liên kết URL:", "https://");
                          if (url) {
                            document.execCommand('createLink', false, url);
                          }
                        }}
                        className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-750 hover:border-purple-200 rounded-lg text-slate-700 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                        title="Thêm siêu liên kết vào chữ đang chọn"
                      >
                        <LinkIcon className="w-3 h-3 text-purple-600" />
                        <span>Thêm Link chữ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('insertHorizontalRule', false);
                        }}
                        className="p-1 px-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-[10px] font-black transition-all cursor-pointer"
                        title="Chèn đường kẻ ngang ngăn phân đoạn"
                      >
                        Kẻ ngang [––]
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('removeFormat', false);
                        }}
                        className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-705 hover:border-amber-300 rounded-lg text-slate-400 text-[10px] font-black transition-all cursor-pointer"
                        title="Xóa mọi định dạng của chữ đang bôi đen"
                      >
                        Xóa định dạng x
                      </button>
                    </div>

                  </div>

                  {/* HTML Content Editable Box which mirrors formContent without cursor jumping */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onBlur={handleEditorInput}
                    className="min-h-[280px] max-h-[420px] p-4 bg-white text-slate-750 text-xs font-semibold focus:outline-none overflow-y-auto leading-relaxed text-left select-text rounded-b-2xl
                              [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
                              [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-100 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
                              [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
                              [&_p]:mb-2 [&_p]:leading-relaxed
                              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                              [&_li]:text-xs [&_li]:text-slate-700
                              [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:shadow-md [&_img]:block [&_img]:mx-auto [&_img]:border [&_img]:border-slate-150
                              [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-506 [&_blockquote]:my-3
                              [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
                    placeholder="Nhập nội dung tài liệu chi tiết tại đây. Bạn có thể sử dụng các thanh công cụ để đổi màu, in đậm, chèn ảnh từ máy tính hoặc qua đường dẫn..."
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Bôi đen các từ ngữ bất kỳ để áp dụng nhanh định dạng Bold/Underline hoặc các nút màu trên thanh công cụ.</p>
              </div>

              {/* External source / Google Drive link */}
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Địa chỉ tài liệu gốc (Google Drive / OneDrive)</span>
                  <span className="text-[9px] lowercase font-bold text-[#C21A1A]">Liên kết xem thêm</span>
                </label>
                <input
                  type="url"
                  placeholder="Ví dụ: https://drive.google.com/open?id=..."
                  value={formDriveLink}
                  onChange={(e) => setFormDriveLink(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-750"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Kho tài liệu gốc chứa văn bản có mộc và biểu mẫu đầy đủ trên mây.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Badge classification */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Slogan / Nút hành động hiển thị</label>
                  <input
                    type="text"
                    placeholder="Mặc định: Đọc chi tiết, Bắt buộc đọc..."
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:outline-[#C21A1A] px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-750"
                  />
                </div>

                {/* Mark as updated */}
                <div className="flex items-center gap-2 mt-7">
                  <input
                    type="checkbox"
                    id="formIsUpdated"
                    checked={formIsUpdated}
                    onChange={(e) => setFormIsUpdated(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-[#C21A1A] focus:ring-[#C21A1A] cursor-pointer"
                  />
                  <label htmlFor="formIsUpdated" className="text-xs font-black text-slate-705 select-none cursor-pointer">Công bố trạng thái "Mới cập nhật"</label>
                </div>
              </div>

            </form>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-extrabold text-xs transition-colors cursor-pointer animate-none"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveDocument}
                className="px-5 py-2.5 bg-[#C21A1A] hover:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4 stroke-[3]" />
                <span>{editingDoc ? 'Lưu thay đổi' : 'Đăng tải tài liệu'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
