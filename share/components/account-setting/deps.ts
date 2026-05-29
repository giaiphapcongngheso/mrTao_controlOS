import { toast } from 'sonner';
// @ts-ignore
import { getApi } from '@/lib/api-client';
import { createEmployeeService } from '../../services/employee-service';
export { useTwoFA } from '../../hooks/use-2fa';
export { permissionService } from '../../services/permission-service';
export { useFile } from '../../hooks/use-file';
export { useMasterDataDropdown } from '../../hooks/use-master-data-dropdown';
export { getApi };
export { EUploadType } from '../../enums/upload-type.enum';
export { WorkflowLoading } from '../common/workflow-loading';

export const toastWarning = (t: string, d?: string) => toast.warning(t, { description: d });
export const toastSuccess = (t: string, d?: string) => toast.success(t, { description: d });

export const employeeService = {
  ...createEmployeeService<any, any>({
    api: getApi,
    controller: '/hr/employees',
  }),
};
