import { z } from 'zod';
import type { HandbookFormState } from './handbook-view.types';

export const handbookFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề.').max(200, 'Tiêu đề tối đa 200 ký tự.'),
  category: z.string().trim().min(1, 'Vui lòng chọn hoặc nhập danh mục.').max(120, 'Danh mục tối đa 120 ký tự.'),
  summary: z.string().trim().min(1, 'Vui lòng nhập tóm tắt.').max(500, 'Tóm tắt tối đa 500 ký tự.'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung tài liệu.'),
  imageUrls: z.array(z.string().trim().url('Liên kết ảnh không hợp lệ.')).default([]),
  roles: z.array(z.string().trim()).default([]),
  requiredRead: z.boolean(),
  isUpdated: z.boolean(),
  driveLink: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Link Drive không hợp lệ.'),
  categoryKey: z.string().trim().max(80, 'Nhóm lọc tối đa 80 ký tự.'),
});

export type HandbookFormFieldErrors = Partial<Record<keyof HandbookFormState, string>>;
