import { createContext, useContext } from 'react';

export interface IAccountSettingServices {
  employeeService: {
    update: (id: string, payload: any) => Promise<any>;
  };
  permissionService: {
    getMyPermissions: () => Promise<any>;
  };
  useTwoFA: () => {
    isTwoFAEnabled: boolean;
    toggleTwoFA: (enabled: boolean) => Promise<void>;
    isLoading: boolean;
    isToggling: boolean;
  };
  useFile: () => {
    uploadSingleFile: (file: File, type: any) => Promise<string | undefined>;
    isUploading: boolean;
  };
  EUploadType: any;
  toast: {
    success: (msg: string) => void;
    warning: (title: string, desc?: string) => void;
    error: (msg: string) => void;
  };
}

const AccountSettingContext = createContext<IAccountSettingServices | null>(null);

export const AccountSettingProvider = AccountSettingContext.Provider;

export const useAccountSettingServices = () => {
  const context = useContext(AccountSettingContext);
  if (!context) {
    throw new Error('useAccountSettingServices must be used within AccountSettingProvider');
  }
  return context;
};
