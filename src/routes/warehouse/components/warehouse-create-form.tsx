import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
} from '@shared/ui';
import { CreatableCombobox } from '@shared/components/custom/creatable-combobox';
import type { Branch, WarehouseProductCreateInput } from '../../../types/warehouse.types';
import { Barcode, Package, FolderTree, Coins, Boxes, Warehouse, X, Plus } from 'lucide-react';

const MANUAL_BRANCH_VALUE = 'manual';

const warehouseCreateSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã sản phẩm'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên sản phẩm'),
  categoryName: z.string().trim().optional(),
  basePrice: z.number().min(0, 'Giá bán không được âm'),
  onHand: z.number().min(0, 'Tồn kho không được âm'),
  branchId: z.string(),
  branchName: z.string().trim().min(1, 'Vui lòng chọn hoặc nhập tên kho mới'),
});

type WarehouseCreateFormValues = z.infer<typeof warehouseCreateSchema>;

interface WarehouseCreateFormProps {
  branches: Branch[];
  onCreate: (values: WarehouseProductCreateInput) => void;
  onCancel: () => void;
}

export default function WarehouseCreateForm({
  branches,
  onCreate,
  onCancel,
}: WarehouseCreateFormProps) {
  const defaultBranchId = useMemo(
    () => (branches.length > 0 ? String(branches[0].id) : MANUAL_BRANCH_VALUE),
    [branches],
  );

  const defaultBranchName = useMemo(
    () => (branches.length > 0 ? branches[0].branchName : ''),
    [branches],
  );

  const form = useForm<WarehouseCreateFormValues>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      categoryName: '',
      basePrice: 0,
      onHand: 0,
      branchId: defaultBranchId,
      branchName: defaultBranchName,
    },
  });

  useEffect(() => {
    form.reset({
      code: '',
      name: '',
      categoryName: '',
      basePrice: 0,
      onHand: 0,
      branchId: defaultBranchId,
      branchName: defaultBranchName,
    });
  }, [defaultBranchId, defaultBranchName, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const selectedBranch = branches.find((branch) => String(branch.id) === values.branchId);

    onCreate({
      code: values.code,
      name: values.name,
      categoryName: values.categoryName || undefined,
      basePrice: values.basePrice,
      onHand: values.onHand,
      branchId: selectedBranch ? selectedBranch.id : null,
      branchName: selectedBranch?.branchName ?? values.branchName,
    });

    form.reset({
      code: '',
      name: '',
      categoryName: '',
      basePrice: 0,
      onHand: 0,
      branchId: defaultBranchId,
      branchName: defaultBranchName,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Product Information */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Package className="h-4.5 w-4.5 text-primary" />
            Thông tin sản phẩm
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Mã sản phẩm</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        placeholder="Nhập mã sản phẩm"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ngành hàng</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        placeholder="Ví dụ: Điện thoại iPhone"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Tên sản phẩm</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        placeholder="Nhập tên sản phẩm"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 2: Storage & Pricing */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Warehouse className="h-4.5 w-4.5 text-primary" />
            Lưu trữ & Giá bán
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Giá bán (đ)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        placeholder="0"
                        className="pl-9 pr-7 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm text-right transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/80">₫</span>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="onHand"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Số lượng tồn</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        placeholder="0"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm text-right transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branchName"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Kho áp dụng</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <CreatableCombobox
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const matchedBranch = branches.find(
                            (b) => b.branchName.toLowerCase() === value.trim().toLowerCase()
                          );
                          if (matchedBranch) {
                            form.setValue('branchId', String(matchedBranch.id));
                          } else {
                            form.setValue('branchId', MANUAL_BRANCH_VALUE);
                          }
                        }}
                        onAddNew={(value) => {
                          field.onChange(value);
                          form.setValue('branchId', MANUAL_BRANCH_VALUE);
                        }}
                        options={branches.map((b) => b.branchName)}
                        placeholder="Chọn kho hoặc gõ..."
                        addNewText="Tạo kho mới"
                        emptyHint="Nhập tên kho mới nếu chưa có"
                        containerClassName="pl-8 rounded-lg bg-background border-border min-h-9 flex items-center focus-within:ring-1 focus-within:ring-primary/30"
                        className="h-9 border-0 bg-transparent ring-0 focus-visible:ring-0 text-sm"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-lg px-4 h-9 flex items-center gap-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-97 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Hủy
          </Button>
          <Button
            type="submit"
            className="rounded-lg px-5 h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-97 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Tạo sản phẩm
          </Button>
        </div>
      </form>
    </Form>
  );
}

