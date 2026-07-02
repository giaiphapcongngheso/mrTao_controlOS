import { useMemo, useState } from 'react';
import { Alert, AlertDescription, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui';
import { AlertTriangle, Building, Check, Coins, Copy, Edit2, History, Layers, Plus, RefreshCw, Search, Tag, Trash2, X } from 'lucide-react';
import WarehouseCreateForm from './components/warehouse-create-form';
import WarehouseSyncHistoryDrawer from './components/warehouse-sync-history-drawer';
import { useWarehouseData } from './hooks/use-warehouse-data';
import { ModuleHeader, CustomTable } from '@shared/components';
import { NumberRangePicker } from '../../../share/components/custom/number-range-picker';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { ActionStack } from '../../../share/components/custom/action-stack';
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
  const [editingProduct, setEditingProduct] = useState<WarehouseProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<WarehouseProduct | null>(null);
  const {
    branches,
    categories,
    filteredProducts,
    filters,
    isLoading,
    error,
    syncTime,
    totalOnHand,
    totalValue,
    totalCostValue,
    setFilters,
    createProduct,
    updateProduct,
    deleteProduct,
    syncData,
    tempSyncedData,
    saveTempDataToSystem,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  } = useWarehouseData();

  const activeProduct = useMemo(
    () => filteredProducts.find((p) => p.id === selectedProduct?.id) || null,
    [filteredProducts, selectedProduct],
  );

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

  const columns = useMemo<ColumnDef<WarehouseProduct>[]>(() => {
    const baseCols: ColumnDef<WarehouseProduct>[] = [
      {
        accessorKey: 'code',
        header: 'Mã hàng hóa',
        size: 120,
        meta: {
          sticky: 'left',
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
          sticky: 'left',
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
            <div className="text-left font-sans text-sm py-0.5">
              <div className="text-sm font-bold text-slate-800 leading-snug line-clamp-1">{product.name}</div>
              {product.categoryName && (
                <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mt-0.5">
                  {product.categoryName}
                </div>
              )}
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
            const options = [
              { label: 'Tất cả', value: 'all' },
              { label: 'KiotViet', value: 'synced' },
              { label: 'Tự tạo', value: 'manual' },
            ];

            return (
              <CustomSelect
                options={options}
                value={val}
                onChangeValue={(value) => column.setFilterValue(value === 'all' ? undefined : value)}
                clearable={false}
                className="h-8 text-xs font-semibold border-slate-200 text-slate-700 bg-white"
              />
            );
          },
        },
        cell: ({ row }) => {
          const product = row.original;
          const isSynced = product.source !== 'manual';
          return (
            <div className="flex justify-start font-sans text-sm">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-semibold border border-solid ${isSynced
                  ? 'bg-blue-50/70 border-blue-200 text-blue-700'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
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
        header: filters.branchId
          ? `Tồn (${branches.find((b) => b.id === filters.branchId)?.branchName || 'Chi nhánh'})`
          : 'Tổng tồn kho',
        size: 110,
        accessorFn: (product) => {
          if (filters.branchId !== null) {
            const inv = (product.inventories ?? []).find((i) => i.branchId === filters.branchId);
            return inv ? inv.onHand : 0;
          }
          return (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);
        },
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
          const onHand = filters.branchId !== null
            ? ((product.inventories ?? []).find((i) => i.branchId === filters.branchId)?.onHand ?? 0)
            : ((product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0));
          const isLow = onHand <= 5;
          return (
            <div className="flex items-center justify-start font-sans text-sm">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold uppercase tracking-wider border border-solid ${isLow
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
    ];

    if (!activeProduct) {
      baseCols.push({
        id: 'actions',
        header: 'Thao tác',
        size: 140,
        cell: ({ row }) => {
          const product = row.original;
          const isManual = product.source === 'manual';
          return (
            <ActionStack
              className="font-sans"
              gap={1.5}
              actions={[
                {
                  key: 'edit',
                  element: (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-slate-700 hover:text-indigo-650 hover:bg-indigo-50/60 rounded-xl font-bold text-sm transition-all flex items-center gap-1 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingProduct(product);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      Sửa
                    </Button>
                  ),
                },
                {
                  key: 'delete',
                  element: (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 px-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1 ${isManual
                        ? 'text-rose-650 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                        : 'text-slate-350 cursor-not-allowed hover:bg-transparent'
                        }`}
                      disabled={!isManual}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isManual && confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`)) {
                          void deleteProduct(product.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </Button>
                  ),
                },
              ]}
            />
          );
        },
      });
    }

    return baseCols;
  }, [activeProduct, branches, deleteProduct, filters.branchId]);

  const statCardsData = [
    {
      label: 'Tổng tồn kho:',
      value: totalOnHand.toLocaleString('vi-VN'),
      icon: <Layers className="h-3.5 w-3.5" />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      hoverBorder: 'hover:border-indigo-150',
      valueColor: 'text-slate-850',
    },
    {
      label: 'Giá trị bán:',
      value: CURRENCY_FORMATTER.format(totalValue),
      icon: <Coins className="h-3.5 w-3.5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      hoverBorder: 'hover:border-emerald-150',
      valueColor: 'text-emerald-650',
    },
    {
      label: 'Giá trị gốc:',
      value: CURRENCY_FORMATTER.format(totalCostValue),
      icon: <Coins className="h-3.5 w-3.5" />,
      iconBg: 'bg-slate-100/80',
      iconColor: 'text-slate-450',
      hoverBorder: 'hover:border-slate-300',
      valueColor: 'text-slate-700',
    },
    {
      label: 'Sắp hết hàng (≤ 5):',
      value: lowStockCount,
      icon: <AlertTriangle className={`h-3.5 w-3.5 ${lowStockCount > 0 ? 'animate-pulse' : ''}`} />,
      iconBg: lowStockCount > 0 ? 'bg-rose-100' : 'bg-slate-100',
      iconColor: lowStockCount > 0 ? 'text-rose-500' : 'text-slate-450',
      hoverBorder: lowStockCount > 0 ? 'hover:border-rose-300' : 'hover:border-rose-100',
      cardBgBorder: lowStockCount > 0 ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200/80 bg-white',
      valueColor: lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800',
    },
  ];

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
            className="rounded-xl h-9 text-sm font-bold border-indigo-200/80 bg-indigo-50/30 text-indigo-750 hover:bg-indigo-50/70 hover:border-indigo-300 hover:text-indigo-800 transition duration-200 cursor-pointer shadow-6xs flex items-center"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
            Tạo sản phẩm
          </Button>

          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm font-bold border-slate-200 bg-white text-slate-600 hover:bg-slate-50/80 hover:border-slate-300 hover:text-slate-800 transition duration-200 cursor-pointer flex items-center"
            onClick={() => setShowHistoryDrawer(true)}
          >
            <History className="mr-1.5 h-3.5 w-3.5 text-slate-450" />
            Lịch sử đồng bộ
          </Button>

          <Button
            className="rounded-xl h-9 text-sm font-bold shadow-6xs bg-emerald-600 hover:bg-emerald-700 hover:shadow-2xs text-white transition duration-200 cursor-pointer flex items-center border-none"
            onClick={() => void syncData()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ KiotViet'}
          </Button>
        </div>
      </ModuleHeader>

      {/* 📊 Thống kê Số liệu siêu tinh gọn */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCardsData.map((card, idx) => (
          <Card
            key={idx}
            className={`p-2 rounded-xl border shadow-3xs transition-all duration-300 group overflow-hidden relative ${card.cardBgBorder || 'border-slate-200/80 bg-white'
              } ${card.hoverBorder}`}
          >
            <CardContent className="p-2 px-3.5 flex items-center justify-between gap-2.5 w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200 ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
                <span className="text-xs font-semibold text-slate-500 truncate">{card.label}</span>
              </div>
              <span className={`text-sm font-bold shrink-0 font-sans ${card.valueColor}`}>
                {card.value}
              </span>
            </CardContent>
          </Card>
        ))}
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
        <Card className="p-0 border-amber-200 bg-amber-50 rounded-2xl text-amber-900 shadow-3xs animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 shrink-0">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Chế độ xem trước đồng bộ KiotViet</div>
                <div className="text-sm text-amber-700/90 mt-0.5">
                  Hệ thống đang hiển thị dữ liệu mới từ KiotViet (xem trước). Vui lòng nhấn{' '}
                  <span className="font-bold">"Lưu vào hệ thống"</span> để áp dụng hoặc{' '}
                  <span className="font-bold">"Hủy bỏ"</span> để giữ nguyên dữ liệu hiện tại.
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
          </CardContent>
        </Card>
      )}


      <Dialog open={showCreateForm || !!editingProduct} onOpenChange={(open) => {
        if (!open) {
          setShowCreateForm(false);
          setEditingProduct(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-slate-800">
              {editingProduct ? 'Chỉnh sửa sản phẩm kho' : 'Tạo mới sản phẩm kho'}
            </DialogTitle>
          </DialogHeader>
          <WarehouseCreateForm
            branches={branches}
            initialData={editingProduct}
            onSubmit={(values) => {
              if (editingProduct) {
                void updateProduct(editingProduct.id, values);
              } else {
                void createProduct(values);
              }
              setShowCreateForm(false);
              setEditingProduct(null);
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingProduct(null);
            }}
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
              <Card className="p-0 border-emerald-100/60 bg-emerald-50/15 rounded-2xl relative overflow-hidden transition-all duration-300 hover:bg-emerald-50/25">
                <CardContent className="p-4 text-left">
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
                </CardContent>
              </Card>

              {/* Sản phẩm */}
              <Card className="p-0 border-blue-100/60 bg-blue-50/15 rounded-2xl relative overflow-hidden transition-all duration-300 hover:bg-blue-50/25">
                <CardContent className="p-4 text-left">
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
                </CardContent>
              </Card>
            </div>

            {/* Chi tiết Summary */}
            <Card className="p-0 border-slate-100/80 bg-slate-50/80 rounded-2xl shadow-none">
              <CardContent className="p-3.5 flex gap-2.5 text-left text-sm text-slate-650 leading-relaxed font-medium">
                <span className="shrink-0 text-slate-400 text-sm mt-0.5">ℹ</span>
                <span className="text-sm text-slate-500 font-medium leading-relaxed">{syncSummary?.summary}</span>
              </CardContent>
            </Card>
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
            className={`h-9 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 px-3 ${filters.lowStockOnly
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

      {/* 📋 Bảng dữ liệu chính & Chi tiết sản phẩm (Split-Screen) */}
      <div className="flex flex-col lg:flex-row gap-4 w-full items-start">
        {/* Table container */}
        <div className={`w-full min-w-0 transition-all duration-300 ${activeProduct ? 'lg:w-[63%] xl:w-[66%]' : 'w-full'}`}>
          <CustomTable<WarehouseProduct>
            columns={columns}
            data={filteredProducts}
            loading={isLoading}
            enablePagination={true}
            pageSizeOptions={[10, 20, 50, 100]}
            emptyMessage="Kho của bạn hiện tại chưa có sản phẩm phù hợp với bộ lọc."
            tableMinWidth={800}
            className="h-[calc(100vh-340px)]"
            activeRowId={activeProduct?.id ? String(activeProduct.id) : undefined}
            getRowId={(product) => String(product.id)}
            onRowClick={(row) => setSelectedProduct(row.original)}
          />
        </div>

        {/* Selected Product Details Panel */}
        {activeProduct && (
          <SelectedProductPanel
            product={activeProduct}
            onClose={() => setSelectedProduct(null)}
            onEdit={(prod) => setEditingProduct(prod)}
            onDelete={async (id) => {
              await deleteProduct(id);
              setSelectedProduct(null);
            }}
          />
        )}
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

interface SelectedProductPanelProps {
  product: WarehouseProduct;
  onClose: () => void;
  onEdit: (product: WarehouseProduct) => void;
  onDelete: (id: number) => Promise<void>;
}

function SelectedProductPanel({ product, onClose, onEdit, onDelete }: SelectedProductPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(product.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isManual = product.source === 'manual';
  const totalStock = (product.inventories ?? []).reduce((sum, inv) => sum + inv.onHand, 0);

  return (
    <Card className="w-full lg:w-[37%] xl:w-[34%] rounded-2xl border border-slate-200/80 shadow-3xs bg-white p-4 h-[calc(100vh-340px)] overflow-y-auto sticky top-4 flex flex-col shrink-0 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Chi tiết sản phẩm</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Info */}
      <div className="flex-1 py-4 space-y-4 text-left">
        {/* Title & Code */}
        <div>
          <span className="text-xs font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.5 rounded uppercase tracking-wide inline-block mb-1.5">
            {product.categoryName ?? 'Khác'}
          </span>
          <h3 className="text-sm font-bold text-slate-800 leading-snug break-words">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="bg-slate-50 text-slate-700 border border-slate-200/60 rounded px-2 py-0.5 text-xs font-bold font-mono select-all">
              {product.code}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
              onClick={handleCopyCode}
            >
              {copied ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="h-3 w-3" /> Đã chép
                </span>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Source & Price Summary */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 border border-slate-150 p-3 rounded-xl">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Nguồn gốc</span>
            <span
              className={`inline-flex items-center gap-1.5 mt-1 rounded-full px-2 py-0.5 text-xs font-bold border border-solid ${product.source !== 'manual'
                ? 'bg-blue-50/70 border-blue-200 text-blue-700'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${product.source !== 'manual' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              {product.source !== 'manual' ? 'KiotViet' : 'Tự tạo'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">Tổng tồn kho</span>
            <span className={`inline-flex items-center mt-1 rounded px-2 py-0.5 text-xs font-extrabold border ${totalStock <= 5 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              {totalStock.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Pricing details */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-slate-400">Giá bán:</span>
            <span className="font-extrabold text-indigo-700 text-[15px]">{CURRENCY_FORMATTER.format(product.basePrice)}</span>
          </div>
          {product.cost !== undefined && (
            <div className="flex justify-between items-center text-sm font-semibold border-t border-slate-100/60 pt-1.5">
              <span className="text-slate-400">Giá gốc:</span>
              <span className="font-extrabold text-slate-655">{CURRENCY_FORMATTER.format(product.cost)}</span>
            </div>
          )}
        </div>

        {/* Branch breakdown list */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phân bổ chi nhánh chi tiết</h5>
          {product.inventories && product.inventories.length > 0 ? (
            <div className="space-y-2.5">
              {product.inventories.map((inv, idx) => {
                const maxStock = Math.max(10, totalStock);
                const percentage = totalStock > 0 ? Math.min(100, (inv.onHand / maxStock) * 100) : 0;
                const isLow = inv.onHand <= 5;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[200px] text-slate-650 font-semibold">{inv.branchName}</span>
                      <span className={`font-bold rounded-md px-1.5 py-0.2 border ${isLow ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        {inv.onHand.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-400 text-xs italic py-2 text-center">Chưa phân phối kho</div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-9 text-xs font-bold border-indigo-200 hover:bg-indigo-50/60 text-indigo-750 transition cursor-pointer"
          onClick={() => onEdit(product)}
        >
          <Edit2 className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
          Chỉnh sửa
        </Button>
        <Button
          variant="outline"
          className={`flex-1 rounded-xl h-9 text-xs font-bold border-rose-200 text-rose-650 hover:bg-rose-50 transition cursor-pointer ${!isManual ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
          disabled={!isManual}
          onClick={() => {
            if (isManual && confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`)) {
              void onDelete(product.id);
            }
          }}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Xóa
        </Button>
      </div>
    </Card>
  );
}
