import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Edit2,
  ExternalLink,
  FileCheck,
  FileText,
  GraduationCap,
  ImageIcon,
  Info,
  Lock,
  Network,
  Plus,
  Scale,
  Settings,
  Shield,
  Trash2,
  User,
  HelpCircle,
  ShoppingCart,
  DollarSign,
  Wrench,
  SlidersHorizontal,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { MODULE_CODE } from '../../constants';
import { handbookService } from '../../services/handbook-service';
import { handbookCategoryService } from '../../services/handbook-category-service';
import { uploadHandbookImage } from '../../services/firebase-storage-service';
import { roleService } from '../../services/admin';
import { CustomMultiSelect, type MultiSelectOption } from '../../../share/components/custom/custom-multi-select';
import type { StaffRole } from '../../types/staff.types';
import { useModulePermissions, isOwnerUser, normalizeAccessCode } from '../../shared/hooks/use-module-permissions';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  Dialog,
  DialogContent,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  ScrollArea,
  SearchInput,
  Separator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@shared/ui';
import { useAppStore } from '../../stores/app-store';
import type { HandbookCategory, HandbookCategoryRequestType, HandbookDoc } from '../../types/handbook.types';
import HandbookEditorDialog from './components/handbook-editor-dialog';
import type { HandbookFormState, HandbookPermissions } from './handbook-view.types';
import { handbookFormSchema, type HandbookFormFieldErrors } from './handbook-form-schema';
import { DeleteConfirm } from '@shared/components/delete-confirm';
import {
  DEFAULT_HANDBOOK_CATEGORY_COLOR,
  DEFAULT_HANDBOOK_CATEGORY_ICON,
  getStoredCategoryIconConfig,
} from './handbook-category-meta';

interface UICardMetadata {
  id: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText: string;
  isUpdated: boolean;
  driveLink?: string;
  categoryKey: string;
}

interface HandbookDocWithMeta extends HandbookDoc {
  meta: UICardMetadata;
}

type HandbookFilter = 'all' | 'required' | 'updated' | 'role';

const DEFAULT_PERMISSIONS: HandbookPermissions = {
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
};

const EMPTY_FORM_STATE: HandbookFormState = {
  title: '',
  category: '',
  summary: '',
  content: '',
  imageUrls: [],
  roles: [],
  requiredRead: false,
  isUpdated: false,
  driveLink: '',
  categoryKey: '',
};

// normalizeAccessCode is imported from shared hooks


