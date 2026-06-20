import { z } from 'zod';

// ---------------------------------------------------------------------------
// Permission row shape – matches RolePermissionRow booleans exactly.
// ---------------------------------------------------------------------------

export const permissionRowSchema = z.object({
  module: z.string().min(1),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canApprove: z.boolean(),
  canExport: z.boolean(),
});

export type PermissionRowFormValues = z.infer<typeof permissionRowSchema>;

// ---------------------------------------------------------------------------
// Complete form schema: role info + permissions matrix.
// ---------------------------------------------------------------------------

export const rolePermissionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên vai trò.')
    .max(100, 'Tên vai trò tối đa 100 ký tự.'),
  code: z
    .string()
    .trim()
    .max(60, 'Mã vai trò tối đa 60 ký tự.'),
  status: z.enum(['active', 'inactive']),
  permissions: z.array(permissionRowSchema),
});

export type RolePermissionFormValues = z.infer<typeof rolePermissionFormSchema>;
