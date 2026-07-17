export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
}

export interface ApiPagingResponse<T> {
  data: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface IBaseAPIParams {
  filters?: string;
  ignoreStatusFilter?: boolean;
  [key: string]: unknown;
}

export interface IPagedAPIParams extends IBaseAPIParams {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IFlatItem {
  id: string;
  name: string;
  code?: string;
}

export interface IAuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  employeeId?: string;
  avatarUrl?: string;
  avatarData?: string;
  avatarContentType?: string;
  isFirstLogin?: boolean;
  userType?: number;
  hasFullSystemAccess?: boolean;
  [key: string]: unknown;
}

export interface IAuthEmployee {
  id: string;
  code: string;
  fullName: string;
  organization?: IFlatItem;
  position?: IFlatItem;
  board?: IFlatItem;
  [key: string]: unknown;
}

export interface IAuthSidebarResourceParent {
  id: string;
  code?: string;
  name?: string;
  type?: number;
  parentId?: string;
  icon?: string;
  description?: string;
  level?: number;
  displayOrder?: number;
  [key: string]: unknown;
}

export interface IAuthSidebarResource {
  id: string;
  code: string;
  name: string;
  type: number;
  parentId?: string;
  icon?: string;
  description?: string;
  level?: number;
  url?: string;
  displayOrder?: number;
  parent?: IAuthSidebarResourceParent;
  [key: string]: unknown;
}

export interface IAuthStoreDeps {
  userManager: {
    events: {
      addAccessTokenExpiring: (callback: () => void) => void;
      addAccessTokenExpired: (callback: () => void) => void;
      addUserLoaded: (callback: (user: unknown) => void) => void;
      addUserUnloaded: (callback: () => void) => void;
      addSilentRenewError: (callback: (error: unknown) => void) => void;
    };
    getUser: () => Promise<unknown>;
    removeUser: () => Promise<unknown>;
  };
  clearTokenCache: () => void;
  [key: string]: unknown;
}

export interface IPermission {
  module?: string;
  moduleKey?: string;
  displayName?: string;
  displayNameKey: string;
  permission?: string;
  assigned?: boolean;
  [key: string]: unknown;
}

export interface IGenerationCodeInfo {
  pattern?: string;
  prefix?: string;
  suffix?: string;
}

export enum ActionCodeEn {
  TRANSFER = 'TRANSFER',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN = 'RETURN',
  CANCEL = 'CANCEL',
  ASSIGN = 'ASSIGN',
  COMPLETE = 'COMPLETE',
  CONFIRM = 'CONFIRM',
  SUBMIT = 'SUBMIT',
  CLOSE = 'CLOSE',
  EDIT = 'EDIT',
  PROCESSED = 'PROCESSED',
}

