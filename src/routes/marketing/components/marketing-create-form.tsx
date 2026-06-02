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
} from '@shared/ui';
import {
  MARKETING_CHANNEL_OPTIONS,
  MARKETING_STATUS_OPTIONS,
} from '../services/marketing.service';
import type { MarketingCampaignCreateInput } from '../types/marketing.types';

const marketingCreateSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên chiến dịch'),
  channel: z.enum(MARKETING_CHANNEL_OPTIONS),
  budget: z.number().min(100000, 'Ngân sách tối thiểu 100.000đ'),
  status: z.enum(MARKETING_STATUS_OPTIONS),
  startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
});

type MarketingCreateFormValues = z.infer<typeof marketingCreateSchema>;

const DEFAULT_VALUES: MarketingCreateFormValues = {
  name: '',
  channel: MARKETING_CHANNEL_OPTIONS[0],
  budget: 5000000,
  status: 'scheduled',
  startDate: '',
  endDate: '',
};

interface MarketingCreateFormProps {
  onCreate: (values: MarketingCampaignCreateInput) => void;
  onCancel: () => void;
}

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Tên chiến dịch</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập tên chiến dịch" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kênh quảng cáo</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn kênh" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETING_CHANNEL_OPTIONS.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trạng thái</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETING_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngân sách (đ)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={100000}
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày bắt đầu</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày kết thúc</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit">Tạo chiến dịch</Button>
        </div>
      </form>
    </Form>
  );
}
