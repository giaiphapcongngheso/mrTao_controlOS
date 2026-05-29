import { Button } from '@shared/ui';
import { Form } from '@shared/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../auth';
import { useProfile } from '../../../../../../frontend/shared/components/account-setting/_hooks/use-profile';
import { profileSchema, type ProfileFormValues } from './profile-info.constants';
import {
  buildUpdateProfilePayload,
  mapProfileToFormValues,
  type ProfileEmployeeInfo,
} from './profile-info.helpers';
import { ProfileFormFields } from './profile-info.form-fields';

export function ProfileInfoContent() {
  const { t } = useTranslation(['accountSetting', 'action', 'message']);
  const { user } = useAuthStore();
  const { employeeQuery, updateProfileMutation } = useProfile();

  const fullEmployeeInfo = employeeQuery.data?.data;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      avatarUrl: '',
      code: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: undefined,
      gender: undefined,
      nationalIdNumber: '',
      passportNumber: '',
      ethnicityId: undefined,
      countryId: undefined,
      religionId: undefined,
      educationLevel: undefined,
      majorId: undefined,
      enrollNo: '',
      maritalStatus: undefined,
      emergencyContactPhone: '',
      emergencyContactName: '',
      permanentAddress: '',
      currentAddress: '',
      organization: { id: '' },
      job: { id: '' },
      position: { id: '' },
    },
  });

  const { control, handleSubmit, reset } = form;

  // Load employee data vào form
  useEffect(() => {
    if (fullEmployeeInfo) {
      const formValues = mapProfileToFormValues(fullEmployeeInfo);
      reset(formValues);
    }
  }, [fullEmployeeInfo, reset]);

  const handleSave = async (values: ProfileFormValues) => {
    if (!fullEmployeeInfo) {
      console.error('Employee data not found');
      return;
    }

    // Full update - merge existing employee với form values
    const payload = buildUpdateProfilePayload(values, fullEmployeeInfo as ProfileEmployeeInfo);

    try {
      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (!user?.employeeId || employeeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">
          {employeeQuery.isLoading
            ? t('action:loading')
            : t('accountSetting:profileInfo.noEmployee')}
        </div>
      </div>
    );
  }

  if (!fullEmployeeInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('accountSetting:profileInfo.noEmployee')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4" autoComplete="off">
          {/* Header */}
          <div>
            <h2 className="text-[18px] font-semibold mb-2">
              {t('accountSetting:profileInfo.title')}
            </h2>
          </div>

          <ProfileFormFields control={control} />

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfileMutation.isPending || !user?.employeeId}>
              {updateProfileMutation.isPending ? t('action:loading') : t('action:save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
