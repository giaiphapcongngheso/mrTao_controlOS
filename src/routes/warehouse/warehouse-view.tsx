import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui';
import {
  Layers,
  Coins,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  Building,
  Tag,
  Filter,
  Check,
  History,
} from 'lucide-react';
import WarehouseCreateForm from './components/warehouse-create-form';
import WarehouseSyncHistoryDrawer from './components/warehouse-sync-history-drawer';
import { useWarehouseData } from './hooks/use-warehouse-data';
import { ModuleHeader, CustomTable } from '@shared/components';
import { NumberRangePicker } from '../../../share/components/custom/number-range-picker';
import type { ColumnDef } from '@tanstack/react-table';
import type { WarehouseProduct, WarehouseSyncLog } from '../../types/warehouse.types';


const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export default function WarehouseView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const {
    credentials,
    branches,
    categories,
    filteredProducts,
    filters,
    isLoading,
    error,
    syncTime,
    totalOnHand,
    totalValue,
    setFilters,
    createProduct,
    syncData,
    tempSyncedData,
    saveTempDataToSystem,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  } = useWarehouseData();

  const [syncSummary, setSyncSummary] = useState<WarehouseSyncLog | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);


  const lowStockCount = useMemo(
    () =>
      filteredProducts.filter((product) => {
        const onHand = (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);
        return onHand <= 5;
      }).length,
    [filteredProducts],
  );

  const columns = useMemo<ColumnDef<WarehouseProduct>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Mã hàng hóa',
      size: 120,
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc mã..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
          />
        ),
      },
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center font-sans">
            <span className="font-sans bg-slate-50 text-slate-700 border border-slate-200/60 rounded-md px-2 py-0.5 text-sm font-semibold select-all transition-colors">
              {product.code}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Tên & Ngành hàng',
      size: 260,
      meta: {
        filterElement: (column) => (
          <input
            type="text"
            placeholder="Lọc tên..."
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
          />
        ),
      },
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="text-left font-sans text-sm">
            <div className="text-sm font-bold text-slate-800 leading-snug">{product.name}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.5 rounded uppercase tracking-wide">
                {product.categoryName ?? 'Khác'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Nguồn dữ liệu',
      size: 110,
      meta: {
        filterElement: (column) => {
          const val = (column.getFilterValue() as string) ?? 'all';
          return (
            <select
              value={val}
              onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full h-8 text-xs px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">Tất cả</option>
              <option value="synced">KiotViet</option>
              <option value="manual">Tự tạo</option>
            </select>
          );
        },
      },
      cell: ({ row }) => {
        const product = row.original;
        const isSynced = product.source !== 'manual';
        return (
          <div className="flex justify-start font-sans text-sm">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-semibold border border-solid ${
                isSynced
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isSynced ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              {isSynced ? 'KiotViet' : 'Tự tạo'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'basePrice',
      header: 'Giá bán sản phẩm',
      size: 130,
      filterFn: (row, columnId, filterValue) => {
        const [min, max] = filterValue as [number | undefined, number | undefined];
        const value = row.getValue(columnId) as number;
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        return true;
      },
      meta: {
        filterElement: (column) => (
          <NumberRangePicker
            value={column.getFilterValue() as [number, number] | undefined}
            onChange={(val) => column.setFilterValue(val)}
            placeholderFrom="Từ..."
            placeholderTo="Đến..."
          />
        ),
      },
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="text-right font-sans font-bold text-slate-700 text-sm md:pr-4">
            {CURRENCY_FORMATTER.format(product.basePrice)}
          </div>
        );
      },
    },
    {
      id: 'onHand',
      header: 'Tổng tồn kho',
      size: 110,
      accessorFn: (product) => (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0),
      filterFn: (row, columnId, filterValue) => {
        const [min, max] = filterValue as [number | undefined, number | undefined];
        const value = row.getValue(columnId) as number;
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        return true;
      },
      meta: {
        filterElement: (column) => (
          <NumberRangePicker
            value={column.getFilterValue() as [number, number] | undefined}
            onChange={(val) => column.setFilterValue(val)}
            placeholderFrom="Từ..."
            placeholderTo="Đến..."
          />
        ),
      },
      cell: ({ row }) => {
        const product = row.original;
        const onHand = (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);
        const isLow = onHand <= 5;
        return (
          <div className="flex items-center justify-start font-sans text-sm">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold uppercase tracking-wider border border-solid ${
                isLow
                  ? 'bg-rose-50 border-rose-100 text-rose-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {onHand.toLocaleString('vi-VN')}
            </span>
          </div>
        );
      },
    },
    {
      id: 'branches',
      header: 'Phân phối kho chi tiết',
      size: 260,
      cell: ({ row }) => {
        const product = row.original;
        const inventories = product.inventories ?? [];
        if (inventories.length === 0) {
          return <span className="text-slate-400 text-sm italic font-sans">Chưa phân phối kho</span>;
        }
        return (
          <div className="flex flex-wrap gap-2 text-left py-1 text-sm font-sans">
            {inventories.map((inv, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-slate-650 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5 text-sm font-medium">
                <span className="truncate max-w-[120px]">{inv.branchName}:</span>
                <span className="font-bold text-slate-800 ml-0.5">
                  {inv.onHand}
                </span>
              </span>
            ))}
          </div>
        );
      },
    }
  ], []);

  return (
    <div className="space-y-3 font-sans text-sm">
      {/* 🚀 Tiêu đề phân hệ chính */}
      <ModuleHeader
        title="Quản lý kho & tích hợp KiotViet"
        description="Theo dõi chi tiết số lượng tồn kho từng chi nhánh, quản lý giá bán và đồng bộ hóa hàng hóa thời gian thực."
        icon={<Layers className="h-5 w-5 text-slate-800" />}
      >
        <div className="flex flex-wrap gap-2 w-full sm:w-auto md:justify-end">
          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm font-bold border-slate-200/80 bg-white"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Tạo sản phẩm
          </Button>

          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm font-bold border-slate-200/80 bg-white"
            onClick={() => setShowHistoryDrawer(true)}
          >
            <History className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Lịch sử đồng bộ
          </Button>

          <Button
            className="rounded-xl h-9 text-sm font-bold shadow-6xs"
            onClick={() => void syncData()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ nhanh'}
          </Button>
        </div>
      </ModuleHeader>

      {/* 📊 Thống kê Số liệu tinh gọn */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        {/* Card 1: Tổng tồn kho */}
        <div className="flex items-center gap-3 px-3 py-1 text-left font-sans">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100/60 text-indigo-600 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-400 block leading-tight">Tổng tồn kho</span>
            <div className="text-[16px] font-bold text-slate-800 leading-normal">
              {totalOnHand.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Card 2: Giá trị kho hàng */}
        <div className="flex items-center gap-3 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 text-left font-sans">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100/60 text-emerald-650 shrink-0">
            <Coins className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-400 block leading-tight">Giá trị tồn kho</span>
            <div className="text-[16px] font-bold text-slate-800 leading-normal">
              {CURRENCY_FORMATTER.format(totalValue)}
            </div>
          </div>
        </div>

        {/* Card 3: Sản phẩm thấp tồn */}
        <div className="flex items-center gap-3 px-3 py-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 text-left font-sans">
          <div className={`p-2 rounded-xl border shrink-0 ${lowStockCount > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-400 block leading-tight">Sắp hết hàng (≤ 5)</span>
            <div className="text-[16px] font-bold text-slate-800 leading-normal">
              {lowStockCount}
            </div>
          </div>
        </div>
      </div>

      {syncTime && (
        <div className="text-sm font-bold text-slate-400 text-right pr-1">
          Cập nhật đồng bộ KiotViet lần cuối: <span className="text-slate-650 font-bold">{syncTime}</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-rose-250 bg-rose-50/40">
          <AlertDescription className="text-rose-800 font-medium text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ⚠️ Banner thông báo chờ lưu đồng bộ */}
      {tempSyncedData && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 font-sans shadow-3xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">Chế độ xem trước đồng bộ KiotViet</div>
              <div className="text-sm text-amber-700/90 mt-0.5">
                Hệ thống đang hiển thị dữ liệu mới từ KiotViet (xem trước). Vui lòng nhấn **"Lưu vào hệ thống"** để áp dụng hoặc **"Hủy bỏ"** để giữ nguyên dữ liệu hiện tại.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              className="rounded-xl h-9 text-sm font-bold border-amber-250 hover:bg-amber-100/40 text-amber-800 bg-transparent"
              onClick={discardTempData}
              disabled={isLoading}
            >
              Hủy bỏ
            </Button>
            <Button
              className="rounded-xl h-9 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-3xs border-none"
              onClick={async () => {
                try {
                  const log = await saveTempDataToSystem();
                  if (log) {
                    setSyncSummary(log);
                    setShowSummaryDialog(true);
                  }
                } catch (err) {
                  // Error is already logged and stored in hook state
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Đang lưu...' : 'Lưu vào hệ thống'}
            </Button>
          </div>
        </div>
      )}


      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl rounded-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-slate-800">Tạo mới sản phẩm kho</DialogTitle>
          </DialogHeader>
          <WarehouseCreateForm
            branches={branches}
            onCreate={(values) => {
              createProduct(values);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 📊 Dialog thông báo kết quả đồng bộ dữ liệu */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl font-sans text-center border-none shadow-2xl p-6 bg-white overflow-hidden">
          {/* Decorative Top Accent Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />
          
          <div className="flex flex-col items-center pt-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100/80 text-emerald-600 shadow-sm mb-3">
              <Check className="h-7 w-7 stroke-[3px]" />
            </div>
            <DialogTitle className="text-[16px] font-bold text-slate-800 tracking-tight">
              Đồng bộ dữ liệu thành công
            </DialogTitle>
            <p className="text-sm font-semibold text-slate-400 mt-1">
              Hệ thống đã cập nhật KiotViet vào lúc: <span className="font-extrabold text-slate-655">{syncSummary ? new Date(syncSummary.timestamp).toLocaleTimeString('vi-VN') : ''}</span>
            </p>
          </div>

          <div className="mt-5 space-y-4 font-sans text-slate-600">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Chi nhánh */}
              <div className="relative overflow-hidden bg-emerald-50/15 border border-emerald-100/60 rounded-2xl p-4 text-left transition-all hover:bg-emerald-50/25">
                <div className="absolute -top-1 -right-1 text-emerald-100/30">
                  <Building className="h-10 w-10 stroke-[1.5px]" />
                </div>
                <div className="text-sm text-emerald-800 font-extrabold uppercase tracking-wider">Chi nhánh</div>
                <div className="mt-3.5 space-y-2 text-sm font-semibold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Thêm mới</span>
                    <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">+{syncSummary?.branchesAdded}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Cập nhật</span>
                    <span className="text-sm font-extrabold text-slate-650 bg-slate-100 px-2 py-0.5 rounded-lg">+{syncSummary?.branchesUpdated}</span>
                  </div>
                </div>
              </div>

              {/* Sản phẩm */}
              <div className="relative overflow-hidden bg-blue-50/15 border border-blue-100/60 rounded-2xl p-4 text-left transition-all hover:bg-blue-50/25">
                <div className="absolute -top-1 -right-1 text-blue-100/30">
                  <Layers className="h-10 w-10 stroke-[1.5px]" />
                </div>
                <div className="text-sm text-blue-800 font-extrabold uppercase tracking-wider">Sản phẩm</div>
                <div className="mt-3.5 space-y-2 text-sm font-semibold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Thêm mới</span>
                    <span className="text-sm font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg">+{syncSummary?.productsAdded}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Cập nhật</span>
                    <span className="text-sm font-extrabold text-slate-655 bg-slate-100 px-2 py-0.5 rounded-lg">+{syncSummary?.productsUpdated}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chi tiết Summary */}
            <div className="flex gap-2.5 bg-slate-50/80 border border-slate-100/80 p-3.5 rounded-2xl text-left text-sm text-slate-650 leading-relaxed font-medium">
              <span className="shrink-0 text-slate-400 text-sm mt-0.5">ℹ</span>
              <span className="text-sm text-slate-500 font-medium leading-relaxed">{syncSummary?.summary}</span>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              className="rounded-xl px-8 h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none transition-all hover:-translate-y-0.5 active:translate-y-0"
              onClick={() => setShowSummaryDialog(false)}
            >
              Hoàn tất
            </Button>
          </div>
        </DialogContent>
      </Dialog>




      {/* 🔍 Bộ lọc hàng hóa tinh gọn trên một dòng */}
      <div className="flex flex-col md:flex-row items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/95 shadow-3xs font-sans">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={filters.query}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                query: event.target.value,
              }))
            }
            className="pl-9 h-9 rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40 transition focus-visible:bg-white"
            placeholder="Tìm theo tên hoặc mã hàng hóa..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-2/3 md:justify-end">
          {/* Chi nhánh */}
          <Select
            value={filters.branchId === null ? 'all' : String(filters.branchId)}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                branchId: value === 'all' ? null : Number(value),
              }))
            }
          >
            <SelectTrigger className="h-9 w-[170px] rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40">
              <span className="flex items-center gap-1.5 truncate">
                <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue placeholder="Chọn chi nhánh" />
              </span>
            </SelectTrigger>
            <SelectContent className="font-sans text-sm">
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ngành hàng */}
          <Select
            value={filters.category}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                category: value,
              }))
            }
          >
            <SelectTrigger className="h-9 w-[170px] rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40">
              <span className="flex items-center gap-1.5 truncate">
                <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue placeholder="Chọn ngành hàng" />
              </span>
            </SelectTrigger>
            <SelectContent className="font-sans text-sm">
              <SelectItem value="all">Tất cả ngành hàng</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Toggle Tồn thấp */}
          <Button
            variant={filters.lowStockOnly ? 'destructive' : 'outline'}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                lowStockOnly: !prev.lowStockOnly,
              }))
            }
            className={`h-9 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 px-3 ${
              filters.lowStockOnly
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
                : 'bg-slate-50/40 border-slate-200 text-slate-700'
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${filters.lowStockOnly ? 'text-rose-600' : 'text-slate-400'}`} />
            {filters.lowStockOnly ? 'Tồn Kho Thấp' : 'Tồn thấp'}
          </Button>

          {(filters.query || filters.branchId !== null || filters.category !== 'all' || filters.lowStockOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ query: '', branchId: null, category: 'all', lowStockOnly: false })}
              className="h-9 text-sm font-medium text-slate-400 hover:text-slate-700 px-2 rounded-lg"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* 📋 Bảng dữ liệu chính */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs overflow-hidden p-3">
        <CustomTable<WarehouseProduct>
          columns={columns}
          data={filteredProducts}
          loading={isLoading}
          enablePagination={true}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="Kho của bạn hiện tại chưa có sản phẩm phù hợp với bộ lọc."
          className="h-[calc(100vh-345px)]"
        />
      </div>

      <WarehouseSyncHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        logs={syncLogs}
        isLoading={isLoadingLogs}
        onRefresh={loadSyncLogs}
      />
    </div>
  );
}
