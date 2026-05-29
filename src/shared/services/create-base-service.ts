export interface HttpClient {
  get: <T>(url: string, config?: RequestInit) => Promise<T>;
  post: <T>(url: string, body?: unknown, config?: RequestInit) => Promise<T>;
  put: <T>(url: string, body?: unknown, config?: RequestInit) => Promise<T>;
  delete: <T>(url: string, config?: RequestInit) => Promise<T>;
}

export interface BaseServiceConfig {
  client: HttpClient;
  resource: string;
}

export interface BaseService<TEntity, TRequest = Partial<TEntity>> {
  getAll: () => Promise<TEntity[]>;
  getById: (id: string) => Promise<TEntity>;
  create: (payload: TRequest) => Promise<TEntity>;
  update: (id: string, payload: TRequest) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
}

export function createBaseService<TEntity, TRequest = Partial<TEntity>>({
  client,
  resource,
}: BaseServiceConfig): BaseService<TEntity, TRequest> {
  return {
    getAll: () => client.get<TEntity[]>(resource),
    getById: (id) => client.get<TEntity>(`${resource}/${id}`),
    create: (payload) => client.post<TEntity>(resource, payload),
    update: (id, payload) => client.put<TEntity>(`${resource}/${id}`, payload),
    delete: async (id) => {
      await client.delete<void>(`${resource}/${id}`);
    },
  };
}
