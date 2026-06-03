import { zodResolver } from '@hookform/resolvers/zod';
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
  NumericInput,
} from '@shared/ui';
import {
  MARKETING_CHANNEL_OPTIONS,
  MARKETING_STATUS_OPTIONS,
} from '../../../services/marketing-service';
import type { MarketingCampaignCreateInput } from '../../../types/marketing.types';
import { Megaphone, Share2, Activity, Coins, Calendar, X, Plus, Facebook, MapPin, Star, Play, CalendarDays, Pause, StopCircle } from 'lucide-react';
import { DatePicker } from '../../../../share/components/custom/date-picker';

const marketingCreateSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên chiến dịch'),
  channel: z.enum(MARKETING_CHANNEL_OPTIONS),
  budget: z.number().min(100000, 'Ngân sách tối thiểu 100.000đ'),
  spent: z.number().min(0, 'Số tiền chi tiêu không hợp lệ'),
  status: z.enum(MARKETING_STATUS_OPTIONS),
  startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
});

type MarketingCreateFormValues = z.infer<typeof marketingCreateSchema>;

const DEFAULT_VALUES: MarketingCreateFormValues = {
  name: '',
  channel: MARKETING_CHANNEL_OPTIONS[0],
  budget: 5000000,
  spent: 0,
  status: 'scheduled',
  startDate: '',
  endDate: '',
};

interface MarketingCreateFormProps {
  onCreate: (values: MarketingCampaignCreateInput) => void;
  onCancel: () => void;
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .78.1v-3.5a6.44 6.44 0 0 0-3.09.77 6.33 6.33 0 0 0-3.23 5.56 6.34 6.34 0 0 0 10.94 4.43 6.27 6.27 0 0 0 1.62-4.4V7.87a8.21 8.21 0 0 0 5.28 1.89v-3.4a4.78 4.78 0 0 1-1.42-.27z" />
    </svg>
  );
}

export function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M8 9h8l-8 6h8" />
    </svg>
  );
}

export const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Facebook': Facebook,
  'TikTok': TikTokIcon,
  'Zalo': ZaloIcon,
  'Google Maps': MapPin,
  'KOL/KOC': Star,
};

const CHANNEL_LABEL: Record<string, string> = {
  'Facebook': 'Facebook',
  'TikTok': 'TikTok',
  'Zalo': 'Zalo',
  'Google Maps': 'Google Maps',
  'KOL/KOC': 'KOL / KOC',
};

export const CHANNEL_COLORS: Record<string, string> = {
  'Facebook': 'text-blue-600',
  'TikTok': 'text-pink-500',
  'Zalo': 'text-sky-500',
  'Google Maps': 'text-red-500',
  'KOL/KOC': 'text-purple-500',
};

export const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  active: Play,
  scheduled: CalendarDays,
  paused: Pause,
  ended: StopCircle,
};

export const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-500',
  scheduled: 'text-amber-500',
  paused: 'text-orange-500',
  ended: 'text-slate-500',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang chạy',
  scheduled: 'Đã lên lịch',
  paused: 'Tạm dừng',
  ended: 'Kết thúc',
};

const parseStringToDate = (val: string) => {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
};

const formatDateToString = (date: Date | undefined) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MarketingCreateForm({ onCreate, onCancel }: MarketingCreateFormProps) {
  const form = useForm<MarketingCreateFormValues>({
    resolver: zodResolver(marketingCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const handleSubmit = form.handleSubmit((values) => {
    onCreate(values);
    form.reset(DEFAULT_VALUES);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Campaign Basic Info */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Megaphone className="h-4.5 w-4.5 text-primary" />
            Thông tin chiến dịch
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Tên chiến dịch</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Megaphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        placeholder="Nhập tên chiến dịch quảng cáo"
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
              name="channel"
              render={({ field }) => {
                const SelectedIcon = CHANNEL_ICONS[field.value] || Share2;
                const iconColor = CHANNEL_COLORS[field.value] || 'text-muted-foreground/60';
                return (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="text-xs font-medium text-muted-foreground">Kênh quảng cáo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <SelectedIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-200 ${iconColor}`} />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full pl-9 bg-background focus:ring-1 focus:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all">
                            <span className="truncate block text-left">
                              {CHANNEL_LABEL[field.value] || field.value}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            {MARKETING_CHANNEL_OPTIONS.map((channel) => {
                              const IconComponent = CHANNEL_ICONS[channel];
                              const color = CHANNEL_COLORS[channel] || 'text-muted-foreground/60';
                              return (
                                <SelectItem key={channel} value={channel} className="text-sm">
                                  <span className="flex items-center gap-2">
                                    {IconComponent && <IconComponent className={`h-4 w-4 shrink-0 ${color}`} />}
                                    {CHANNEL_LABEL[channel] || channel}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => {
                const SelectedIcon = STATUS_ICONS[field.value] || Activity;
                const iconColor = STATUS_COLORS[field.value] || 'text-muted-foreground/60';
                return (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="text-xs font-medium text-muted-foreground">Trạng thái ban đầu</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <SelectedIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-200 ${iconColor}`} />
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full pl-9 bg-background focus:ring-1 focus:ring-primary/30 border-border rounded-lg h-9 text-sm transition-all">
                            <span className="truncate block text-left">
                              {STATUS_LABEL[field.value] || field.value}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            {MARKETING_STATUS_OPTIONS.map((status) => {
                              const IconComponent = STATUS_ICONS[status];
                              const colorClass = STATUS_COLORS[status];
                              return (
                                <SelectItem key={status} value={status} className="text-sm">
                                  <span className="flex items-center gap-2">
                                    {IconComponent && <IconComponent className={`h-4 w-4 shrink-0 ${colorClass}`} />}
                                    {STATUS_LABEL[status] || status}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>

        {/* Section 2: Budget & Duration */}
        <div className="p-4 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 shadow-sm transition-all">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pb-2 border-b border-border/40">
            <Coins className="h-4.5 w-4.5 text-primary" />
            Ngân sách & Thời gian
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ngân sách (đ)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        placeholder="Nhập ngân sách"
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
              name="spent"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Đã chi tiêu (đ)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10" />
                      <NumericInput
                        value={field.value}
                        onValueChange={(val) => field.onChange(val ?? 0)}
                        allowDecimal={false}
                        placeholder="Nhập số tiền đã chi tiêu"
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
              name="startDate"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ngày bắt đầu</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={parseStringToDate(field.value)}
                      onChange={(date) => field.onChange(formatDateToString(date))}
                      placeholder="Chọn ngày bắt đầu"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Ngày kết thúc</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={parseStringToDate(field.value)}
                      onChange={(date) => field.onChange(formatDateToString(date))}
                      placeholder="Chọn ngày kết thúc"
                      className="w-full"
                    />
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
            Tạo chiến dịch
          </Button>
        </div>
      </form>
    </Form>
  );
}

