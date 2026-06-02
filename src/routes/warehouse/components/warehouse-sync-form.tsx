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
} from '@shared/ui';
import type { WarehouseCredentials } from '../types/warehouse.types';

const warehouseCredentialsSchema = z.object({
  clientId: z.string().trim(),
  clientSecret: z.string().trim(),
  retailer: z.string().trim(),
});

type WarehouseSyncFormValues = z.infer<typeof warehouseCredentialsSchema>;

interface WarehouseSyncFormProps {
  defaultValues: WarehouseCredentials;
  isLoading: boolean;
  onSubmit: (values: WarehouseCredentials) => void;
}

export default function WarehouseSyncForm({
  defaultValues,
  isLoading,
  onSubmit,
}: WarehouseSyncFormProps) {
  const form = useForm<WarehouseSyncFormValues>({
    resolver: zodResolver(warehouseCredentialsSchema),
    defaultValues,
    values: defaultValues,
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập client id" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Secret</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập client secret" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retailer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retailer</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nhập retailer" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ kho'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
