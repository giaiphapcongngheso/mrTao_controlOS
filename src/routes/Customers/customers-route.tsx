import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
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
  HeartHandshake,
  Plus,
  History,
  RefreshCw,
  Search,
  User,
  Coins,
  Award,
  Trash2,
  Edit2,
  Eye,
  AlertTriangle,
  Check,
  X,
  Users,
} from 'lucide-react';
import { ModuleHeader, CustomTable } from '@shared/components';
import { NumberRangePicker } from '../../../share/components/custom/number-range-picker';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { ActionStack } from '../../../share/components/custom/action-stack';
import type { ColumnDef } from '@tanstack/react-table';
import type { Customer, CustomerSyncLog } from '../../types/customer.types';
import { useCustomerData } from './hooks/use-customer-data';
import CustomerDialog from './components/customer-dialog';
import CustomerSyncHistoryDrawer from './components/customer-sync-history-drawer';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export default function CustomersRoute() {
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [syncSummary, setSyncSummary] = useState<CustomerSyncLog | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const {
    customers,
    groups,
    filteredCustomers,
    filters,
    isLoading,
    error,
    syncTime,
    totalCount,
    totalDebt,
    topPointsCustomer,
    setFilters,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    syncDataPreview,
    tempSyncedData,
    saveSyncData,
    discardTempData,
    syncLogs,
    isLoadingLogs,
    loadSyncLogs,
  } = useCustomerData();

  const columns = useMemo<ColumnDef<Customer>[]>(() => {
    return [
      {
        accessorKey: 'code',
        header: 'Mã khách hàng',
        size: 130,
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
          const customer = row.original;
          return (
            <div className="flex items-center font-sans">
              <span className="font-sans bg-slate-50 text-slate-700 border border-slate-200/60 rounded-md px-2 py-0.5 text-xs font-semibold select-all">
                {customer.code}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên khách hàng',
        size: 200,
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
          const customer = row.original;
          return (
            <div className="text-left font-sans text-sm py-0.5">
              <div className="text-sm font-bold text-slate-800 leading-snug line-clamp-1">
                {customer.name}
              </div>
              {customer.phone && (
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  SĐT: {customer.phone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'groupName',
        header: 'Nhóm khách hàng',
        size: 150,
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            const options = [
              { label: 'Tất cả nhóm', value: 'all' },
              ...groups.map((g) => ({ label: g.name, value: g.name })),
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
          const customer = row.original;
          return (
            <div className="text-left font-sans text-sm font-medium text-slate-600">
              {customer.groupName || 'Khác'}
            </div>
          );
        },
      },
      {
        accessorKey: 'source',
        header: 'Nguồn',
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
          const customer = row.original;
          const isSynced = customer.source !== 'manual';
          return (
            <div className="flex justify-start font-sans text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold border border-solid ${
                  isSynced
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
        accessorKey: 'debt',
        header: 'Dư nợ hiện tại',
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
          const customer = row.original;
          const hasDebt = (customer.debt ?? 0) > 0;
          return (
            <div className="text-right font-sans font-bold pr-2">
              <span className={hasDebt ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100' : 'text-slate-650'}>
                {CURRENCY_FORMATTER.format(customer.debt ?? 0)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'points',
        header: 'Điểm tích lũy',
        size: 120,
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
          const customer = row.original;
          return (
            <div className="text-right font-sans font-bold text-slate-700 pr-4">
              {(customer.points ?? 0).toLocaleString('vi-VN')}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 190,
        meta: {
          sticky: 'right',
        },
        cell: ({ row }) => {
          const customer = row.original;
          const isManual = customer.source === 'manual';
          return (
            <ActionStack
              className="font-sans"
              gap={1}
              actions={[
                {
                  key: 'view',
                  element: (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-slate-750 hover:text-indigo-650 hover:bg-indigo-50/50 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                        setFormMode('view');
                        setShowForm(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      Xem
                    </Button>
                  ),
                },
                {
                  key: 'edit',
                  element: (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-slate-750 hover:text-indigo-650 hover:bg-indigo-50/50 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                        setFormMode('edit');
                        setShowForm(true);
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
                      className={`h-8 px-2 rounded-xl font-bold text-xs flex items-center gap-1 ${
                        isManual
                          ? 'text-rose-650 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                          : 'text-slate-350 cursor-not-allowed hover:bg-transparent'
                      }`}
                      disabled={!isManual}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isManual && confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.name}"?`)) {
                          void deleteCustomer(customer.id);
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
      },
    ];
  }, [deleteCustomer, groups]);

  const statCardsData = [
    {
      label: 'Tổng khách hàng:',
      value: totalCount.toLocaleString('vi-VN'),
      icon: <Users className="h-3.5 w-3.5" />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      hoverBorder: 'hover:border-indigo-150',
      valueColor: 'text-slate-850',
    },
    {
      label: 'Tổng dư nợ hiện tại:',
      value: CURRENCY_FORMATTER.format(totalDebt),
      icon: <Coins className="h-3.5 w-3.5" />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      hoverBorder: 'hover:border-rose-150',
      valueColor: totalDebt > 0 ? 'text-rose-600' : 'text-slate-650',
    },
    {
      label: 'Khách hàng VIP (Điểm cao nhất):',
      value: topPointsCustomer
        ? `${topPointsCustomer.name} (${(topPointsCustomer.points ?? 0).toLocaleString('vi-VN')} đ)`
        : 'Chưa có dữ liệu',
      icon: <Award className="h-3.5 w-3.5" />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      hoverBorder: 'hover:border-amber-150',
      valueColor: 'text-amber-650',
    },
  ];

  return (
    <div className="space-y-3 font-sans text-sm">
      {/* Module Title Section */}
      <ModuleHeader
        title="Quản lý khách hàng KiotViet"
        description="Theo dõi lịch sử giao dịch, dư nợ tích lũy và đồng bộ tự động thông tin khách hàng từ KiotViet."
        icon={<HeartHandshake className="h-5 w-5 text-slate-800" />}
      >
        <div className="flex flex-wrap gap-2 w-full sm:w-auto md:justify-end">
          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm font-bold border-indigo-200/80 bg-indigo-50/30 text-indigo-750 hover:bg-indigo-50/70 hover:border-indigo-300 hover:text-indigo-800 transition duration-200 cursor-pointer shadow-6xs flex items-center"
            onClick={() => {
              setEditingCustomer(null);
              setFormMode('create');
              setShowForm(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
            Tạo khách hàng
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
            onClick={() => void syncDataPreview()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang đọc...' : 'Đồng bộ KiotViet'}
          </Button>
        </div>
      </ModuleHeader>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {statCardsData.map((card, idx) => (
          <Card
            key={idx}
            className={`p-2 rounded-xl border shadow-3xs transition-all duration-300 group overflow-hidden relative border-slate-200/80 bg-white ${card.hoverBorder}`}
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

      {/* Sync Preview Banner */}
      {tempSyncedData && (
        <Card className="p-0 border-amber-200 bg-amber-50 rounded-2xl text-amber-900 shadow-3xs animate-fade-in">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 shrink-0">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Chế độ xem trước đồng bộ Khách hàng</div>
                <div className="text-sm text-amber-700/90 mt-0.5">
                  Hệ thống đang hiển thị dữ liệu khách hàng mới từ KiotViet (xem trước). Vui lòng nhấn{' '}
                  <span className="font-bold">"Lưu vào hệ thống"</span> để áp dụng ghi đè Firestore hoặc{' '}
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
                    const log = await saveSyncData();
                    if (log) {
                      setSyncSummary(log);
                      setShowSummaryDialog(true);
                    }
                  } catch (err) {
                    // Handled inside hook
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

      {/* Main Filter & search bar */}
      <div className="flex flex-col md:flex-row items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/95 shadow-3xs font-sans">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            className="pl-9 h-9 rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40 transition focus-visible:bg-white"
            placeholder="Tìm theo tên, mã hoặc số điện thoại..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-2/3 md:justify-end">
          {/* Group dropdown */}
          <Select
            value={filters.groupId === null ? 'all' : String(filters.groupId)}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                groupId: val === 'all' ? null : Number(val),
              }))
            }
          >
            <SelectTrigger className="h-9 w-[200px] rounded-xl border-slate-200 text-sm font-medium text-slate-700 bg-slate-50/40">
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <SelectValue placeholder="Chọn nhóm khách hàng" />
              </span>
            </SelectTrigger>
            <SelectContent className="font-sans text-sm">
              <SelectItem value="all">Tất cả nhóm</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Debt only filter toggle button */}
          <Button
            variant={filters.hasDebtOnly ? 'destructive' : 'outline'}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                hasDebtOnly: !prev.hasDebtOnly,
              }))
            }
            className={`h-9 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 px-3 ${
              filters.hasDebtOnly
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
                : 'bg-slate-50/40 border-slate-200 text-slate-700'
            }`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${filters.hasDebtOnly ? 'text-rose-600' : 'text-slate-400'}`} />
            {filters.hasDebtOnly ? 'Khách Đang Nợ' : 'Khách nợ'}
          </Button>

          {(filters.query || filters.groupId !== null || filters.hasDebtOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ query: '', groupId: null, hasDebtOnly: false })}
              className="h-9 text-sm font-medium text-slate-400 hover:text-slate-700 px-2 rounded-lg"
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full min-w-0">
        <CustomTable<Customer>
          columns={columns}
          data={filteredCustomers}
          loading={isLoading}
          enablePagination={true}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="Chưa có khách hàng nào trong hệ thống hoặc không khớp với bộ lọc."
          className="h-[calc(100vh-320px)]"
          getRowId={(c) => c.id}
        />
      </div>

      {/* Edit/Create/View Dialog Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl rounded-2xl font-sans">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[16px] font-bold text-slate-800">
              {formMode === 'create'
                ? 'Tạo mới khách hàng thủ công'
                : formMode === 'edit'
                ? 'Chỉnh sửa thông tin khách hàng'
                : 'Chi tiết thông tin khách hàng'}
            </DialogTitle>
          </DialogHeader>
          <CustomerDialog
            mode={formMode}
            initialData={editingCustomer}
            onSubmit={(values) => {
              if (formMode === 'create') {
                void createCustomer(values);
              } else if (formMode === 'edit' && editingCustomer) {
                void updateCustomer(editingCustomer.id, values);
              }
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Sync history timeline drawer */}
      <CustomerSyncHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        logs={syncLogs}
        isLoading={isLoadingLogs}
        onRefresh={loadSyncLogs}
      />

      {/* Sync success summary modal */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl font-sans text-center border-none shadow-2xl p-6 bg-white overflow-hidden">
          {/* Decorative Top Accent Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

          <div className="flex flex-col items-center pt-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100/80 text-emerald-600 shadow-sm mb-3">
              <Check className="h-7 w-7 stroke-[3px]" />
            </div>
            <DialogTitle className="text-[16px] font-bold text-slate-800 tracking-tight">
              Đồng bộ khách hàng thành công
            </DialogTitle>
            <p className="text-sm font-semibold text-slate-400 mt-1">
              Dữ liệu được cập nhật từ KiotViet vào lúc:{' '}
              <span className="font-extrabold text-slate-655">
                {syncSummary ? new Date(syncSummary.timestamp).toLocaleTimeString('vi-VN') : ''}
              </span>
            </p>
          </div>

          <div className="mt-5 space-y-4 font-sans text-slate-600 text-left">
            <Card className="p-0 border-emerald-100/60 bg-emerald-50/15 rounded-2xl relative overflow-hidden transition-all duration-300">
              <CardContent className="p-4">
                <div className="text-sm text-emerald-800 font-extrabold uppercase tracking-wider">Khách hàng</div>
                <div className="mt-3.5 space-y-2 text-sm font-semibold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Tổng số đồng bộ</span>
                    <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                      {syncSummary?.totalSynced}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Lưu trữ Firestore</span>
                    <span className="text-sm font-extrabold text-slate-650 bg-slate-100 px-2 py-0.5 rounded-lg">
                      Hoàn thành
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-0 border-slate-100/80 bg-slate-50/80 rounded-2xl shadow-none">
              <CardContent className="p-3.5 flex gap-2.5 text-sm text-slate-650 leading-relaxed font-medium">
                <span className="shrink-0 text-slate-400 text-sm mt-0.5">ℹ</span>
                <span className="text-sm text-slate-500 font-medium leading-relaxed">
                  {syncSummary?.summary || 'Đã cập nhật toàn bộ danh sách khách hàng mới nhất từ gian hàng KiotViet.'}
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              className="rounded-xl px-8 h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              onClick={() => setShowSummaryDialog(false)}
            >
              Hoàn tất
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
