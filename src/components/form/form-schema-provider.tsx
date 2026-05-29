import { createContext, ReactNode, useContext } from 'react';
import { z } from 'zod';

const FormSchemaContext = createContext<z.ZodTypeAny | null>(null);

export function FormSchemaProvider<T extends z.ZodTypeAny>({
  schema,
  children,
}: {
  schema: T;
  children: ReactNode;
}) {
  return <FormSchemaContext.Provider value={schema}>{children}</FormSchemaContext.Provider>;
}

export const useFormSchema = <T extends z.ZodTypeAny>() => {
  const schema = useContext(FormSchemaContext);
  if (!schema) throw new Error('Missing FormSchemaProvider');
  return schema as T;
};
