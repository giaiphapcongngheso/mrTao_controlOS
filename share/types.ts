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

export interface IGenerationCodeInfo {
  pattern?: string;
  prefix?: string;
  suffix?: string;
}
