import { z } from 'zod';

type ZodDefWithSchema = {
  typeName?: string;
  schema?: z.ZodTypeAny;
};

export function unwrapObjectSchema(
  schema: z.ZodTypeAny,
): z.ZodObject<{ [key: string]: z.ZodTypeAny }> {
  const def = schema._def as ZodDefWithSchema;

  if (def?.typeName === 'ZodEffects' && def.schema) {
    return unwrapObjectSchema(def.schema);
  }

  return schema as z.ZodObject<{ [key: string]: z.ZodTypeAny }>;
}
