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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui';
import type { Branch, WarehouseProductCreateInput } from '../types/warehouse.types';

const MANUAL_BRANCH_VALUE = 'manual';

const warehouseCreateSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã sản phẩm'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên sản phẩm'),
  categoryName: z.string().trim().optional(),
  basePrice: z.number().min(0, 'Giá bán không được âm'),
  onHand: z.number().min(0, 'Tồn kho không được âm'),
  branchId: z.string(),
  branchName: z.string().trim(),
}).superRefine((values, ctx) => {
  if (values.branchId === MANUAL_BRANCH_VALUE && values.branchName.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Vui lòng nhập tên kho',
      path: ['branchName'],
    });
  }
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

  const form = useForm<WarehouseCreateFormValues>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      categoryName: '',
      basePrice: 0,
      onHand: 0,
      branchId: defaultBranchId,
      branchName: '',
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
      branchName: '',
    });
  }, [defaultBranchId, form]);

  const selectedBranchId = form.watch('branchId');

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
      branchName: '',
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mã sản phẩm</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập mã sản phẩm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên sản phẩm</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập tên sản phẩm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngành hàng</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ví dụ: Điện thoại iPhone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giá bán (đ)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={String(field.value)}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="onHand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số lượng tồn</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={String(field.value)}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kho áp dụng</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== MANUAL_BRANCH_VALUE) {
                        form.setValue('branchName', '');
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn kho" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.branchName}
                        </SelectItem>
                      ))}
                      <SelectItem value={MANUAL_BRANCH_VALUE}>Tạo kho mới</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedBranchId === MANUAL_BRANCH_VALUE && (
            <FormField
              control={form.control}
              name="branchName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Tên kho</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nhập tên kho" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit">Tạo sản phẩm</Button>
        </div>
      </form>
    </Form>
  );
}
