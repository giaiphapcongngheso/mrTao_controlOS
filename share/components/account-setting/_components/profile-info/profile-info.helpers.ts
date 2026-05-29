import type { ProfileFormValues } from './profile-info.constants';

/** Employee từ auth store hoặc từ API (dùng cho buildUpdateProfilePayload) */
export type ProfileEmployeeInfo = any;

/**
 * Xây dựng payload để update profile (using Employee API).
 * Chấp nhận employee từ auth store (IBaseEmployee) hoặc từ API (IEmployee).
 */
export const buildUpdateProfilePayload = (
  values: ProfileFormValues,
  employeeInfo: ProfileEmployeeInfo,
  newAvatarUrl?: string,
): any => {
  const emp = employeeInfo as any;
  const orgId = emp.organizationId ?? emp.organization?.id;
  const posId = emp.positionId ?? emp.position?.id;
  const brdId = emp.boardId ?? emp.board?.id;

  // Xử lý avatar
  let avatarUrl: string | undefined = emp.avatarUrl;
  if (newAvatarUrl) {
    avatarUrl = newAvatarUrl;
  } else if (!values.avatarUrl && emp.avatarUrl) {
    avatarUrl = '';
  }

  return {
    code: emp.code ?? undefined,
    ...(orgId && { organizationId: orgId }),
    ...(brdId && { boardId: brdId }),
    ...(posId && { positionId: posId }),
    status: emp.status,
    startedDate: emp.startedDate ?? undefined,
    resignedDate: emp.resignedDate ?? undefined,
    nickname: emp.nickname ?? undefined,
    employeeJobs: emp.employeeJobs ?? [],
    workers: emp.workers ?? [],
    offices: emp.offices ?? [],

    firstName: values.firstName,
    lastName: values.lastName,
    name: `${values.firstName} ${values.lastName}`.trim(),
    email: values.email || undefined,
    phoneNumber: values.phoneNumber || undefined,
    dateOfBirth: values.dateOfBirth || undefined,
    gender: values.gender || undefined,
    nationalIdNumber: values.nationalIdNumber || undefined,
    passportNumber: values.passportNumber || undefined,
    ethnicityId: values.ethnicityId || undefined,
    countryId: values.countryId || undefined,
    religionId: values.religionId || undefined,
    educationLevel: values.educationLevel || undefined,
    majorId: values.majorId || undefined,
    enrollNo: values.enrollNo || undefined,
    maritalStatus: values.maritalStatus || undefined,
    emergencyContactPhone: values.emergencyContactPhone || undefined,
    emergencyContactName: values.emergencyContactName || undefined,
    permanentAddress: values.permanentAddress || undefined,
    currentAddress: values.currentAddress || undefined,
    avatarUrl,
  };
};

/**
 * Map profile data từ API sang form values
 */
export const mapProfileToFormValues = (profile: any): ProfileFormValues => {
  return {
    avatarUrl: profile.avatarUrl || '',
    code: profile.code || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phoneNumber: profile.phoneNumber || '',
    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
    gender: profile.gender || undefined,
    nationalIdNumber: profile.nationalIdNumber || '',
    passportNumber: profile.passportNumber || '',
    ethnicityId: profile.ethnicityId || undefined,
    countryId: profile.countryId || undefined,
    religionId: profile.religionId || undefined,
    educationLevel: profile.educationLevel || undefined,
    majorId: profile.majorId || undefined,
    enrollNo: profile.enrollNo || '',
    maritalStatus: profile.maritalStatus || undefined,
    emergencyContactPhone: profile.emergencyContactPhone || '',
    emergencyContactName: profile.emergencyContactName || '',
    permanentAddress: profile.permanentAddress || '',
    currentAddress: profile.currentAddress || '',
    // organization, job, position chỉ để hiển thị
    organization: profile.organization
      ? { id: profile.organization.name || profile.organization.id || '' }
      : { id: '' },
    job: profile.job ? { id: profile.job.name || profile.job.id || '' } : { id: '' },
    position: profile.position
      ? { id: profile.position.name || profile.position.id || '' }
      : { id: '' },
  };
};
