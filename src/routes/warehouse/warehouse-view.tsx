import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import WarehouseSyncForm from './components/warehouse-sync-form';
import WarehouseCreateForm from './components/warehouse-create-form';
import { useWarehouseData } from './hooks/use-warehouse-data';

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export default function WarehouseView() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
  } = useWarehouseData();

  const lowStockCount = useMemo(
    () =>
      filteredProducts.filter((product) => {
        const onHand = (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);
        return onHand <= 5;
      }).length,
    [filteredProducts],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Quản lý kho hàng</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateForm(true)}>
              Tạo sản phẩm
            </Button>
            <Button variant="outline" onClick={() => setShowConfigForm((prev) => !prev)}>
              {showConfigForm ? 'Đóng cấu hình' : 'Mở cấu hình'}
            </Button>
            <Button onClick={() => void syncData()} disabled={isLoading}>
              {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ nhanh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p>Tồn kho: <strong>{totalOnHand.toLocaleString('vi-VN')}</strong></p>
            <p>Giá trị kho: <strong>{CURRENCY_FORMATTER.format(totalValue)}</strong></p>
            <p>Sản phẩm thấp tồn: <strong>{lowStockCount}</strong></p>
          </div>
          {syncTime && <p className="mt-2 text-xs text-slate-500">Lần đồng bộ gần nhất: {syncTime}</p>}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo sản phẩm kho</DialogTitle>
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

      {showConfigForm && (
        <WarehouseSyncForm
          defaultValues={credentials}
          isLoading={isLoading}
          onSubmit={(values) => {
            void syncData(values);
          }}
        />
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Danh sách hàng hóa</CardTitle>
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              value={filters.query}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  query: event.target.value,
                }))
              }
              placeholder="Tìm theo tên hoặc mã"
            />

            <Select
              value={filters.branchId === null ? 'all' : String(filters.branchId)}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  branchId: value === 'all' ? null : Number(value),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chi nhánh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  category: value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ngành hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành hàng</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={filters.lowStockOnly ? 'default' : 'outline'}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  lowStockOnly: !prev.lowStockOnly,
                }))
              }
            >
              Chỉ xem tồn thấp
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có sản phẩm. Hãy đồng bộ dữ liệu hoặc tạo mới trong kho.</p>
          ) : (
            filteredProducts.map((product) => {
              const onHand = (product.inventories ?? []).reduce((sum, inventory) => sum + inventory.onHand, 0);
              const isLow = onHand <= 5;

              return (
                <div key={product.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">{product.name}</h3>
                      <p className="text-xs text-slate-500">{product.code} • {product.categoryName ?? 'Khác'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={product.source === 'manual' ? 'secondary' : 'outline'}>
                        {product.source === 'manual' ? 'Tự tạo' : 'Đồng bộ'}
                      </Badge>
                      <Badge variant={isLow ? 'destructive' : 'outline'}>
                        {isLow ? 'Tồn thấp' : 'Ổn định'}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-700">{CURRENCY_FORMATTER.format(product.basePrice)}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Tổng tồn: <strong>{onHand}</strong></p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
