import { z } from 'zod';
import { FormLabel } from '@shared/ui';
import { useFormSchema } from './form-schema-provider';
import { unwrapObjectSchema } from './utils/unwrap-schema';
import { cn } from '@shared/lib/utils';

type Props = {
  name: string;
  children: React.ReactNode;
  className?: string;
};

export function AutoLabel({ name, children, className }: Props) {
  const schema = useFormSchema<z.ZodTypeAny>();
  const objectSchema = unwrapObjectSchema(schema);
  const fieldSchema = objectSchema.shape[name];
  const isRequired = fieldSchema && !fieldSchema.isOptional();

  return (
    <FormLabel className={cn(className)}>
      {children}
      {isRequired && <span className="text-red-500">*</span>}
    </FormLabel>
  );
}
