import { t as i18nT } from 'i18next';
import { z } from 'zod';

export const profileSchema = z.object({
  avatarUrl: z.string().optional(),
  code: z.string().optional(),
  firstName: z.string().min(1, i18nT('accountSetting:profileInfo.required.firstName')).trim(),
  lastName: z.string().min(1, i18nT('accountSetting:profileInfo.required.lastName')).trim(),
  email: z
    .string()
    .email({ message: i18nT('accountSetting:profileInfo.validation.email') })
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.number().optional(),
  nationalIdNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  ethnicityId: z.string().optional().nullable(),
  countryId: z.string().optional().nullable(),
  religionId: z.string().optional().nullable(),
  educationLevel: z.number().optional().nullable(),
  majorId: z.string().optional().nullable(),
  enrollNo: z.string().optional(),
  maritalStatus: z.number().optional().nullable(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  permanentAddress: z.string().optional(),
  currentAddress: z.string().optional(),
  organization: z.object({ id: z.string().optional() }).optional(),
  job: z.object({ id: z.string().optional() }).optional(),
  position: z.object({ id: z.string().optional() }).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Constants
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/svg+xml',
];
