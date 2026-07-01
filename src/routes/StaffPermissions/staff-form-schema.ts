import { z } from 'zod';

export const staffFormSchema = (isEditMode: boolean) =>
  z.object({
    id: z.string().optional(),
    fullName: z
      .string()
      .trim()
      .min(1, 'Họ và tên nhân sự không được để trống.'),
    username: z
      .string()
      .trim()
      .min(1, 'Tên đăng nhập không được để trống.')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới, gạch ngang và dấu chấm.'),
    role: z
      .string()
      .min(1, 'Vui lòng chọn vai trò.'),
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal('')),
    status: z.enum(['active', 'inactive']),
    email: z
      .string()
      .trim()
      .email('Email không đúng định dạng.')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .optional()
      .or(z.literal(''))
      .superRefine((val, ctx) => {
        if (!isEditMode) {
          // Bắt buộc khi tạo mới
          if (!val || val.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Mật khẩu không được để trống.',
            });
            return;
          }
        }

        // Nếu có nhập mật khẩu (hoặc bắt buộc khi tạo mới)
        if (val && val.length > 0) {
          if (val.length < 6) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Mật khẩu phải có ít nhất 6 ký tự.',
            });
          }
          if (!/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.',
            });
          }
        }
      }),
    internalNotes: z.string().optional().or(z.literal('')),
  });

export type StaffFormValues = z.infer<ReturnType<typeof staffFormSchema>>;