function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Chưa xác nhận';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa xác nhận';
  }

  return date.toLocaleString('vi-VN', {
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface IconConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  filterActiveClass?: string;
  filterIdleClass?: string;
}

const ICON_CONFIG_POOL: IconConfig[] = [
  { icon: Shield, iconBg: 'bg-rose-50 text-red-700 hover:bg-rose-100', iconColor: 'text-red-600' },
  { icon: FileText, iconBg: 'bg-orange-50 text-orange-700 hover:bg-orange-100', iconColor: 'text-orange-500' },
  { icon: Network, iconBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', iconColor: 'text-emerald-500' },
  { icon: Lock, iconBg: 'bg-blue-50 text-blue-700 hover:bg-blue-100', iconColor: 'text-blue-500' },
  { icon: User, iconBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', iconColor: 'text-indigo-500' },
  { icon: Scale, iconBg: 'bg-pink-50 text-pink-700 hover:bg-pink-100', iconColor: 'text-pink-600' },
  { icon: Settings, iconBg: 'bg-sky-50 text-sky-700 hover:bg-sky-100', iconColor: 'text-sky-600' },
  { icon: GraduationCap, iconBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100', iconColor: 'text-amber-500' },
  { icon: BookOpen, iconBg: 'bg-violet-50 text-violet-700 hover:bg-violet-100', iconColor: 'text-violet-600' },
];

function getDeterministicIconConfig(seed: string): IconConfig {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ICON_CONFIG_POOL.length;
  return ICON_CONFIG_POOL[index];
}

function getCategoryIconConfig(categoryName: string, category?: HandbookCategory | null): IconConfig {
  const storedConfig = getStoredCategoryIconConfig(category);
  if (storedConfig) {
    return storedConfig;
  }

  const normalized = normalizeText(categoryName);

  if (normalized.includes('văn hóa')) {
    return { icon: Shield, iconBg: 'bg-rose-50', iconColor: 'text-red-600' };
  }
  if (normalized.includes('nội quy') || normalized.includes('hành chính')) {
    return { icon: FileText, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' };
  }
  if (normalized.includes('sơ đồ')) {
    return { icon: Network, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' };
  }
  if (normalized.includes('phân quyền')) {
    return { icon: Lock, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' };
  }
  if (normalized.includes('mô tả')) {
    return { icon: User, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' };
  }
  if (normalized.includes('quy chế')) {
    return { icon: Scale, iconBg: 'bg-pink-50', iconColor: 'text-pink-600' };
  }
  if (normalized.includes('sop') || normalized.includes('quy trình')) {
    return { icon: Settings, iconBg: 'bg-sky-50', iconColor: 'text-sky-600' };
  }
  if (normalized.includes('đào tạo') || normalized.includes('hướng dẫn')) {
    return { icon: GraduationCap, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' };
  }

  return getDeterministicIconConfig(categoryName);
}

function resolveCardMetadata(doc: HandbookDoc, category?: HandbookCategory | null): UICardMetadata {
  const normalized = normalizeText(`${doc.category || ''} ${doc.title || ''} ${doc.categoryKey || ''}`);
  const base: UICardMetadata = {
    id: doc.id,
    iconBg: 'bg-slate-100 text-slate-700',
    iconColor: 'text-slate-500',
    icon: FileText,
    badgeText: doc.requiredRead ? 'Bắt buộc đọc' : doc.isUpdated ? 'Xác nhận đã đọc' : 'Xem tóm tắt',
    isUpdated: Boolean(doc.isUpdated),
    driveLink: doc.driveLink,
    categoryKey: doc.categoryKey || 'khác',
  };

  const storedConfig = getStoredCategoryIconConfig(category);
  if (storedConfig) {
    return {
      ...base,
      icon: storedConfig.icon,
      iconBg: storedConfig.iconBg,
      iconColor: storedConfig.iconColor,
      categoryKey: doc.categoryKey || category?.normalizedName || base.categoryKey,
    };
  }

  if (normalized.includes('văn hóa')) {
    return { ...base, iconBg: 'bg-rose-50 text-red-700 hover:bg-rose-100', iconColor: 'text-red-600', icon: Shield, categoryKey: 'văn hóa' };
  }
  if (normalized.includes('nội quy')) {
    return { ...base, iconBg: 'bg-orange-50 text-orange-700 hover:bg-orange-100', iconColor: 'text-orange-500', icon: FileText, categoryKey: 'nội quy' };
  }
  if (normalized.includes('sơ đồ')) {
    return { ...base, iconBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', iconColor: 'text-emerald-500', icon: Network, categoryKey: 'sơ đồ' };
  }
  if (normalized.includes('phân quyền')) {
    return { ...base, iconBg: 'bg-blue-50 text-blue-700 hover:bg-blue-100', iconColor: 'text-blue-500', icon: Lock, categoryKey: 'phân quyền' };
  }
  if (normalized.includes('mô tả công việc')) {
    return { ...base, iconBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', iconColor: 'text-indigo-500', icon: User, categoryKey: 'mô tả' };
  }
  if (normalized.includes('quy chế')) {
    return { ...base, iconBg: 'bg-pink-50 text-pink-700 hover:bg-pink-100', iconColor: 'text-pink-600', icon: Scale, categoryKey: 'quy chế' };
  }
  if (normalized.includes('sop')) {
    return { ...base, iconBg: 'bg-sky-50 text-sky-700 hover:bg-sky-100', iconColor: 'text-sky-600', icon: Settings, categoryKey: 'sop gốc' };
  }
  if (normalized.includes('đào tạo')) {
    return { ...base, iconBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100', iconColor: 'text-amber-500', icon: GraduationCap, categoryKey: 'đào tạo' };
  }

  const randomConfig = getDeterministicIconConfig(doc.id || doc.title || '');
  return {
    ...base,
    icon: randomConfig.icon,
    iconBg: randomConfig.iconBg,
    iconColor: randomConfig.iconColor,
  };
}

function renderFormattedContent(
  content: string,
  onImageClick?: (imageUrl: string) => void,
): React.ReactNode[] {
  return content.split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return (
        <h3 key={`h3-${index}`} className="mt-5 border-b border-slate-100 pb-1 text-sm font-black uppercase tracking-wide text-slate-800">
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.startsWith('#### ')) {
      return (
        <h4 key={`h4-${index}`} className="mt-3 text-xs font-black uppercase tracking-wide text-[#C21A1A]">
          {line.replace('#### ', '')}
        </h4>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={`li-${index}`} className="flex items-start gap-2 py-1 pl-1">
          <span className="mt-1.5 shrink-0 text-xs font-bold text-[#C21A1A]">▪</span>
          <span className="text-xs font-medium leading-relaxed text-slate-700">{line.slice(2)}</span>
        </div>
      );
    }
    if (!line.trim()) {
      return <div key={`empty-${index}`} className="h-2" />;
    }

    const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      return (
        <div key={`img-${index}`} className="my-3 flex justify-start">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || 'Embedded Image'}
            className="!h-auto !w-auto max-h-[320px] md:max-h-[420px] lg:!max-h-[55vh] !max-w-full cursor-zoom-in rounded-xl border border-slate-200 object-contain shadow-xs transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
            loading="lazy"
            onClick={() => onImageClick?.(imgMatch[2])}
          />
        </div>
      );
    }

    const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <p key={`link-${index}`} className="py-1.5 text-xs">
          <a href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#C21A1A] hover:underline">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{linkMatch[1]}</span>
          </a>
        </p>
      );
    }

    return (
      <p key={`p-${index}`} className="py-1.5 text-xs leading-relaxed text-slate-600">
        {line}
      </p>
    );
  });
}

function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content || '');
}

export default function HandbookView() {
  const currentUser = useAppStore((state) => state.currentUser);
  const activeContentRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<HandbookFilter>('role');
  const [subFilter, setSubFilter] = useState<'all' | 'required' | 'read' | 'updated'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [handbookDocs, setHandbookDocs] = useState<HandbookDoc[]>([]);
  const [handbookCategories, setHandbookCategories] = useState<HandbookCategory[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const hasInitializedRoleRef = useRef(false);

  useEffect(() => {
    if (currentUser?.roleCode && !hasInitializedRoleRef.current) {
      setSelectedRoles([currentUser.roleCode]);
      hasInitializedRoleRef.current = true;
    }
  }, [currentUser?.roleCode]);

  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formState, setFormState] = useState<HandbookFormState>(EMPTY_FORM_STATE);
  const [formErrors, setFormErrors] = useState<HandbookFormFieldErrors>({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<HandbookCategory | null>(null);
  const [isDeleteCategoryConfirmOpen, setIsDeleteCategoryConfirmOpen] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const isOwner = isOwnerUser(currentUser);

  const { permissions: rawPermissions } = useModulePermissions(MODULE_CODE.SO_TAY, currentUser, isOwner);
  const permissions: HandbookPermissions = {
    canCreate: rawPermissions.canCreate,
    canUpdate: rawPermissions.canUpdate,
    canDelete: rawPermissions.canDelete,
    canApprove: rawPermissions.canApprove,
  };

  // ─── Permissions loaded via useModulePermissions hook ──────────────────────


  useEffect(() => {
    let cancelled = false;

    const loadDocsAndCategories = async () => {
      setIsLoadingDocs(true);
      setLoadErrorMessage(null);

      try {
        const [docs, categories, allRoles] = await Promise.all([
          handbookService.getAll(),
          handbookCategoryService.getAll(),
          roleService.getAll().catch(() => [] as StaffRole[]),
        ]);

        if (cancelled) {
          return;
        }

        const sortedDocs = [...docs].sort((a, b) => {
          const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return (a.title || '').localeCompare(b.title || '', 'vi');
        });

        const sortedCategories = [...categories].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'vi'),
        );

        const activeRoles = (allRoles || []).filter((r) => r.status !== 'inactive');

        setHandbookDocs(sortedDocs);
        setHandbookCategories(sortedCategories);
        setRoles(activeRoles);
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải dữ liệu handbook:', error);
          setLoadErrorMessage('Không thể tải dữ liệu sổ tay. Vui lòng kiểm tra kết nối hoặc quyền truy cập.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocs(false);
        }
      }
    };

    void loadDocsAndCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryByNormalizedName = useMemo(() => {
    const map = new Map<string, HandbookCategory>();
    for (const category of handbookCategories) {
      const keys = [category.name, category.normalizedName].map((value) => normalizeText(value));
      for (const key of keys) {
        if (key) {
          map.set(key, category);
        }
      }
    }
    return map;
  }, [handbookCategories]);

  const processedDocs = useMemo<HandbookDocWithMeta[]>(
    () =>
      handbookDocs.map((doc) => {
        const categoryMeta = categoryByNormalizedName.get(normalizeText(doc.category));
        return { ...doc, meta: resolveCardMetadata(doc, categoryMeta) };
      }),
    [categoryByNormalizedName, handbookDocs],
  );

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();

    for (const category of handbookCategories) {
      if (category.name?.trim()) {
        unique.add(category.name.trim());
      }
    }

    for (const doc of handbookDocs) {
      if (doc.category?.trim()) {
        unique.add(doc.category.trim());
      }
    }

    return [...unique].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [handbookCategories, handbookDocs]);

  const rolesOptions = useMemo<MultiSelectOption[]>(
    () => roles.map((r) => ({ label: r.name, value: r.code })),
    [roles],
  );

  const roleUIMap = useMemo(() => {
    return roles.map((role) => {
      const codeNormalized = normalizeAccessCode(role.code);
      const nameNormalized = normalizeText(role.name);

      let icon = User;
      let iconBg = 'bg-purple-50 text-purple-600';
      let iconColor = 'text-purple-600';

      if (codeNormalized === 'CHU_CUA_HANG' || codeNormalized === 'OWNER' || nameNormalized.includes('chủ')) {
        icon = User;
        iconBg = 'bg-purple-100';
        iconColor = 'text-purple-600';
      } else if (codeNormalized === 'QUAN_LY' || codeNormalized === 'MANAGER' || nameNormalized.includes('quản lý')) {
        icon = User;
        iconBg = 'bg-rose-100';
        iconColor = 'text-rose-600';
      } else if (codeNormalized === 'KY_THUAT' || codeNormalized === 'TECHNICIAN' || nameNormalized.includes('kỹ thuật')) {
        icon = Wrench;
        iconBg = 'bg-blue-100';
        iconColor = 'text-blue-600';
      } else if (codeNormalized === 'BAN_HANG' || codeNormalized === 'SALES' || nameNormalized.includes('bán hàng')) {
        icon = ShoppingCart;
        iconBg = 'bg-emerald-100';
        iconColor = 'text-emerald-600';
      } else if (
        codeNormalized === 'THU_NGAN' ||
        codeNormalized === 'CASHIER' ||
        codeNormalized === 'KHO' ||
        nameNormalized.includes('thu ngân') ||
        nameNormalized.includes('kho')
      ) {
        icon = DollarSign;
        iconBg = 'bg-amber-100';
        iconColor = 'text-amber-600';
      }

      // Đếm số lượng tài liệu thuộc vai trò này
      const docCount = processedDocs.filter(
        (doc) => Array.isArray(doc.roles) && doc.roles.some((r) => normalizeAccessCode(r) === codeNormalized)
      ).length;

      return {
        ...role,
        icon,
        iconBg,
        iconColor,
        docCount,
      };
    });
  }, [roles, processedDocs]);

  const currentReadKey = currentUser?.id || currentUser?.username || '';
  const readDocs = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!currentReadKey) {
      return map;
    }

    for (const doc of processedDocs) {
      map[doc.id] = Boolean(doc.readAudits?.[currentReadKey]);
    }

    return map;
  }, [currentReadKey, processedDocs]);

  const canConfirmRead = permissions.canUpdate || permissions.canApprove;
  const canManageCategories = permissions.canCreate || permissions.canUpdate;

  const getCategoryIconComponent = useCallback((categoryName: string) => {
    const categoryMeta = categoryByNormalizedName.get(normalizeText(categoryName));
    const config = getCategoryIconConfig(categoryName, categoryMeta);
    return config?.icon || null;
  }, [categoryByNormalizedName]);

  const filteredDocs = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    const normalizedCategory = normalizeText(selectedCategory);

    return processedDocs.filter((doc) => {
      if (normalizedCategory) {
        const categoryTarget = normalizeText(`${doc.category} ${doc.categoryKey} ${doc.meta.categoryKey} ${doc.title}`);
        if (!categoryTarget.includes(normalizedCategory)) {
          return false;
        }
      }

      if (normalizedSearch) {
        const target = normalizeText(`${doc.title} ${doc.summary} ${doc.category}`);
        if (!target.includes(normalizedSearch)) {
          return false;
        }
      }

      if (selectedFilter === 'required') {
        return Boolean(doc.requiredRead);
      }
      if (selectedFilter === 'updated') {
        return Boolean(doc.isUpdated);
      }
      if (selectedFilter === 'role') {
        if (selectedRoles.length > 0) {
          return Array.isArray(doc.roles) && doc.roles.some((r) => selectedRoles.includes(r));
        }
        return true;
      }

      if (selectedFilter === 'all') {
        if (subFilter === 'required') {
          return Boolean(doc.requiredRead);
        }
        if (subFilter === 'read') {
          return Boolean(readDocs[doc.id]);
        }
        if (subFilter === 'updated') {
          return Boolean(doc.isUpdated);
        }
      }

      return true;
    });
  }, [processedDocs, searchTerm, selectedCategory, selectedFilter, selectedRoles, subFilter, readDocs]);

  const activeDoc = useMemo(
    () => processedDocs.find((doc) => doc.id === activeDocId) || null,
    [activeDocId, processedDocs],
  );
  const activeReadAudit = useMemo(
    () => (activeDoc && currentReadKey ? activeDoc.readAudits?.[currentReadKey] : undefined),
    [activeDoc, currentReadKey],
  );
  useEffect(() => {
    const container = activeContentRef.current;
    if (!container) {
      return;
    }

    const handleImageClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) {
        return;
      }

      const imageUrl = target.currentSrc || target.src;
      if (imageUrl) {
        setPreviewImageUrl(imageUrl);
      }
    };

    container.addEventListener('click', handleImageClick);
    return () => {
      container.removeEventListener('click', handleImageClick);
    };
  }, [activeDoc?.content]);

  const renderedActiveContent = useMemo(() => {
    if (!activeDoc) return null;
    const content = activeDoc.content || '';
    if (isHtmlContent(content)) {
      return (
        <div
          ref={activeContentRef}
          className="rich-text-content space-y-3 select-text text-slate-700 text-xs leading-relaxed text-left
            [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:uppercase [&_h2]:tracking-wider
            [&_h3]:text-[13px] [&_h3]:font-extrabold [&_h3]:text-slate-800 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-slate-100 [&_h3]:pb-1 [&_h3]:uppercase [&_h3]:tracking-wide
            [&_h4]:text-xs [&_h4]:font-black [&_h4]:text-[#C21A1A] [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:uppercase
            [&_p]:mb-2 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
            [&_li]:text-xs [&_li]:text-slate-700
            [&_img]:!block [&_img]:!mx-auto [&_img]:!my-3 [&_img]:!h-auto [&_img]:!w-auto [&_img]:max-h-[320px] md:[&_img]:max-h-[420px] lg:[&_img]:!max-h-[55vh] [&_img]:!max-w-full [&_img]:cursor-zoom-in [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-150 [&_img]:object-contain [&_img]:shadow-md [&_img]:transition-all [&_img]:duration-300 [&_img:hover]:scale-[1.01] [&_img:hover]:shadow-lg
            [&_blockquote]:border-l-4 [&_blockquote]:border-[#C21A1A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 [&_blockquote]:my-3
            [&_a]:text-[#C21A1A] [&_a]:underline [&_a]:font-bold [&_a:hover]:text-red-800"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    return renderFormattedContent(content, setPreviewImageUrl);
  }, [activeDoc]);
  const openCreateEditor = useCallback(() => {
    setEditingDocId(null);
    setFormState({ ...EMPTY_FORM_STATE });
    setFormErrors({});
    setIsEditorOpen(true);
  }, []);

  const openEditEditor = useCallback((doc: HandbookDocWithMeta, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingDocId(doc.id);
    setFormState({
      title: doc.title || '',
      category: doc.category || '',
      summary: doc.summary || '',
      content: doc.content || '',
      imageUrls: Array.isArray(doc.imageUrls)
        ? Array.from(new Set(doc.imageUrls.filter(Boolean)))
        : [],
      roles: Array.isArray(doc.roles) ? doc.roles : [],
      requiredRead: Boolean(doc.requiredRead),
      isUpdated: Boolean(doc.isUpdated),
      driveLink: doc.driveLink || '',
      categoryKey: doc.categoryKey || doc.meta.categoryKey || '',
    });
    setFormErrors({});
    setIsEditorOpen(true);
  }, []);

  const handleDeleteDoc = useCallback(
    async (doc: HandbookDocWithMeta, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (!permissions.canDelete) {
        showToast('Bạn không có quyền xóa tài liệu.');
        return;
      }

      const isConfirmed = window.confirm(`Bạn có chắc muốn xóa tài liệu "${doc.title}"?`);
      if (!isConfirmed) {
        return;
      }

      try {
        await handbookService.delete(doc.id);
        setHandbookDocs((prev) => prev.filter((item) => item.id !== doc.id));
        setActiveDocId((prev) => (prev === doc.id ? null : prev));
        showToast(`Đã xóa tài liệu: "${doc.title}"`);
      } catch (error) {
        console.error('Không thể xóa tài liệu:', error);
        showToast('Xóa tài liệu thất bại. Vui lòng thử lại.');
      }
    },
    [permissions.canDelete, showToast],
  );

  const handleCreateCategory = useCallback(
    async (input: string | HandbookCategoryRequestType, options?: { silentSuccessToast?: boolean }) => {
      const categoryPayload = typeof input === 'string' ? { name: input } : input;
      const trimmedName = categoryPayload.name?.trim() || '';
      if (!trimmedName) {
        return;
      }
      if (!canManageCategories) {
        showToast('Bạn không có quyền thêm danh mục.');
        throw new Error('PERMISSION_DENIED');
      }

      const normalizedName = normalizeText(trimmedName);
      const existed = handbookCategories.find(
        (item) => normalizeText(item.name) === normalizedName,
      );
      if (existed) {
        return;
      }

      try {
        const nowIso = new Date().toISOString();
        const created = await handbookCategoryService.create({
          name: trimmedName,
          normalizedName: categoryPayload.normalizedName || normalizedName,
          iconName: categoryPayload.iconName || DEFAULT_HANDBOOK_CATEGORY_ICON,
          colorKey: categoryPayload.colorKey || DEFAULT_HANDBOOK_CATEGORY_COLOR,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        setHandbookCategories((prev) =>
          [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')),
        );
        if (!options?.silentSuccessToast) {
          showToast(`Đã thêm danh mục mới: "${trimmedName}"`);
        }
      } catch (error) {
        console.error('Không thể thêm danh mục handbook:', error);
        showToast('Thêm danh mục thất bại. Vui lòng thử lại.');
        throw error;
      }
    },
    [canManageCategories, handbookCategories, showToast],
  );

  const handleDeleteCategory = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      if (!canManageCategories) {
        showToast('Bạn không có quyền xóa danh mục.');
        return;
      }

      const normalizedName = normalizeText(trimmedName);
      const targetCategory = handbookCategories.find(
        (item) => normalizeText(item.name || '') === normalizedName,
      );
      if (!targetCategory) {
        showToast('Không tìm thấy danh mục để xóa.');
        return;
      }

      setDeletingCategory(targetCategory);
      setIsDeleteCategoryConfirmOpen(true);
    },
    [canManageCategories, handbookCategories, showToast],
  );

  const handleConfirmDeleteCategory = useCallback(async () => {
    if (!deletingCategory) return;
    setIsDeletingCategory(true);
    try {
      await handbookCategoryService.delete(deletingCategory.id);
      setHandbookCategories((prev) => prev.filter((item) => item.id !== deletingCategory.id));
      showToast(`Đã xóa danh mục: "${deletingCategory.name}"`);
      setIsDeleteCategoryConfirmOpen(false);
    } catch (error) {
      console.error('Không thể xóa danh mục handbook:', error);
      showToast('Xóa danh mục thất bại. Vui lòng thử lại.');
    } finally {
      setIsDeletingCategory(false);
      setDeletingCategory(null);
    }
  }, [deletingCategory, showToast]);

  const handleSaveDoc = useCallback(async () => {
    const validated = handbookFormSchema.safeParse(formState);
    if (!validated.success) {
      const nextErrors: HandbookFormFieldErrors = {};
      for (const issue of validated.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !nextErrors[key as keyof HandbookFormFieldErrors]) {
          nextErrors[key as keyof HandbookFormFieldErrors] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      showToast('Vui lòng kiểm tra lại thông tin form.');
      return;
    }

    setFormErrors({});

    const title = validated.data.title.trim();
    const category = validated.data.category.trim();
    const summary = validated.data.summary.trim();
    const content = validated.data.content.trim();

    const normalizedCategory = normalizeText(category);
    const hasCategory = handbookCategories.some(
      (item) => normalizeText(item.name) === normalizedCategory,
    );
    if (!hasCategory) {
      await handleCreateCategory(
        {
          name: category,
          iconName: DEFAULT_HANDBOOK_CATEGORY_ICON,
          colorKey: DEFAULT_HANDBOOK_CATEGORY_COLOR,
        },
        { silentSuccessToast: true },
      );
    }

    const nowIso = new Date().toISOString();
    const driveLink = validated.data.driveLink.trim();
    const categoryKey = validated.data.categoryKey.trim();
    const imageUrls = Array.from(new Set(validated.data.imageUrls.filter(Boolean)));
    const payload: Partial<HandbookDoc> = {
      title,
      category,
      summary,
      content,
      imageUrls,
      roles: validated.data.roles || [],
      requiredRead: validated.data.requiredRead,
      isUpdated: validated.data.isUpdated,
      updatedAt: nowIso,
      driveLink: driveLink || '',
      categoryKey: categoryKey || '',
    };

    setIsSavingDoc(true);
    try {
      if (editingDocId) {
        if (!permissions.canUpdate) {
          showToast('Bạn không có quyền cập nhật tài liệu.');
          return;
        }

        const updatedDoc = await handbookService.update(editingDocId, payload);
        setHandbookDocs((prev) => prev.map((doc) => (doc.id === editingDocId ? { ...doc, ...updatedDoc } : doc)));
        showToast('Cập nhật tài liệu thành công.');
      } else {
        if (!permissions.canCreate) {
          showToast('Bạn không có quyền thêm tài liệu.');
          return;
        }

        const createdDoc = await handbookService.create({
          ...payload,
          createdAt: nowIso,
          sortOrder: handbookDocs.length + 1,
          readAudits: {},
        });
        setHandbookDocs((prev) => [...prev, createdDoc]);
        showToast('Thêm tài liệu thành công.');
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error('Không thể lưu tài liệu sổ tay:', error);
      showToast('Lưu tài liệu thất bại. Vui lòng thử lại.');
    } finally {
      setIsSavingDoc(false);
    }
  }, [
    editingDocId,
    formState,
    handbookCategories,
    handbookDocs.length,
    handleCreateCategory,
    permissions.canCreate,
    permissions.canUpdate,
    showToast,
  ]);

  const handleConfirmRead = useCallback(
    async (doc: HandbookDocWithMeta, event?: React.MouseEvent): Promise<boolean> => {
      event?.stopPropagation();

      if (!canConfirmRead) {
        showToast('Bạn không có quyền xác nhận đã đọc.');
        return false;
      }
      if (!currentReadKey || !currentUser) {
        showToast('Không xác định được người dùng hiện tại.');
        return false;
      }

      const nowIso = new Date().toISOString();
      const nextReadAudits = {
        ...(doc.readAudits || {}),
        [currentReadKey]: {
          username: currentUser.username,
          fullName: currentUser.fullName,
          readAt: nowIso,
        },
      };

      try {
        const updatedDoc = await handbookService.update(doc.id, {
          readAudits: nextReadAudits,
          updatedAt: nowIso,
        });
        setHandbookDocs((prev) =>
          prev.map((item) => (item.id === doc.id ? { ...item, ...updatedDoc, readAudits: nextReadAudits } : item)),
        );
        showToast(`Xác nhận đã đọc thành công: "${doc.title}"`);
        return true;
      } catch (error) {
        console.error('Không thể xác nhận đã đọc:', error);
        showToast('Xác nhận đã đọc thất bại. Vui lòng thử lại.');
        return false;
      }
    },
    [canConfirmRead, currentReadKey, currentUser, showToast],
  );

  const handleConfirmReadAndBack = useCallback(async () => {
    if (!activeDoc) {
      return;
    }
    const ok = await handleConfirmRead(activeDoc);
    if (ok) {
      setActiveDocId(null);
    }
  }, [activeDoc, handleConfirmRead]);

  const handleOpenDoc = useCallback(
    (doc: HandbookDocWithMeta) => {
      setActiveDocId(doc.id);
    },
    [],
  );

  const handleSetFilter = useCallback((nextFilter: HandbookFilter) => {
    setSelectedFilter(nextFilter);
    setSubFilter('all');
  }, []);
  const handleToggleCategory = useCallback((categoryName: string | null) => {
    setSelectedCategory((prev) => (prev === categoryName ? null : categoryName));
  }, []);
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory(null);
    if (selectedFilter !== 'role') {
      setSelectedFilter('all');
    }
    setSelectedRoles([]);
    setSubFilter('all');
  }, [selectedFilter]);
  const handleBackToList = useCallback(() => setActiveDocId(null), []);
  const handleFormPatch = useCallback((patch: Partial<HandbookFormState>) => {
    const patchKeys = Object.keys(patch) as Array<keyof HandbookFormState>;
    if (patchKeys.length > 0) {
      setFormErrors((prev) => {
        const next = { ...prev };
        for (const key of patchKeys) {
          if (next[key]) {
            delete next[key];
          }
        }
        return next;
      });
    }
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);
  const handleDialogClose = useCallback(() => {
    setFormErrors({});
    setIsEditorOpen(false);
  }, []);
  const handleUploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (!files.length) {
      return [];
    }

    setIsUploadingImages(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadHandbookImage(file, editingDocId)),
      );
      showToast(`Đã tải lên ${uploadedUrls.length} hình ảnh.`);
      return uploadedUrls;
    } catch (error) {
      console.error('Không thể tải ảnh handbook:', error);
      const maybeCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      const maybeMessage = error instanceof Error ? error.message : '';
      const maybeStatus =
        typeof error === 'object' && error && 'status' in error && typeof error.status === 'number'
          ? error.status
          : NaN;
      const hasNotFoundMessage = /(404\s*not\s*found|status\s*code\s*404|response\s*status:?\s*404)/i.test(
        maybeMessage,
      );
      const isNotFoundError =
        maybeStatus === 404 || maybeCode === 'storage/object-not-found' || hasNotFoundMessage;
      if (maybeMessage === 'INVALID_IMAGE_TYPE') {
        showToast('Chỉ cho phép tải lên file ảnh.');
      } else if (isNotFoundError) {
        showToast('Đường dẫn upload ảnh không tồn tại (404). Đã dừng thao tác upload.');
      } else if (maybeCode === 'storage/unauthorized') {
        showToast('Không có quyền upload ảnh lên Firebase Storage.');
      } else if (maybeCode === 'storage/canceled') {
        showToast('Đã hủy thao tác upload ảnh.');
      } else {
        showToast('Tải ảnh thất bại. Vui lòng kiểm tra cấu hình Firebase và kết nối mạng.');
      }
      return [];
    } finally {
      setIsUploadingImages(false);
    }
  }, [editingDocId, showToast]);
  const activeDocImageUrls = useMemo(
    () => (activeDoc && Array.isArray(activeDoc.imageUrls) ? Array.from(new Set(activeDoc.imageUrls.filter(Boolean))) : []),
    [activeDoc],
  );

  const isFilterActive = (selectedFilter !== 'all' && selectedFilter !== 'role') || Boolean(searchTerm) || Boolean(selectedCategory);
  const activeDocContent = activeDoc?.content || '';
  const activeDocIsRead = activeDoc ? Boolean(readDocs[activeDoc.id]) : false;

  return (
    <div className="h-[calc(100vh-128px)] w-full space-y-4 overflow-y-auto pb-24 pr-1 text-left font-sans antialiased scrollbar-none md:h-[calc(100vh-96px)] md:pb-10">
      {toastMessage && (
        <Alert className="fixed bottom-5 left-5 z-[80] max-w-sm rounded-xl border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <AlertDescription className="text-xs font-bold text-emerald-800">{toastMessage}</AlertDescription>
        </Alert>
      )}

      {activeDocId === null ? (
        <section className="space-y-4">
          {/* 1. Header lớn */}
          <Card className="rounded-2xl border-none bg-transparent p-0 shadow-none gap-0">
            <CardHeader className="p-0 pb-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 text-left">
                <CardTitle className="text-[20px] sm:text-[22px] font-black text-slate-900 tracking-tight">
                  Sổ tay vận hành & đào tạo nội bộ
                </CardTitle>
                <CardDescription className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  {selectedFilter === 'role'
                    ? 'Tìm đúng tài liệu theo đúng vai trò để biết rõ cần đọc gì và làm gì.'
                    : 'Nơi tập trung toàn bộ thông tin quan trọng để mọi nhân sự tìm đúng tài liệu và biết phải làm gì.'}
                </CardDescription>
              </div>

              <CardAction className="col-start-auto row-span-auto row-start-auto self-auto justify-self-auto flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 text-[#C21A1A] cursor-pointer h-8 px-4 text-xs font-black transition-all border border-red-100/50"
                  onClick={() => window.open('https://youtube.com', '_blank')}
                >
                  <HelpCircle className="h-4 w-4 shrink-0 text-[#C21A1A]" />
                  <span>Trợ giúp & HD sử dụng</span>
                </Button>
              </CardAction>
            </CardHeader>
          </Card>

          {/* 2. Dòng Tab chính + Lọc/Tìm kiếm */}
          <div className="border-b border-slate-200 pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full overflow-hidden">
            <Tabs value={selectedFilter} onValueChange={(value) => handleSetFilter(value as HandbookFilter)} className="shrink-0">
              <TabsList className="!bg-transparent !p-0 flex !rounded-none gap-4 sm:gap-6 justify-start !h-auto overflow-x-auto scrollbar-none !border-none !shadow-none">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-1.5 px-0 !pb-3 text-xs sm:text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
                >
                  <span className="whitespace-nowrap">Thư viện</span>
                </TabsTrigger>

                <TabsTrigger
                  value="role"
                  className="flex items-center gap-1.5 px-0 !pb-3 text-xs sm:text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
                >
                  <span className="whitespace-nowrap">Theo vai trò</span>
                </TabsTrigger>

                <TabsTrigger
                  value="required"
                  className="flex items-center gap-1.5 px-0 !pb-3 text-xs sm:text-sm font-bold !bg-transparent text-slate-500 !rounded-none border-t-0 border-l-0 border-r-0 border-b-2 border-transparent data-[state=active]:border-b-[#C21A1A] data-[state=active]:text-[#C21A1A] hover:text-slate-800 transition-all cursor-pointer !shadow-none data-[state=active]:!shadow-none active:bg-transparent"
                >
                  <span className="whitespace-nowrap">Bắt buộc đọc</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-row items-center gap-2 max-w-[500px] sm:max-w-md w-full shrink self-end sm:self-auto pb-2">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm tài liệu, quy trình..."
                className="rounded-xl bg-white border border-slate-200 text-xs h-9 flex-1"
              />
              <Button
                variant="outline"
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border-slate-250 bg-white text-slate-700 hover:bg-slate-50 h-9 px-3 text-xs font-bold shrink-0 cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>{selectedFilter === 'role' ? 'Lọc vai trò' : 'Lọc danh mục'}</span>
              </Button>
              {permissions.canCreate && (
                <Button
                  type="button"
                  onClick={openCreateEditor}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#C21A1A] hover:bg-[#A81515] hover:shadow-md cursor-pointer h-9 px-3 text-xs font-bold text-white transition-all shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span className="hidden xs:inline">Thêm tài liệu mới</span>
                  <span className="xs:hidden">Thêm</span>
                </Button>
              )}
            </div>
          </div>

          {/* 3. Phân chia logic UI từng tab */}
          {selectedFilter === 'role' && (
            <ScrollArea className="w-full">
              <div className="flex items-center gap-3 pb-3 pt-1 overflow-x-auto scrollbar-none">
                {roleUIMap.map((role) => {
                  const isSelected = selectedRoles.includes(role.code);
                  const Icon = role.icon;
                  return (
                    <Card
                      key={role.id}
                      onClick={() => setSelectedRoles([role.code])}
                      className={`flex flex-row items-center gap-3 rounded-2xl p-4 min-w-[200px] flex-1 cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? 'border-[#C21A1A] bg-red-50/20 shadow-md'
                          : 'border-slate-200/80 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                        isSelected ? 'bg-red-100 text-[#C21A1A]' : `${role.iconBg} ${role.iconColor}`
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={`text-[13px] font-extrabold transition-colors duration-200 ${isSelected ? 'text-[#C21A1A]' : 'text-slate-800'}`}>
                          {role.name}
                        </span>
                        <span className={`text-[10px] font-semibold mt-0.5 transition-colors duration-200 ${isSelected ? 'text-red-700/80' : 'text-slate-400'}`}>
                          {role.docCount} tài liệu phải đọc
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {selectedFilter === 'all' && (
            <div className="space-y-4 w-full">
              {/* Cards thống kê + Lối vào nhanh */}
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-12 w-full">
                <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Card 1: Tổng tài liệu */}
                  <Card
                    onClick={() => setSubFilter('all')}
                    className={`flex flex-row items-center gap-3 rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 ${
                      subFilter === 'all'
                        ? 'border-[#C21A1A] bg-red-50/20 shadow-md'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-left gap-0.5">
                      <span className={`text-sm font-semibold transition-colors duration-200 ${
                        subFilter === 'all' ? 'text-[#C21A1A]' : 'text-slate-500'
                      }`}>
                        Tổng tài liệu
                      </span>
                      <span className={`text-2xl font-black leading-none transition-colors duration-200 ${
                        subFilter === 'all' ? 'text-[#C21A1A]' : 'text-slate-800'
                      }`}>
                        {processedDocs.length}
                      </span>
                      <span className={`text-xs font-medium transition-colors duration-200 ${
                        subFilter === 'all' ? 'text-red-700/80' : 'text-slate-400'
                      }`}>
                        Tài liệu
                      </span>
                    </div>
                  </Card>

                  {/* Card 2: Bắt buộc đọc */}
                  <Card
                    onClick={() => setSubFilter('required')}
                    className={`flex flex-row items-center gap-3 rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 ${
                      subFilter === 'required'
                        ? 'border-[#C21A1A] bg-red-50/20 shadow-md'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <Shield className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-left gap-0.5">
                      <span className={`text-sm font-semibold transition-colors duration-200 ${
                        subFilter === 'required' ? 'text-[#C21A1A]' : 'text-slate-500'
                      }`}>
                        Tài liệu bắt buộc
                      </span>
                      <span className={`text-2xl font-black leading-none transition-colors duration-200 ${
                        subFilter === 'required' ? 'text-[#C21A1A]' : 'text-slate-800'
                      }`}>
                        {processedDocs.filter((d) => d.requiredRead).length}
                      </span>
                      <span className={`text-xs font-medium transition-colors duration-200 ${
                        subFilter === 'required' ? 'text-red-700/80' : 'text-slate-400'
                      }`}>
                        Tài liệu
                      </span>
                    </div>
                  </Card>

                  {/* Card 3: Đã đọc */}
                  <Card
                    onClick={() => setSubFilter('read')}
                    className={`flex flex-row items-center gap-3 rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 ${
                      subFilter === 'read'
                        ? 'border-[#C21A1A] bg-red-50/20 shadow-md'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                      <Check className="h-4.5 w-4.5 stroke-[3]" />
                    </div>
                    <div className="flex flex-col text-left gap-0.5">
                      <span className={`text-sm font-semibold transition-colors duration-200 ${
                        subFilter === 'read' ? 'text-[#C21A1A]' : 'text-slate-500'
                      }`}>
                        Đã đọc của tôi
                      </span>
                      <span className={`text-2xl font-black leading-none transition-colors duration-200 ${
                        subFilter === 'read' ? 'text-[#C21A1A]' : 'text-slate-800'
                      }`}>
                        {processedDocs.filter((d) => readDocs[d.id]).length}
                      </span>
                      <span className={`text-xs font-medium transition-colors duration-200 ${
                        subFilter === 'read' ? 'text-red-700/80' : 'text-slate-400'
                      }`}>
                        Tài liệu
                      </span>
                    </div>
                  </Card>

                  {/* Card 4: Mới cập nhật */}
                  <Card
                    onClick={() => setSubFilter('updated')}
                    className={`flex flex-row items-center gap-3 rounded-2xl p-3.5 cursor-pointer border transition-all duration-200 ${
                      subFilter === 'updated'
                        ? 'border-[#C21A1A] bg-red-50/20 shadow-md'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-500">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col text-left gap-0.5">
                      <span className={`text-sm font-semibold transition-colors duration-200 ${
                        subFilter === 'updated' ? 'text-[#C21A1A]' : 'text-slate-500'
                      }`}>
                        Mới cập nhật
                      </span>
                      <span className={`text-2xl font-black leading-none transition-colors duration-200 ${
                        subFilter === 'updated' ? 'text-[#C21A1A]' : 'text-slate-800'
                      }`}>
                        {processedDocs.filter((d) => d.isUpdated).length}
                      </span>
                      <span className={`text-xs font-medium transition-colors duration-200 ${
                        subFilter === 'updated' ? 'text-red-700/80' : 'text-slate-400'
                      }`}>
                        Tài liệu (7 ngày qua)
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Hộp Lối vào nhanh */}
                <div className="md:col-span-3">
                  <Card
                    onClick={() => {
                      setSelectedFilter('role');
                      if (currentUser?.roleCode) {
                        setSelectedRoles([currentUser.roleCode]);
                      }
                    }}
                    className="group flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-3.5 cursor-pointer hover:border-[#C21A1A] hover:shadow-md transition-all duration-200 h-full text-left"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
                      ⚡ Lối vào nhanh
                    </span>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#C21A1A] group-hover:bg-[#C21A1A] group-hover:text-white transition-colors">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-extrabold text-slate-800 truncate group-hover:text-[#C21A1A] transition-colors">
                            Mở quy trình theo vai trò
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-0.5 truncate">
                            Xem tài liệu phù hợp công việc
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:translate-x-0.5 group-hover:text-[#C21A1A] transition-all" />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Sub-tabs danh mục SOP bo tròn */}
              <div className="flex items-center gap-2 pb-1 pt-1 overflow-x-auto scrollbar-none w-full border-t border-slate-100/50 mt-1">
                <Button
                  type="button"
                  onClick={() => handleToggleCategory(null)}
                  className={`h-8 shrink-0 rounded-full border px-4 py-1 text-xs font-black uppercase transition-all duration-200 cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                    !selectedCategory
                      ? 'bg-[#C21A1A] text-white border-[#C21A1A] hover:bg-[#A81515] hover:text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#C21A1A]'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Tất cả</span>
                </Button>

                {categoryOptions.map((categoryName) => {
                  const isSelected = selectedCategory === categoryName;
                  const categoryMeta = categoryByNormalizedName.get(normalizeText(categoryName));
                  const iconConfig = getCategoryIconConfig(categoryName, categoryMeta);
                  const CategoryIcon = iconConfig?.icon || FileText;

                  return (
                    <Button
                      key={categoryName}
                      type="button"
                      onClick={() => handleToggleCategory(categoryName)}
                      className={`h-8 shrink-0 rounded-full border px-4 py-1 text-xs font-black uppercase transition-all duration-200 cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#C21A1A] text-white border-[#C21A1A] hover:bg-[#A81515] hover:text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#C21A1A]'
                      }`}
                    >
                      <CategoryIcon className="h-3.5 w-3.5" />
                      <span>{categoryName}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Kết quả lọc active */}
          {isFilterActive && (
            <Card className="flex-row flex-wrap items-center justify-between gap-2 rounded-xl border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600 shadow-none">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500">Kết quả lọc:</span>
                {selectedCategory && (
                  <Badge variant="outline" className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#C21A1A] border-slate-200">
                    Danh mục: {selectedCategory}
                  </Badge>
                )}
                {selectedFilter !== 'all' && (
                  <Badge variant="outline" className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-700 border-slate-200">
                    Bộ lọc: {selectedFilter === 'required' ? 'Bắt buộc đọc' : 'Theo vai trò'}
                  </Badge>
                )}
                {selectedFilter === 'all' && subFilter !== 'all' && (
                  <Badge variant="outline" className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-700 border-slate-200">
                    Thống kê: {subFilter === 'required' ? 'Bắt buộc đọc' : subFilter === 'read' ? 'Đã đọc' : 'Mới cập nhật'}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="outline" className="rounded bg-white px-2 py-0.5 font-sans text-emerald-700 border-slate-200">
                    Từ khóa: "{searchTerm}"
                  </Badge>
                )}
              </div>

              <Button variant="ghost" onClick={handleResetFilters} className="text-[10px] font-black uppercase text-[#C21A1A] hover:underline hover:bg-transparent h-auto p-0">
                Đặt lại
              </Button>
            </Card>
          )}

          {loadErrorMessage && (
            <Alert variant="destructive" className="rounded-xl border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              <AlertDescription>{loadErrorMessage}</AlertDescription>
            </Alert>
          )}

          {isLoadingDocs && (
            <Alert className="rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <AlertDescription>Đang tải dữ liệu sổ tay...</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.length === 0 ? (
              <Empty className="col-span-full rounded-2xl border-dashed border-slate-200 bg-white py-16">
                <EmptyHeader>
                  <EmptyMedia>
                    <BookOpen className="h-12 w-12 text-slate-200" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                    Không tìm thấy tài liệu phù hợp
                  </EmptyTitle>
                  <EmptyDescription className="text-[11px] font-medium text-slate-400">
                    Thử thay đổi từ khóa hoặc chọn lại bộ lọc để xem toàn bộ tài liệu.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredDocs.map((doc) => {
                const Icon = doc.meta.icon;
                const isRead = readDocs[doc.id] || false;

                return (
                  <Card
                    key={doc.id}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 gap-0 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C21A1A] hover:shadow-md"
                    onClick={() => handleOpenDoc(doc)}
                  >
                    <CardHeader className="p-0 flex flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${doc.meta.iconBg}`}>
                          <Icon className={`h-4.5 w-4.5 ${doc.meta.iconColor}`} />
                        </div>
                        <Badge variant="outline" className="rounded bg-slate-100 border-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                          {doc.category}
                        </Badge>
                      </div>

                      <CardAction className="col-start-auto row-span-auto row-start-auto self-auto justify-self-auto flex items-center gap-1">
                        {permissions.canUpdate && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            type="button"
                            onClick={(event) => openEditEditor(doc, event)}
                            className="bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 h-7 w-7 cursor-pointer"
                            title="Sửa tài liệu"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {permissions.canDelete && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            type="button"
                            onClick={(event) => {
                              void handleDeleteDoc(doc, event);
                            }}
                            className="bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 h-7 w-7 cursor-pointer"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#C21A1A]" />
                      </CardAction>
                    </CardHeader>

                    <CardContent className="p-0 mt-3 flex-1 flex flex-col gap-1">
                      <CardTitle className="text-xs font-extrabold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-[#C21A1A]">
                        {doc.title}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                        {doc.summary}
                      </CardDescription>
                    </CardContent>

                    <CardFooter className="p-0 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-emerald-600">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            Đã đọc
                          </span>
                        ) : doc.meta.isUpdated ? (
                          <Badge variant="outline" className="inline-flex items-center gap-1 rounded border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
                            Mới cập nhật
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Chưa đọc</span>
                        )}
                      </div>

                      <div className="flex items-center">
                        {doc.meta.badgeText === 'Bắt buộc đọc' ? (
                          <Badge variant="outline" className="inline-flex items-center gap-1 rounded-lg border-rose-200 bg-rose-50 px-2 py-1 text-[9px] font-black text-[#C21A1A]">
                            <span>🔖</span>
                            <span>Bắt buộc đọc</span>
                          </Badge>
                        ) : doc.meta.badgeText === 'Xác nhận đã đọc' && !isRead && canConfirmRead ? (
                          <Button
                            type="button"
                            onClick={(event) => {
                              void handleConfirmRead(doc, event);
                            }}
                            className="rounded-lg bg-blue-800 hover:bg-blue-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white h-auto cursor-pointer"
                          >
                            Xác nhận đã đọc
                          </Button>
                        ) : doc.meta.badgeText === 'Xác nhận đã đọc' && !isRead && !canConfirmRead ? (
                          <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                            Chưa có quyền xác nhận
                          </span>
                        ) : doc.meta.driveLink ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600">
                            Xem Drive gốc
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                            {doc.meta.badgeText}
                          </span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-4 w-full animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm lg:col-span-9 flex flex-col md:h-[calc(100vh-140px)] min-h-[400px] gap-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Button
                    variant="outline"
                    type="button"
                    size="icon"
                    onClick={handleBackToList}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-500 hover:border-[#C21A1A] hover:text-[#C21A1A] hover:bg-red-50/30 cursor-pointer shrink-0 transition-colors"
                    title="Quay lại danh sách"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 sm:text-base truncate">
                    {activeDoc?.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500 select-none">
                    {activeDoc?.category}
                  </span>

                  {activeDoc && permissions.canUpdate && (
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => openEditEditor(activeDoc)}
                      className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 cursor-pointer transition-colors"
                      title="Chỉnh sửa tài liệu"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {activeDoc && permissions.canDelete && (
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => {
                        void handleDeleteDoc(activeDoc);
                      }}
                      className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:border-rose-350 hover:bg-rose-50/50 hover:text-rose-600 cursor-pointer transition-colors"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {activeDoc && readDocs[activeDoc.id] && (
                    <Badge className="inline-flex items-center gap-1 rounded-lg border border-emerald-205 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 select-none">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Đã đọc</span>
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-3 pb-10 text-slate-700 select-text leading-relaxed">{renderedActiveContent}</div>
              </ScrollArea>
            </Card>

            <Card className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm lg:col-span-3 md:h-[calc(100vh-140px)] min-h-[400px] gap-0">
              <CardHeader className="p-0 mb-4">
                <div className="flex w-full items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                  <span className="rounded-lg bg-[#C21A1A] p-1.5 text-white">
                    <Info className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800">
                    Trách nhiệm tuân thủ
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto pr-1 scrollbar-none space-y-3.5 text-xs text-slate-600">
                <div className="pb-2">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Chủ đề lớn</span>
                  <span className="mt-1 block text-xs font-bold text-slate-800">{activeDoc?.category}</span>
                </div>
                <Separator className="bg-slate-50" />

                <div className="pb-2">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Loại tài liệu</span>
                  <span className="mt-1 block text-xs font-bold text-slate-800">
                    {activeDoc?.meta.badgeText || 'Tài liệu hướng dẫn'}
                  </span>
                </div>
                <Separator className="bg-slate-50" />

                <div className="pb-2">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Lưu vết xác nhận</span>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    {formatDateTime(activeReadAudit?.readAt)}
                  </p>
                </div>
                <Separator className="bg-slate-50" />

                {activeDoc?.meta.driveLink && (
                  <div className="space-y-1">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Tài liệu gốc (Google Drive)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full justify-start rounded-xl border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-700 hover:bg-rose-50/30 hover:border-[#C21A1A] hover:text-[#C21A1A] h-auto py-2 px-3 transition-all cursor-pointer"
                        >
                          <a
                            href={activeDoc.meta.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate flex-1 text-left font-semibold">Xem Google Drive</span>
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs break-all text-[10px]">
                        {activeDoc.meta.driveLink}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {activeDocImageUrls.length > 0 && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Ảnh đính kèm ({activeDocImageUrls.length})</span>
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {activeDocImageUrls.map((url, index) => (
                        <Button
                          key={url}
                          variant="ghost"
                          type="button"
                          onClick={() => setPreviewImageUrl(url)}
                          className="group relative h-10 p-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-50 transition-all hover:border-[#C21A1A] hover:shadow-xs cursor-pointer"
                          title={`Xem hình ${index + 1}`}
                        >
                          <img
                            src={url}
                            alt={`Ảnh đính kèm ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                            loading="lazy"
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-0 mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                {activeDoc && (
                  <Button
                    type="button"
                    onClick={() => {
                      void handleConfirmReadAndBack();
                    }}
                    disabled={!canConfirmRead}
                    variant={!canConfirmRead ? 'outline' : readDocs[activeDoc.id] ? 'default' : 'destructive'}
                    className={`w-full gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer hover:shadow-md active:scale-98 ${readDocs[activeDoc.id] && canConfirmRead
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                      : !readDocs[activeDoc.id] && canConfirmRead
                        ? 'bg-[#C21A1A] hover:bg-[#A81515] text-white shadow-red-100'
                        : 'bg-slate-250 border-slate-200 text-slate-400'
                      }`}
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>{readDocs[activeDoc.id] ? 'Ký lại xác nhận đã đọc' : 'Ký xác nhận đã đọc'}</span>
                  </Button>
                )}

                <p className="text-center text-[10px] font-medium text-slate-400 select-none">
                  Biên bản điện tử được lưu theo ca trực hiện tại.
                </p>
              </CardFooter>
            </Card>
          </div>
        </section>
      )}

      {permissions.canCreate && !activeDocId && (
        <Button
          type="button"
          onClick={openCreateEditor}
          className="fixed bottom-24 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl transition-all hover:scale-105 hover:bg-red-700 active:scale-95 sm:hidden cursor-pointer"
          title="Thêm tài liệu mới"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </Button>
      )}

      <HandbookEditorDialog
        isOpen={isEditorOpen}
        isSaving={isSavingDoc}
        isUploadingImages={isUploadingImages}
        editingDocId={editingDocId}
        formState={formState}
        canManageCategories={canManageCategories}
        categoryOptions={categoryOptions}
        rolesOptions={rolesOptions}
        errors={formErrors}
        onClose={handleDialogClose}
        onSave={() => {
          void handleSaveDoc();
        }}
        onFormPatch={handleFormPatch}
        onUploadImages={handleUploadImages}
        onAddCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
        getCategoryIcon={getCategoryIconComponent}
      />

      <DeleteConfirm
        open={isDeleteCategoryConfirmOpen}
        onOpenChange={setIsDeleteCategoryConfirmOpen}
        title="Xóa danh mục"
        description={`Bạn có chắc muốn xóa danh mục "${deletingCategory?.name || ''}"?`}
        warningMessage="Các tài liệu thuộc danh mục này sẽ không bị xóa nhưng sẽ mất liên kết danh mục."
        onConfirm={() => void handleConfirmDeleteCategory()}
        loading={isDeletingCategory}
        className="!z-[80]"
        overlayClassName="!z-[80]"
      />

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-2 bg-transparent border-none shadow-none flex items-center justify-center"
          showCloseButton
        >
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Xem ảnh handbook"
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
