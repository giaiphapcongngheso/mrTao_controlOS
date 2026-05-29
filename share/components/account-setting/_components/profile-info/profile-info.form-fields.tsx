import { Mail, MapPin, User2 } from 'lucide-react';
import { useMemo } from 'react';
import { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Combobox, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../../ui';
import { Input } from '../../../../ui/input';
import { Textarea } from '../../../../ui/textarea';
import { getApi, useMasterDataDropdown } from '../../deps';
import type { ProfileFormValues } from './profile-info.constants';

// Component Custom
import { CustomSelect } from '../../../custom/custom-select';
import { DatePicker } from '../../../custom/date-picker';

interface ProfileFormFieldsProps {
  control: Control<ProfileFormValues>;
}

export function ProfileFormFields({ control }: ProfileFormFieldsProps) {
  const { t } = useTranslation(['accountSetting']);

  // Fetch dropdown data
  const {
    data: religionData,
    isFetching: isFetchingReligion,
    refetch: refetchReligion,
  } = useMasterDataDropdown({
    api: getApi,
    controller: '/master-data/religions',
  });
  const religionOptions = useMemo(
    () => religionData?.data?.map((r: any) => ({ label: r.name, value: r.id })) ?? [],
    [religionData],
  );

  const {
    data: ethnicityData,
    isFetching: isFetchingEthnicity,
    refetch: refetchEthnicity,
  } = useMasterDataDropdown({
    api: getApi,
    controller: '/master-data/ethnicities',
  });
  const ethnicityOptions = useMemo(
    () => ethnicityData?.data?.map((e: any) => ({ label: e.name, value: e.id })) ?? [],
    [ethnicityData],
  );

  const {
    data: majorData,
    isFetching: isFetchingMajor,
    refetch: refetchMajor,
  } = useMasterDataDropdown({
    api: getApi,
    controller: '/master-data/majors',
  });
  const majorOptions = useMemo(
    () => majorData?.data?.map((m: any) => ({ label: m.name, value: m.id })) ?? [],
    [majorData],
  );

  const {
    data: countryData,
    isFetching: isFetchingCountry,
    refetch: refetchCountry,
  } = useMasterDataDropdown({
    api: getApi,
    controller: '/master-data/countries',
  });
  const countryOptions = useMemo(
    () => countryData?.data?.map((c: any) => ({ label: c.name, value: c.id })) ?? [],
    [countryData],
  );

  const genderOptions = [
    { label: t('accountSetting:profileInfo.genderOptions.male', 'Nam'), value: 1 },
    { label: t('accountSetting:profileInfo.genderOptions.female', 'Nữ'), value: 2 },
    { label: t('accountSetting:profileInfo.genderOptions.other', 'Khác'), value: 3 },
  ];

  const maritalOptions = [
    { label: t('accountSetting:profileInfo.maritalOptions.single', 'Độc thân'), value: 1 },
    { label: t('accountSetting:profileInfo.maritalOptions.married', 'Đã kết hôn'), value: 2 },
    { label: t('accountSetting:profileInfo.maritalOptions.divorced', 'Đã ly hôn'), value: 3 },
  ];

  const educationOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `Lớp ${i + 1}`,
    value: i + 1,
  }));

  return (
    <div className="space-y-5">
      {/* 1. Thông tin cơ bản */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <User2 className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            {t('accountSetting:profileInfo.sections.basicInfo', 'Thông tin cơ bản')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mã nhân viên */}
          <FormField
            control={control}
            name="code"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.code', 'Mã nhân viên')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Họ */}
          <FormField
            control={control}
            name="lastName"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.lastName')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tên */}
          <FormField
            control={control}
            name="firstName"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.firstName')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ngày sinh */}
          <FormField
            control={control}
            name="dateOfBirth"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.dateOfBirth', 'Ngày sinh')}</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value as Date | undefined}
                    onChange={field.onChange}
                    placeholder="dd/mm/yyyy"
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Giới tính */}
          <FormField
            control={control}
            name="gender"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.gender')}</FormLabel>
                <FormControl>
                  <CustomSelect
                    options={genderOptions}
                    value={field.value}
                    onChangeValue={(v: any) => field.onChange(Number(v))}
                    placeholder={t(
                      'accountSetting:profileInfo.placeholder.gender',
                      'Chọn giới tính',
                    )}
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CMND/CCCD */}
          <FormField
            control={control}
            name="nationalIdNumber"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.nationalIdNumber', 'CMND/CCCD')}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Passport */}
          <FormField
            control={control}
            name="passportNumber"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.passportNumber', 'Passport')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quốc tịch */}
          <FormField
            control={control}
            name="countryId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.countryId', 'Quốc tịch')}</FormLabel>
                <FormControl>
                  <Combobox
                    options={countryOptions}
                    value={field.value ?? undefined}
                    onValueChange={(v: any) => field.onChange(v)}
                    loading={isFetchingCountry}
                    onRetry={() => refetchCountry()}
                    placeholder=""
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tôn giáo */}
          <FormField
            control={control}
            name="religionId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.religionId', 'Tôn giáo')}</FormLabel>
                <FormControl>
                  <Combobox
                    options={religionOptions}
                    value={field.value ?? undefined}
                    onValueChange={(v: any) => field.onChange(v)}
                    loading={isFetchingReligion}
                    onRetry={() => refetchReligion()}
                    placeholder=""
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dân tộc */}
          <FormField
            control={control}
            name="ethnicityId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.ethnicityId', 'Dân tộc')}</FormLabel>
                <FormControl>
                  <Combobox
                    options={ethnicityOptions}
                    value={field.value ?? undefined}
                    onValueChange={(v: any) => field.onChange(v)}
                    loading={isFetchingEthnicity}
                    onRetry={() => refetchEthnicity()}
                    placeholder=""
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tình trạng hôn nhân */}
          <FormField
            control={control}
            name="maritalStatus"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.maritalStatus', 'Tình trạng hôn nhân')}
                </FormLabel>
                <FormControl>
                  <CustomSelect
                    options={maritalOptions}
                    value={field.value}
                    onChangeValue={(v: any) => field.onChange(Number(v))}
                    placeholder=""
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Trình độ văn hóa */}
          <FormField
            control={control}
            name="educationLevel"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.educationLevel', 'Trình độ văn hóa')}
                </FormLabel>
                <FormControl>
                  <CustomSelect
                    options={educationOptions}
                    value={field.value}
                    onChangeValue={(v: any) => field.onChange(Number(v))}
                    placeholder=""
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Chuyên ngành */}
          <FormField
            control={control}
            name="majorId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.majorId', 'Chuyên ngành')}</FormLabel>
                <FormControl>
                  <Combobox
                    options={majorOptions}
                    value={field.value ?? undefined}
                    onValueChange={(v: any) => field.onChange(v)}
                    loading={isFetchingMajor}
                    onRetry={() => refetchMajor()}
                    placeholder=""
                    clearable={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mã chấm công */}
          <FormField
            control={control}
            name="enrollNo"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.enrollNo', 'Mã chấm công')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 2. Thông tin liên hệ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            {t('accountSetting:profileInfo.sections.contactInfo', 'Thông tin liên hệ')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Email */}
          <FormField
            control={control}
            name="email"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('accountSetting:profileInfo.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    icon={<Mail className="h-4 w-4" />}
                    position="left"
                    className="!pl-10"
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Số điện thoại */}
          <FormField
            control={control}
            name="phoneNumber"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.phoneNumber', 'Điện thoại di động')}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Điện thoại khẩn cấp */}
          <FormField
            control={control}
            name="emergencyContactPhone"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.emergencyContactPhone', 'Số điện thoại khẩn cấp')}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tên liên hệ khẩn cấp */}
          <FormField
            control={control}
            name="emergencyContactName"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.emergencyContactName', 'Người liên hệ khẩn cấp')}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* 3. Địa chỉ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            {t('accountSetting:profileInfo.sections.address', 'Địa chỉ')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="permanentAddress"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.permanentAddress', 'Địa chỉ thường trú')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Số nhà, đường, phường, quận, thành phố"
                    {...field}
                    rows={1}
                    className="h-14 bg-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="currentAddress"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>
                  {t('accountSetting:profileInfo.currentAddress', 'Địa chỉ tạm trú')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Số nhà, đường, phường, quận, thành phố"
                    {...field}
                    rows={1}
                    className="h-14 bg-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
