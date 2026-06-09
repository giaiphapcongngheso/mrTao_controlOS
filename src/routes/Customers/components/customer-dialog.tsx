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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@shared/ui';
import type { Customer } from '../../../types/customer.types';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Coins,
  Award,
  Activity,
  Barcode,
  Calendar,
  X,
  Check,
  Plus,
} from 'lucide-react';

const customerSchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên khách hàng'),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthDate: z.string().trim().optional(),
  debt: z.number(),
  totalSpent: z.number(),
  points: z.number(),
  groupName: z.string().trim().optional(),
  isActive: z.boolean(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: Customer | null;
  onSubmit: (values: Partial<Customer>) => void;
  onCancel: () => void;
}

export default function CustomerDialog({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: CustomerDialogProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isSynced = initialData?.source === 'synced';

  const defaultValues = useMemo(() => {
    if (initialData) {
      return {
        code: initialData.code || '',
        name: initialData.name,
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        gender: initialData.gender || 'other',
        birthDate: initialData.birthDate || '',
        debt: initialData.debt ?? 0,
        totalSpent: initialData.totalSpent ?? 0,
        points: initialData.points ?? 0,
        groupName: initialData.groupName || 'Khác',
        isActive: initialData.isActive !== false,
      };
    }
    return {
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      gender: 'other' as const,
      birthDate: '',
      debt: 0,
      totalSpent: 0,
      points: 0,
      groupName: 'Khác',
      isActive: true,
    };
  }, [initialData]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      ...values,
      code: values.code || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      birthDate: values.birthDate || undefined,
      groupName: values.groupName || undefined,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
        {/* Block 1: Personal Information */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <User className="h-4.5 w-4.5 text-primary" />
            Thông tin khách hàng
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control as any}
              name="code"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Mã khách hàng</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        disabled={isView || (isEdit && isSynced)}
                        placeholder={isSynced ? 'Mã từ KiotViet' : 'Hệ thống tự tạo nếu bỏ trống'}
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Tên khách hàng *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        disabled={isView}
                        placeholder="Nhập tên khách hàng"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="gender"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Giới tính</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isView}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="bg-background focus:ring-1 focus:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent className="font-sans text-sm">
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ngày sinh</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <Input
                        type="date"
                        {...field}
                        disabled={isView}
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

        {/* Block 2: Contact Information */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Phone className="h-4.5 w-4.5 text-primary" />
            Thông tin liên lạc
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control as any}
              name="phone"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Số điện thoại</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        disabled={isView}
                        placeholder="Nhập số điện thoại"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        type="email"
                        {...field}
                        disabled={isView}
                        placeholder="Nhập địa chỉ email"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Địa chỉ</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-[10px] h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        disabled={isView}
                        placeholder="Nhập địa chỉ của khách hàng"
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

        {/* Block 3: Transaction & Loyalty Data */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Coins className="h-4.5 w-4.5 text-primary" />
            Giao dịch & Tích lũy
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control as any}
              name="groupName"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Nhóm khách hàng</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        disabled={isView || (isEdit && isSynced)}
                        placeholder="Ví dụ: VIP, Khách lẻ"
                        className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="debt"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Dư nợ (đ)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        disabled={isView || (isEdit && isSynced)}
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
              control={form.control as any}
              name="totalSpent"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Tổng chi tiêu (đ)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        disabled={isView || (isEdit && isSynced)}
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
              control={form.control as any}
              name="points"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Điểm tích lũy</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        disabled={isView || (isEdit && isSynced)}
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
              control={form.control as any}
              name="isActive"
              render={({ field }) => (
                <FormItem className="md:col-span-2 flex flex-col justify-end pb-1.5 pl-2">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isView}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </FormControl>
                    <div className="text-left">
                      <FormLabel className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                        <Activity className="h-3.5 w-3.5 text-slate-500" />
                        Trạng thái hoạt động
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {field.value ? 'Tài khoản khách hàng đang hoạt động' : 'Tài khoản khách hàng đang bị khóa'}
                      </p>
                    </div>
                  </div>
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
            className="rounded-lg px-4 h-9 flex items-center gap-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-97 cursor-pointer animate-fade-in"
          >
            <X className="h-4 w-4" />
            {isView ? 'Đóng' : 'Hủy'}
          </Button>

          {!isView && (
            <Button
              type="submit"
              className="rounded-lg px-5 h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-97 cursor-pointer"
            >
              {isEdit ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEdit ? 'Cập nhật' : 'Tạo khách hàng'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
