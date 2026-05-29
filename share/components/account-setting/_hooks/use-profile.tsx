import { toastSuccess, getApi } from '../deps';
import { employeeService } from '../deps';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../auth';

export function useProfile() {
  const { t } = useTranslation('message');
  const { user, employeeInfo, updateUser, setEmployeeInfo } = useAuthStore();

  // Get full employee details from API
  const employeeQuery = useQuery({
    queryKey: ['employee', user?.employeeId],
    queryFn: async () => {
      if (!user?.employeeId) throw new Error('No employee ID');
      return employeeService.getById({ id: user.employeeId });
    },
    enabled: !!user?.employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // Update profile (using employee API)
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!employeeInfo?.id) {
        throw new Error('Employee ID not found');
      }
      // Dùng endpoint chuyên biệt để update personal info, tránh mất dữ liệu reference
      const res = await getApi().put(`/hr/employees/${employeeInfo.id}/personal-info`, data);
      return res.data;
    },
    onSuccess: (response) => {
      toastSuccess(t('message:success'));

      // Update auth store from response so header and profile stay in sync
      if (response?.data) {
        const d = response.data;
        updateUser({
          avatarUrl: d.avatarUrl,
          fullName: d.name,
          email: d.email,
        });
        setEmployeeInfo({
          id: d.id,
          code: d.code,
          fullName: d.name,
          organization: d.organization,
          position: d.position,
          board: d.board,
        });
      }
    },
  });

  return {
    employeeQuery,
    employeeInfo,
    updateProfileMutation,
  };
}
