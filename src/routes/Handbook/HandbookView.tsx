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
  Info,
  Lock,
  Network,
  Plus,
  Scale,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { MODULE_CODE } from '../../constants';
import { handbookService } from '../../services/handbook-service';
import { handbookCategoryService } from '../../services/handbook-category-service';
import { ScrollArea } from '../../shared/components/scroll-area';
import { useModulePermissions, isOwnerUser, normalizeAccessCode } from '../../shared/hooks/use-module-permissions';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/ui';
import { useAppStore } from '../../stores/app-store';
import type { HandbookCategory, HandbookDoc } from '../../types/handbook.types';
import HandbookEditorDialog from './components/handbook-editor-dialog';
import type { HandbookFormState, HandbookPermissions } from './handbook-view.types';
import { handbookFormSchema, type HandbookFormFieldErrors } from './handbook-form-schema';

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

type HandbookFilter = 'all' | 'required' | 'updated';

const OWNER_ROLE_CODES_HANDBOOK = new Set(['CHU_CUA_HANG', 'QUAN_TRI_VIEN']);


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

function resolveCardMetadata(doc: HandbookDoc): UICardMetadata {
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

  return base;
}

function renderFormattedContent(content: string): React.ReactNode[] {
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

export default function HandbookView() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<HandbookFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [handbookDocs, setHandbookDocs] = useState<HandbookDoc[]>([]);
  const [handbookCategories, setHandbookCategories] = useState<HandbookCategory[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formState, setFormState] = useState<HandbookFormState>(EMPTY_FORM_STATE);
  const [formErrors, setFormErrors] = useState<HandbookFormFieldErrors>({});

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
        const [docs, categories] = await Promise.all([
          handbookService.getAll(),
          handbookCategoryService.getAll(),
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

        setHandbookDocs(sortedDocs);
        setHandbookCategories(sortedCategories);
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

  const processedDocs = useMemo<HandbookDocWithMeta[]>(
    () => handbookDocs.map((doc) => ({ ...doc, meta: resolveCardMetadata(doc) })),
    [handbookDocs],
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

  const MAX_VISIBLE = 5;

  const { visibleCategories, hiddenCategories } = useMemo(() => {
    if (categoryOptions.length <= MAX_VISIBLE) {
      return {
        visibleCategories: categoryOptions,
        hiddenCategories: [],
      };
    }

    const isSelectedHidden =
      selectedCategory !== null &&
      !categoryOptions.slice(0, MAX_VISIBLE).includes(selectedCategory);

    if (isSelectedHidden) {
      const visible = [
        selectedCategory,
        ...categoryOptions.filter((c) => c !== selectedCategory).slice(0, MAX_VISIBLE - 1),
      ];
      const hidden = categoryOptions.filter((c) => !visible.includes(c));
      return {
        visibleCategories: visible,
        hiddenCategories: hidden,
      };
    }

    return {
      visibleCategories: categoryOptions.slice(0, MAX_VISIBLE),
      hiddenCategories: categoryOptions.slice(MAX_VISIBLE),
    };
  }, [categoryOptions, selectedCategory]);

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

      return true;
    });
  }, [processedDocs, searchTerm, selectedCategory, selectedFilter]);

  const activeDoc = useMemo(
    () => processedDocs.find((doc) => doc.id === activeDocId) || null,
    [activeDocId, processedDocs],
  );
  const activeReadAudit = useMemo(
    () => (activeDoc && currentReadKey ? activeDoc.readAudits?.[currentReadKey] : undefined),
    [activeDoc, currentReadKey],
  );
  const renderedActiveContent = useMemo(
    () => (activeDoc ? renderFormattedContent(activeDoc.content || '') : null),
    [activeDoc],
  );
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
    async (name: string, options?: { silentSuccessToast?: boolean }) => {
      const trimmedName = name.trim();
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
          normalizedName,
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
      await handleCreateCategory(category, { silentSuccessToast: true });
    }

    const nowIso = new Date().toISOString();
    const driveLink = validated.data.driveLink.trim();
    const categoryKey = validated.data.categoryKey.trim();
    const payload: Partial<HandbookDoc> = {
      title,
      category,
      summary,
      content,
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

  const handleSetFilter = useCallback((nextFilter: HandbookFilter) => setSelectedFilter(nextFilter), []);
  const handleToggleCategory = useCallback((categoryName: string | null) => {
    setSelectedCategory((prev) => (prev === categoryName ? null : categoryName));
  }, []);
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedFilter('all');
  }, []);
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

  const isFilterActive = selectedFilter !== 'all' || Boolean(searchTerm) || Boolean(selectedCategory);

  return (
    <div className="h-[calc(100vh-128px)] w-full space-y-3 overflow-y-auto pb-24 pr-1 text-left font-sans antialiased scrollbar-none md:h-[calc(100vh-96px)] md:pb-10">
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-[80] flex max-w-sm items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900 break-words sm:text-lg">
              <BookOpen className="h-4 w-4 shrink-0 text-[#C21A1A] sm:h-5 sm:w-5" />
              <span>Sổ tay điều hành vận hành</span>
            </h1>
            <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
              Tập trung chuẩn vận hành cốt lõi, giúp nhân sự tra cứu nhanh và thực thi đúng quy trình.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SOP Lite</span>
            {permissions.canCreate && (
              <button
                type="button"
                onClick={openCreateEditor}
                className="ml-2 hidden items-center gap-1.5 rounded-xl bg-[#C21A1A] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-[#A81515] sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm tài liệu</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {activeDocId === null ? (
        <section className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 md:w-auto">
                <button
                  type="button"
                  onClick={() => handleSetFilter('all')}
                  className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide sm:flex-initial ${selectedFilter === 'all' ? 'border border-red-200 bg-white text-[#C21A1A] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="hidden sm:inline">Tất cả tài liệu</span>
                  <span className="sm:hidden">Tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFilter('required')}
                  className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide sm:flex-initial ${selectedFilter === 'required' ? 'border border-red-200 bg-white text-[#C21A1A] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="hidden sm:inline">Bắt buộc đọc</span>
                  <span className="sm:hidden">Bắt buộc</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFilter('updated')}
                  className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide sm:flex-initial ${selectedFilter === 'updated' ? 'border border-red-200 bg-white text-[#C21A1A] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className="hidden sm:inline">Cập nhật mới</span>
                  <span className="sm:hidden">Cập nhật</span>
                </button>
              </div>

              <div className="flex w-full items-center gap-2 md:max-w-lg">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm tài liệu..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-12 text-xs font-medium focus:border-[#C21A1A] focus:outline-hidden focus:ring-1 focus:ring-[#C21A1A]"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-700">
                      Xóa
                    </button>
                  )}
                </div>

              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Nhóm danh mục:</span>
              <Button
                type="button"
                onClick={() => handleToggleCategory(null)}
                className={`rounded-xl px-2.5 py-1.5 h-auto text-[10px] font-black uppercase ${
                  selectedCategory === null
                    ? 'bg-slate-800 text-white shadow-xs hover:bg-slate-900 hover:text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                Tất cả nhóm
              </Button>
              {visibleCategories.map((categoryName) => {
                const isSelected = selectedCategory === categoryName;
                return (
                  <Button
                    key={categoryName}
                    type="button"
                    onClick={() => handleToggleCategory(categoryName)}
                    className={`rounded-xl px-2.5 py-1.5 h-auto text-[10px] font-bold ${
                      isSelected
                        ? 'bg-[#C21A1A] text-white shadow-xs hover:bg-[#A81515] hover:text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {categoryName}
                  </Button>
                );
              })}
              {hiddenCategories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="rounded-xl px-2.5 py-1.5 h-auto text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    >
                      +{hiddenCategories.length} nhóm
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                    {hiddenCategories.map((categoryName) => {
                      const isSelected = selectedCategory === categoryName;
                      return (
                        <DropdownMenuItem
                          key={categoryName}
                          onClick={() => handleToggleCategory(categoryName)}
                          className={`text-xs font-semibold cursor-pointer ${
                            isSelected ? 'text-[#C21A1A] font-extrabold bg-red-50' : 'text-slate-600'
                          }`}
                        >
                          {categoryName}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {isFilterActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500">Kết quả lọc:</span>
                {selectedCategory && (
                  <span className="rounded border bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#C21A1A]">
                    Danh mục: {selectedCategory}
                  </span>
                )}
                {selectedFilter !== 'all' && (
                  <span className="rounded border bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-700">
                    Bộ lọc: {selectedFilter === 'required' ? 'Bắt buộc đọc' : 'Mới cập nhật'}
                  </span>
                )}
                {searchTerm && (
                  <span className="rounded border bg-white px-2 py-0.5 font-mono text-emerald-700">
                    Từ khóa: "{searchTerm}"
                  </span>
                )}
              </div>

              <button type="button" onClick={handleResetFilters} className="text-[10px] font-black uppercase text-[#C21A1A] hover:underline">
                Đặt lại
              </button>
            </div>
          )}

          {loadErrorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {loadErrorMessage}
            </div>
          )}

          {isLoadingDocs && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              Đang tải dữ liệu sổ tay...
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pb-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Không tìm thấy tài liệu phù hợp</h3>
                <p className="mx-auto mt-1 max-w-sm text-[11px] font-medium text-slate-400">
                  Thử thay đổi từ khóa hoặc chọn lại bộ lọc để xem toàn bộ tài liệu.
                </p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const Icon = doc.meta.icon;
                const isRead = readDocs[doc.id] || false;

                return (
                  <article
                    key={doc.id}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C21A1A] hover:shadow-md"
                    onClick={() => handleOpenDoc(doc)}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${doc.meta.iconBg}`}>
                            <Icon className={`h-4.5 w-4.5 ${doc.meta.iconColor}`} />
                          </div>
                          <span className="rounded border bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                            {doc.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {permissions.canUpdate && (
                            <button
                              type="button"
                              onClick={(event) => openEditEditor(doc, event)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              title="Sửa tài liệu"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {permissions.canDelete && (
                            <button
                              type="button"
                              onClick={(event) => {
                                void handleDeleteDoc(doc, event);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              title="Xóa tài liệu"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#C21A1A]" />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-extrabold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-[#C21A1A]">
                          {doc.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                          {doc.summary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-emerald-600">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            Đã đọc
                          </span>
                        ) : doc.meta.isUpdated ? (
                          <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
                            Mới cập nhật
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Chưa đọc</span>
                        )}
                      </div>

                      <div className="flex items-center">
                        {doc.meta.badgeText === 'Bắt buộc đọc' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[9px] font-black text-[#C21A1A]">
                            <span>🔖</span>
                            <span>Bắt buộc đọc</span>
                          </span>
                        ) : doc.meta.badgeText === 'Xác nhận đã đọc' && !isRead && canConfirmRead ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              void handleConfirmRead(doc, event);
                            }}
                            className="rounded-lg bg-blue-800 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white transition-colors hover:bg-blue-900"
                          >
                            Xác nhận đã đọc
                          </button>
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
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                {activeDoc?.category}
              </span>

              {activeDoc && permissions.canUpdate && (
                <button
                  type="button"
                  onClick={() => openEditEditor(activeDoc)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Sửa</span>
                </button>
              )}

              {activeDoc && permissions.canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteDoc(activeDoc);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa</span>
                </button>
              )}

              {activeDoc && readDocs[activeDoc.id] && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Đã đọc</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-8">
              <div className="mb-3 flex items-center gap-2 text-[#C21A1A]">
                <span className="h-2 w-2 rounded-full bg-[#C21A1A]" />
                <span className="text-[10px] font-black uppercase tracking-widest">mr.táo SOP standard</span>
              </div>

              <h2 className="mb-4 border-b border-slate-200 pb-3 text-sm font-black uppercase tracking-wide text-slate-900 sm:text-base">
                {activeDoc?.title}
              </h2>

              <ScrollArea className="h-[calc(100vh-360px)] min-h-[360px] pr-3 md:h-[450px]">
                <div className="space-y-2 pb-10 text-slate-700">{renderedActiveContent}</div>
              </ScrollArea>
            </div>

            <aside className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3">
                  <span className="rounded-full bg-[#C21A1A] p-1 text-white">
                    <Info className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-800">
                    Trách nhiệm tuân thủ
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Chủ đề lớn</span>
                    <span className="mt-0.5 block text-[11px] font-extrabold text-slate-800">{activeDoc?.category}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Loại tài liệu</span>
                    <span className="mt-0.5 block text-[11px] font-bold text-slate-800">
                      {activeDoc?.meta.badgeText || 'Tài liệu hướng dẫn'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Lưu vết xác nhận</span>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                      Lần xác nhận gần nhất của bạn: {formatDateTime(activeReadAudit?.readAt)}
                    </p>
                  </div>

                  {activeDoc?.meta.driveLink && (
                    <div className="space-y-1">
                      <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Liên kết tài liệu gốc</span>
                      <a
                        href={activeDoc.meta.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-[11px] font-extrabold text-slate-700 transition-colors hover:bg-slate-100"
                        title={activeDoc.meta.driveLink}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate flex-1 text-left font-semibold">{activeDoc.meta.driveLink}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-2 border-t pt-5">
                {activeDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleConfirmReadAndBack();
                    }}
                    disabled={!canConfirmRead}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wide transition-all ${
                      !canConfirmRead
                        ? 'cursor-not-allowed bg-slate-300 text-white'
                        : readDocs[activeDoc.id]
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-[#C21A1A] text-white hover:bg-[#A81515]'
                    }`}
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>{readDocs[activeDoc.id] ? 'Ký lại xác nhận đã đọc' : 'Ký xác nhận đã đọc'}</span>
                  </button>
                )}

                <p className="text-center text-[10px] font-medium text-slate-400">
                  Biên bản điện tử được lưu theo ca trực hiện tại.
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {permissions.canCreate && !activeDocId && (
        <button
          type="button"
          onClick={openCreateEditor}
          className="fixed bottom-24 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl transition-all hover:scale-105 hover:bg-red-700 active:scale-95 sm:hidden"
          title="Thêm tài liệu mới"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>
      )}

      <HandbookEditorDialog
        isOpen={isEditorOpen}
        isSaving={isSavingDoc}
        editingDocId={editingDocId}
        formState={formState}
        canManageCategories={canManageCategories}
        categoryOptions={categoryOptions}
        errors={formErrors}
        onClose={handleDialogClose}
        onSave={() => {
          void handleSaveDoc();
        }}
        onFormPatch={handleFormPatch}
        onAddCategory={(name) => handleCreateCategory(name)}
      />
    </div>
  );
}
